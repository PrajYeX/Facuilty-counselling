import { Setting } from '../models/index.js';

// GEN is the open-merit quota everyone competes for; it always exists.
export const GENERAL = { key: 'GEN', label: 'General' };

export const getCategories = async () => {
  const setting = await Setting.findByPk('categories');
  const custom = Array.isArray(setting?.value) ? setting.value.filter(c => c.key !== GENERAL.key) : [];
  return [GENERAL, ...custom];
};

export const setCategories = async (categories) => {
  const seen = new Set([GENERAL.key]);
  const cleaned = [];
  for (const c of categories || []) {
    const key = String(c.key || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
    const label = String(c.label || '').trim();
    if (!key || !label || seen.has(key)) continue;
    seen.add(key);
    cleaned.push({ key, label });
  }
  await Setting.upsert({ key: 'categories', value: cleaned });
  return getCategories();
};

// Seats per category for a department seat row. Rows from before categories
// existed have only a total, which is all General.
export const seatsByCategory = (seat) => {
  if (seat.categorySeats && Object.keys(seat.categorySeats).length) return seat.categorySeats;
  return { [GENERAL.key]: seat.totalSeats };
};
