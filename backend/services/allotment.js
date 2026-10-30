import { Op, fn, col } from 'sequelize';
import {
  sequelize,
  User,
  College,
  Allotment,
  DepartmentSeat,
  OptionEntry,
  CounsellingRound
} from '../models/index.js';
import { HELD_STATUSES } from '../models/Allotment.js';
import { GENERAL, seatsByCategory } from './categories.js';

export class CounsellingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const REAL_ROUNDS = ['round1', 'round2', 'extended'];
export const ROUND_LABELS = {
  mock: 'Mock allotment',
  round1: 'Round 1',
  round2: 'Round 2',
  extended: 'Extended round'
};
const ROUND_NUMBER = { mock: 0, round1: 1, round2: 2, extended: 3 };

// Statuses that take a faculty member out of every later round.
const EXITED_STATUSES = ['accepted', 'quit', 'lapsed'];
// Statuses a faculty member can still switch between while the choices window is open.
const CHOOSABLE_STATUSES = ['allotted', 'accepted', 'upgrade', 'rejected', 'quit'];

export const CHOICES = {
  accept: { status: 'accepted', label: 'Choice 1: Accept and join' },
  upgrade: { status: 'upgrade', label: 'Choice 2: Accept, but try for a better option next round' },
  reject: { status: 'rejected', label: 'Choice 3: Reject, but stay in the next round' },
  quit: { status: 'quit', label: 'Choice 4: Quit counselling' }
};

const normalizeDepartment = (value) => String(value || '').trim().toLowerCase();

// Faculty may only opt for departments matching their specialization.
export const isSeatEligible = (faculty, seat) =>
  seat.college?.isActive !== false &&
  normalizeDepartment(seat.department) === normalizeDepartment(faculty.qualifications?.specialization);

export const getActiveRounds = (transaction) =>
  CounsellingRound.findAll({ where: { status: 'completed' }, order: [['id', 'ASC']], transaction });

export const nextRealRoundType = (activeRounds) => {
  const realCount = activeRounds.filter(r => r.type !== 'mock').length;
  return REAL_ROUNDS[realCount] || null;
};

// seatId -> number of seats currently occupied.
export const getSeatOccupancy = async (transaction) => {
  const rows = await Allotment.findAll({
    attributes: ['seatId', [fn('COUNT', col('id')), 'count']],
    where: { status: HELD_STATUSES },
    group: ['seatId'],
    raw: true,
    transaction
  });
  return Object.fromEntries(rows.map(r => [r.seatId, Number(r.count)]));
};

// seatId -> { category -> occupied seats }.
export const getCategoryOccupancy = async (transaction) => {
  const rows = await Allotment.findAll({
    attributes: ['seatId', 'category', [fn('COUNT', col('id')), 'count']],
    where: { status: HELD_STATUSES },
    group: ['seatId', 'category'],
    raw: true,
    transaction
  });
  const result = {};
  for (const r of rows) {
    result[r.seatId] = { ...(result[r.seatId] || {}), [r.category || GENERAL.key]: Number(r.count) };
  }
  return result;
};

// A pool is one category's quota within one college department.
const poolKey = (seatId, category) => `${seatId}:${category}`;
const parsePoolKey = (key) => {
  const [seatId, category] = key.split(':');
  return { seatId: Number(seatId), category };
};

// Faculty-proposing deferred acceptance over seat pools. Every pool ranks
// applicants by merit rank, except that an upgrade holder always outranks
// everyone at the pool they already hold, so Choice 2 can never leave someone
// worse off. The result is the same as walking down the merit list and giving
// each person their highest available option, but stays correct when upgrade
// holders free seats mid-round.
const allocate = ({ participants, prefs, capacity, heldPool }) => {
  const rank = new Map(participants.map(f => [f.id, f.rank]));
  const outranks = (pool) => (a, b) => {
    const aHolds = heldPool.get(a) === pool ? 0 : 1;
    const bHolds = heldPool.get(b) === pool ? 0 : 1;
    return aHolds - bHolds || rank.get(a) - rank.get(b);
  };

  const nextOption = new Map();
  const tentative = new Map();
  const queue = participants.map(f => f.id);

  while (queue.length) {
    const facultyId = queue.shift();
    const list = prefs.get(facultyId) || [];
    const i = nextOption.get(facultyId) || 0;
    if (i >= list.length) continue;
    nextOption.set(facultyId, i + 1);

    const pool = list[i];
    const holders = [...(tentative.get(pool) || []), facultyId].sort(outranks(pool));
    if (holders.length > (capacity.get(pool) || 0)) {
      queue.push(holders.pop());
    }
    tentative.set(pool, holders);
  }

  const assignment = new Map();
  for (const [pool, holders] of tentative) {
    holders.forEach(facultyId => assignment.set(facultyId, pool));
  }
  return assignment;
};

