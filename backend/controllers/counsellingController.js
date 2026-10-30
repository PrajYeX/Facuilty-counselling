import { Op } from 'sequelize';
import { User, College, Allotment, DepartmentSeat, CounsellingRound } from '../models/index.js';
import { HELD_STATUSES } from '../models/Allotment.js';
import {
  CounsellingError,
  ROUND_LABELS,
  getActiveRounds,
  getSeatOccupancy,
  getCategoryOccupancy,
  nextRealRoundType,
  runRound as runCounsellingRound,
  undoRound as undoCounsellingRound,
  resetCounselling as resetAllCounselling
} from '../services/allotment.js';
import { getSchedule, getPhase, updateSchedule as saveSchedule } from '../services/schedule.js';
import { audit } from '../services/audit.js';
import { notifyMany } from '../services/notify.js';
import { seatsByCategory } from '../services/categories.js';

const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// The email only says results are out; the seat itself is shown on the portal
// once the results phase has started.
const notifyRoundResults = async (round) => {
  const allotments = await Allotment.findAll({ where: { roundId: round.id } });
  const allotted = new Set(allotments.map(a => a.facultyId));
  // Faculty who accepted, quit or lapsed earlier are no longer in counselling.
  const exited = await Allotment.findAll({ where: { status: ['accepted', 'quit', 'lapsed'], roundId: { [Op.ne]: round.id } }, attributes: ['facultyId'] });
  const exitedIds = new Set(exited.map(a => a.facultyId));
  const participants = (await User.findAll({ where: { role: 'faculty', verificationStatus: 'verified', rank: { [Op.ne]: null } } }))
    .filter(f => allotted.has(f.id) || !exitedIds.has(f.id));
  const results = await getPhase('results');
  const when = results.hasStarted ? 'now available' : `available from ${formatDate(results.startAt)}`;
  const label = ROUND_LABELS[round.type];
  await notifyMany(participants, (f) => ({
    type: round.type === 'mock' ? 'mock_result' : 'round_result',
    title: `${label} results`,
    message: round.type === 'mock'
      ? `The mock allotment has been run. Your mock result is ${when} on the portal. It does not hold a seat; you can still change your options before Round 1.`
      : allotted.has(f.id)
        ? `You have been allotted a seat in ${label}. Details are ${when} on the portal. Exercise your post-allotment choice before the choices window closes, or the seat will lapse.`
        : `${label} has been run. Results are ${when} on the portal.`,
    link: '/faculty/allotment-status'
  }));

  const lapsedIds = (round.changes || []).filter(c => c.to === 'lapsed').map(c => c.allotmentId);
  if (lapsedIds.length) {
    const lapsed = await Allotment.findAll({ where: { id: lapsedIds }, include: [{ model: User, as: 'faculty' }] });
    await notifyMany(lapsed.map(a => a.faculty).filter(Boolean), () => ({
      type: 'seat_lapsed',
      title: 'Your seat has lapsed',
      message: `You did not exercise a post-allotment choice before ${label} was run, so your previous seat has lapsed and you are no longer part of counselling.`,
      link: '/faculty/allotment-status'
    }));
  }
};

const sendError = (res, error) => {
  res.status(error instanceof CounsellingError ? error.status : 500).json({ message: error.message });
};

// Shared by admin and faculty so both can show which phase is open.
export const getScheduleStatus = async (req, res) => {
  try {
    res.json(await getSchedule());
  } catch (error) {
    sendError(res, error);
  }
};

