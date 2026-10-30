import { SchedulePhase } from '../models/index.js';
import { PHASES } from '../models/SchedulePhase.js';

export const PHASE_LABELS = {
  registration: 'Registration',
  verification: 'Document verification',
  option_entry: 'Option entry',
  results: 'Results',
  choices: 'Post-allotment choices'
};

// A phase with no dates configured is always open, so the portal keeps
// working until the admin publishes a schedule.
export const isPhaseOpen = (row, now = new Date()) => {
  if (!row || (!row.startAt && !row.endAt)) return true;
  if (row.startAt && now < new Date(row.startAt)) return false;
  if (row.endAt && now > new Date(row.endAt)) return false;
  return true;
};

export const getSchedule = async () => {
  const rows = await SchedulePhase.findAll();
  const byPhase = Object.fromEntries(rows.map(r => [r.phase, r]));
  const now = new Date();
  return PHASES.map(phase => {
    const row = byPhase[phase];
    return {
      phase,
      label: PHASE_LABELS[phase],
      startAt: row?.startAt || null,
      endAt: row?.endAt || null,
      isOpen: isPhaseOpen(row, now),
      hasStarted: !row?.startAt || now >= new Date(row.startAt)
    };
  });
};

export const getPhase = async (phase) => {
  const schedule = await getSchedule();
  return schedule.find(p => p.phase === phase);
};

export const updateSchedule = async (phases) => {
  for (const { phase, startAt, endAt } of phases) {
    if (!PHASES.includes(phase)) throw new Error(`Unknown phase: ${phase}`);
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      throw new Error(`${PHASE_LABELS[phase]}: end must be after start`);
    }
    await SchedulePhase.upsert({ phase, startAt: startAt || null, endAt: endAt || null });
  }
  return getSchedule();
};

const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const describeClosedPhase = (p) => {
  if (p.startAt && new Date() < new Date(p.startAt)) return `${p.label} opens on ${formatDate(p.startAt)}`;
  return `${p.label} closed on ${formatDate(p.endAt)}`;
};
