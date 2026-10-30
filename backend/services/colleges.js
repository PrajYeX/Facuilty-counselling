import { College, DepartmentSeat } from '../models/index.js';
import { getSeatOccupancy, getCategoryOccupancy } from './allotment.js';
import { getCategories, seatsByCategory, GENERAL } from './categories.js';

// Accepts { department, categorySeats: { GEN: 2, WOMEN: 1 } } or the older
// { department, totalSeats } (all General).
const normalizeSeat = (s, validKeys) => {
  const department = String(s.department || '').trim();
  const raw = s.categorySeats && typeof s.categorySeats === 'object'
    ? s.categorySeats
    : { [GENERAL.key]: s.totalSeats };
  const categorySeats = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === '' || value === null || value === undefined) continue;
    const count = Number(value);
    if (!Number.isInteger(count) || count < 0) throw new Error(`${department}: seat counts must be whole numbers of 0 or more`);
    if (!validKeys.has(key)) throw new Error(`${department}: unknown category ${key}`);
    if (count > 0) categorySeats[key] = count;
  }
  const totalSeats = Object.values(categorySeats).reduce((sum, n) => sum + n, 0);
  return { department, categorySeats, totalSeats };
};

// Replaces a college's seat matrix. No department or category quota can drop
// below the seats already occupied in it.
export const saveSeats = async (college, seats, transaction) => {
  const validKeys = new Set((await getCategories()).map(c => c.key));
  const cleaned = (seats || []).filter(s => String(s.department || '').trim()).map(s => normalizeSeat(s, validKeys));

  const names = cleaned.map(s => s.department.toLowerCase());
  if (new Set(names).size !== names.length) throw new Error('Each department can only be listed once');

  const existing = await DepartmentSeat.findAll({ where: { collegeId: college.id }, transaction });
  const occupancy = await getSeatOccupancy(transaction);
  const categoryOccupancy = await getCategoryOccupancy(transaction);

  for (const seat of existing) {
    const match = cleaned.find(s => s.department.toLowerCase() === seat.department.toLowerCase());
    const occupied = occupancy[seat.id] || 0;
    if (!match) {
      if (occupied) throw new Error(`${seat.department} has ${occupied} occupied seat(s) and cannot be removed`);
      await seat.destroy({ transaction });
      continue;
    }
    for (const [category, filled] of Object.entries(categoryOccupancy[seat.id] || {})) {
      if ((match.categorySeats[category] || 0) < filled) {
        throw new Error(`${seat.department} has ${filled} occupied ${category} seat(s); that quota cannot go below it`);
      }
    }
    await seat.update(match, { transaction });
  }
  for (const s of cleaned) {
    if (!existing.some(seat => seat.department.toLowerCase() === s.department.toLowerCase())) {
      await DepartmentSeat.create({ collegeId: college.id, ...s }, { transaction });
    }
  }
  const totalSeats = cleaned.reduce((sum, s) => sum + s.totalSeats, 0);
  await college.update({ totalSeats }, { transaction });
};

export const withSeatCounts = async (colleges) => {
  const occupancy = await getSeatOccupancy();
  const categoryOccupancy = await getCategoryOccupancy();
  return colleges.map(c => {
    const json = c.toJSON();
    json.seats = (json.seats || [])
      .map(s => ({
        ...s,
        categorySeats: seatsByCategory(s),
        filledSeats: occupancy[s.id] || 0,
        filledByCategory: categoryOccupancy[s.id] || {}
      }))
      .sort((a, b) => a.department.localeCompare(b.department));
    json.filledSeats = json.seats.reduce((sum, s) => sum + s.filledSeats, 0);
    return json;
  });
};

export const findCollegeWithSeats = async (id) => {
  const [json] = await withSeatCounts([await College.findByPk(id, { include: [{ model: DepartmentSeat, as: 'seats' }] })]);
  return json;
};