export const runRound = async (type, { reportingDeadline } = {}) => sequelize.transaction(async (transaction) => {
  if (!ROUND_LABELS[type]) throw new CounsellingError(`Unknown round type: ${type}`);

  const activeRounds = await getActiveRounds(transaction);
  const realRounds = activeRounds.filter(r => r.type !== 'mock');

  if (type === 'mock') {
    if (realRounds.length) throw new CounsellingError('A mock allotment can only run before Round 1', 409);
    // A new mock run replaces the previous one.
    for (const previousMock of activeRounds) {
      await Allotment.destroy({ where: { roundId: previousMock.id }, transaction });
      await previousMock.update({ status: 'undone' }, { transaction });
    }
  } else {
    const expected = nextRealRoundType(activeRounds);
    if (type !== expected) {
      throw new CounsellingError(expected ? `The next round to run is ${ROUND_LABELS[expected]}` : 'All counselling rounds have already been run', 409);
    }
  }

  const changes = [];
  const previousRound = realRounds.at(-1);

  // Anyone who did not exercise a choice for the previous round loses the seat
  // and leaves counselling.
  let lapsed = 0;
  if (type !== 'mock' && previousRound) {
    const unanswered = await Allotment.findAll({ where: { roundId: previousRound.id, status: 'allotted' }, transaction });
    for (const allotment of unanswered) {
      changes.push({ allotmentId: allotment.id, from: 'allotted', to: 'lapsed' });
      await allotment.update({ status: 'lapsed' }, { transaction });
    }
    lapsed = unanswered.length;
  }

  const ranked = await User.findAll({
    where: { role: 'faculty', verificationStatus: 'verified', rank: { [Op.ne]: null } },
    order: [['rank', 'ASC']],
    transaction
  });
  if (!ranked.length) throw new CounsellingError('No ranked faculty. Generate the merit list first.', 409);

  const standing = await Allotment.findAll({
    where: { status: [...EXITED_STATUSES, 'upgrade'] },
    transaction
  });
  // In the extended round every unfilled reserved seat is open to all, so all
  // of a department's quotas collapse into a single General pool.
  const mergeQuotas = type === 'extended';
  const poolOf = (seatId, category) => poolKey(seatId, mergeQuotas ? GENERAL.key : (category || GENERAL.key));

  const exited = new Set();
  const holding = new Map();
  const acceptedPerPool = {};
  for (const allotment of standing) {
    if (EXITED_STATUSES.includes(allotment.status)) exited.add(allotment.facultyId);
    if (allotment.status === 'upgrade') holding.set(allotment.facultyId, allotment);
    if (allotment.status === 'accepted') {
      const pool = poolOf(allotment.seatId, allotment.category);
      acceptedPerPool[pool] = (acceptedPerPool[pool] || 0) + 1;
    }
  }

  const participants = ranked.filter(f => !exited.has(f.id));
  const seats = await DepartmentSeat.findAll({ include: [{ model: College, as: 'college' }], transaction });
  const seatById = new Map(seats.map(s => [s.id, s]));
  const capacity = new Map();
  for (const seat of seats) {
    const quotas = mergeQuotas ? { [GENERAL.key]: seat.totalSeats } : seatsByCategory(seat);
    for (const [category, count] of Object.entries(quotas)) {
      const pool = poolKey(seat.id, category);
      capacity.set(pool, Math.max(0, count - (acceptedPerPool[pool] || 0)));
    }
  }

  // General quota first (open merit), then the faculty member's own category.
  const poolsFor = (faculty, seatId) => {
    const pools = [poolKey(seatId, GENERAL.key)];
    const own = faculty.category || GENERAL.key;
    if (!mergeQuotas && own !== GENERAL.key && seatsByCategory(seatById.get(seatId))[own] > 0) {
      pools.push(poolKey(seatId, own));
    }
    return pools;
  };

  const options = await OptionEntry.findAll({
    where: { facultyId: participants.map(f => f.id) },
    order: [['priority', 'ASC']],
    transaction
  });

  const prefs = new Map();
  const fullLists = new Map();
  const heldPool = new Map();
  for (const faculty of participants) {
    const list = options
      .filter(o => o.facultyId === faculty.id && seatById.has(o.seatId) && isSeatEligible(faculty, seatById.get(o.seatId)))
      .map(o => o.seatId);
    fullLists.set(faculty.id, list);
    const pools = list.flatMap(seatId => poolsFor(faculty, seatId));

    const held = holding.get(faculty.id);
    if (held) {
      // Only options above the held seat are worth trying; the held seat is the fallback.
      const pool = poolOf(held.seatId, held.category);
      heldPool.set(faculty.id, pool);
      if (!capacity.has(pool)) capacity.set(pool, 1);
      const idx = pools.indexOf(pool);
      prefs.set(faculty.id, idx >= 0 ? pools.slice(0, idx + 1) : [...pools, pool]);
    } else {
      prefs.set(faculty.id, pools);
    }
  }

  const assignment = allocate({ participants, prefs, capacity, heldPool });

  const round = await CounsellingRound.create({
    type,
    reportingDeadline: type === 'mock' ? null : (reportingDeadline || null)
  }, { transaction });

  let upgraded = 0;
  let retained = 0;
  const rows = [];
  for (const faculty of participants) {
    const pool = assignment.get(faculty.id);
    if (!pool) continue;
    const { seatId, category } = parsePoolKey(pool);
    const seat = seatById.get(seatId);
    const held = holding.get(faculty.id);
    if (held) {
      changes.push({ allotmentId: held.id, from: 'upgrade', to: 'superseded' });
      await held.update({ status: 'superseded' }, { transaction });
      if (heldPool.get(faculty.id) === pool) retained++; else upgraded++;
    }
    const optionIndex = fullLists.get(faculty.id).indexOf(seatId);
    rows.push({
      facultyId: faculty.id,
      collegeId: seat.collegeId,
      seatId,
      department: seat.department,
      category,
      roundId: round.id,
      round: ROUND_NUMBER[type],
      optionNumber: optionIndex >= 0 ? optionIndex + 1 : null,
      retained: Boolean(held) && heldPool.get(faculty.id) === pool,
      status: type === 'mock' ? 'mock' : 'allotted'
    });
  }
  await Allotment.bulkCreate(rows, { transaction });

  const totalCapacity = seats.reduce((sum, s) => sum + s.totalSeats, 0) - Object.values(acceptedPerPool).reduce((sum, n) => sum + n, 0);
  const summary = {
    participants: participants.length,
    allotted: rows.length,
    newlyAllotted: rows.length - upgraded - retained,
    upgraded,
    retained,
    notAllotted: participants.length - rows.length,
    lapsed,
    vacanciesLeft: totalCapacity - rows.length
  };
  await round.update({ summary, changes }, { transaction });
  return round;
});