export const updateSchedule = async (req, res) => {
  try {
    if (!Array.isArray(req.body.phases)) {
      return res.status(400).json({ message: 'phases must be an array' });
    }
    const schedule = await saveSchedule(req.body.phases);
    await audit(req, 'schedule.update', {
      summary: 'Updated counselling schedule',
      details: Object.fromEntries(schedule.map(p => [p.phase, { startAt: p.startAt, endAt: p.endAt }]))
    });
    res.json(schedule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getRounds = async (req, res) => {
  try {
    const rounds = await CounsellingRound.findAll({ order: [['id', 'DESC']] });
    const active = rounds.filter(r => r.status === 'completed').reverse();
    res.json({
      rounds: rounds.map(r => ({ ...r.toJSON(), label: ROUND_LABELS[r.type], changes: undefined })),
      nextRound: nextRealRoundType(active),
      canRunMock: !active.some(r => r.type !== 'mock'),
      latestActiveId: active.at(-1)?.id || null
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const runRound = async (req, res) => {
  try {
    const type = req.body.type || nextRealRoundType(await getActiveRounds());
    if (!type) throw new CounsellingError('All counselling rounds have already been run', 409);
    const round = await runCounsellingRound(type, { reportingDeadline: req.body.reportingDeadline });
    await audit(req, 'round.run', { targetType: 'round', targetId: round.id, summary: `Ran ${ROUND_LABELS[type]}`, details: round.summary });
    await notifyRoundResults(round);
    res.status(201).json({
      message: `${ROUND_LABELS[type]} completed: ${round.summary.allotted} of ${round.summary.participants} faculty allotted.`,
      round: { ...round.toJSON(), label: ROUND_LABELS[type], changes: undefined }
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const undoRound = async (req, res) => {
  try {
    const affected = await Allotment.findAll({ where: { roundId: req.params.id }, include: [{ model: User, as: 'faculty' }] });
    const round = await undoCounsellingRound(req.params.id);
    await audit(req, 'round.undo', { targetType: 'round', targetId: round.id, summary: `Undid ${ROUND_LABELS[round.type]}`, details: { allotmentsRemoved: affected.length } });
    if (round.type !== 'mock') {
      await notifyMany(affected.map(a => a.faculty).filter(Boolean), () => ({
        type: 'round_withdrawn',
        title: `${ROUND_LABELS[round.type]} results withdrawn`,
        message: `The ${ROUND_LABELS[round.type]} results have been withdrawn by the counselling authority and will be re-run. Please check the portal for updates.`,
        link: '/faculty/allotment-status'
      }));
    }
    res.json({ message: `${ROUND_LABELS[round.type]} has been undone` });
  } catch (error) {
    sendError(res, error);
  }
};

export const resetCounselling = async (req, res) => {
  try {
    await resetAllCounselling();
    await audit(req, 'counselling.reset', { summary: 'Reset all counselling rounds and allotments' });
    res.json({ message: 'All rounds and allotments have been cleared' });
  } catch (error) {
    sendError(res, error);
  }
};

// Results for one round (defaults to the latest active one).
export const getAllotmentResults = async (req, res) => {
  try {
    let roundId = req.query.roundId;
    if (!roundId) roundId = (await getActiveRounds()).at(-1)?.id;
    if (!roundId) return res.json([]);

    const allotments = await Allotment.findAll({
      where: { roundId },
      include: [
        { model: User, as: 'faculty', attributes: ['id', 'name', 'email', 'rank', 'totalScore'] },
        { model: College, as: 'college', attributes: ['id', 'name', 'code', 'tier'] }
      ]
    });
    allotments.sort((a, b) => (a.faculty?.rank ?? Infinity) - (b.faculty?.rank ?? Infinity));
    res.json(allotments);
  } catch (error) {
    sendError(res, error);
  }
};

export const getSeatMatrix = async (req, res) => {
  try {
    const seats = await DepartmentSeat.findAll({
      include: [{ model: College, as: 'college', attributes: ['id', 'name', 'code', 'tier', 'isActive'] }]
    });
    const occupancy = await getSeatOccupancy();
    const categoryOccupancy = await getCategoryOccupancy();
    const heldByStatus = await Allotment.count({ where: { status: HELD_STATUSES }, group: ['status'] });
    res.json({
      seats: seats
        .map(s => ({ ...s.toJSON(), categorySeats: seatsByCategory(s), filledSeats: occupancy[s.id] || 0, filledByCategory: categoryOccupancy[s.id] || {} }))
        .sort((a, b) => a.college.name.localeCompare(b.college.name) || a.department.localeCompare(b.department)),
      heldByStatus: Object.fromEntries(heldByStatus.map(r => [r.status, r.count]))
    });
  } catch (error) {
    sendError(res, error);
  }
};