export const undoRound = async (roundId) => sequelize.transaction(async (transaction) => {
  const activeRounds = await getActiveRounds(transaction);
  const latest = activeRounds.at(-1);
  if (!latest) throw new CounsellingError('There is no round to undo', 409);
  if (latest.id !== Number(roundId)) throw new CounsellingError('Only the most recent round can be undone', 409);

  await Allotment.destroy({ where: { roundId: latest.id }, transaction });
  for (const change of [...(latest.changes || [])].reverse()) {
    await Allotment.update({ status: change.from }, { where: { id: change.allotmentId, status: change.to }, transaction });
  }
  await latest.update({ status: 'undone' }, { transaction });
  return latest;
});

export const resetCounselling = async () => sequelize.transaction(async (transaction) => {
  await Allotment.destroy({ where: {}, transaction });
  await CounsellingRound.update({ status: 'undone' }, { where: { status: 'completed' }, transaction });
});

const allotmentIncludes = [
  { model: College, as: 'college' },
  { model: CounsellingRound, as: 'counsellingRound' }
];

// Everything the faculty allotment page needs in one object.
export const getFacultyAllotmentView = async (facultyId) => {
  const activeRounds = await getActiveRounds();
  const realRounds = activeRounds.filter(r => r.type !== 'mock');
  const latestRound = realRounds.at(-1) || null;
  const mockRound = realRounds.length ? null : activeRounds.find(r => r.type === 'mock');

  const history = await Allotment.findAll({
    where: { facultyId, roundId: realRounds.map(r => r.id) },
    include: allotmentIncludes,
    order: [['id', 'DESC']]
  });
  const mock = mockRound
    ? await Allotment.findOne({ where: { facultyId, roundId: mockRound.id }, include: allotmentIncludes })
    : null;

  const current = history[0] || null;
  const canChoose = Boolean(current && latestRound && current.roundId === latestRound.id && CHOOSABLE_STATUSES.includes(current.status));
  const allowedChoices = !canChoose
    ? []
    : Object.keys(CHOICES).filter(c => latestRound.type !== 'extended' || !['upgrade', 'reject'].includes(c));

  return {
    latestRound,
    mockRound: mockRound || null,
    mock,
    current,
    history,
    canChoose,
    allowedChoices,
    nextRound: nextRealRoundType(activeRounds)
  };
};

export const exerciseChoice = async (facultyId, choice) => {
  if (!CHOICES[choice]) throw new CounsellingError('Invalid choice');
  const view = await getFacultyAllotmentView(facultyId);
  if (!view.current || view.current.roundId !== view.latestRound?.id) {
    throw new CounsellingError('You have no allotment in the current round', 404);
  }
  if (!view.canChoose) throw new CounsellingError('Your choice for this round can no longer be changed', 409);
  if (!view.allowedChoices.includes(choice)) {
    throw new CounsellingError('The extended round is the last round, so you can only accept or quit', 409);
  }
  await view.current.update({ status: CHOICES[choice].status, choiceAt: new Date() });
  return view.current;
};
