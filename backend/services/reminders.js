import { User, Allotment, Setting } from '../models/index.js';
import { getSchedule } from './schedule.js';
import { getActiveRounds } from './allotment.js';
import { notifyMany } from './notify.js';

const REMIND_WITHIN_MS = 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 15 * 60 * 1000;

const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// Who needs a reminder when each phase is about to close.
const RECIPIENTS = {
  registration: async () => User.findAll({ where: { role: 'faculty', verificationStatus: ['pending', 'rejected'] } }),
  verification: async () => User.findAll({ where: { role: 'faculty', verificationStatus: 'rejected' } }),
  option_entry: async () => User.findAll({ where: { role: 'faculty', verificationStatus: 'verified' } }),
  choices: async () => {
    const latest = (await getActiveRounds()).filter(r => r.type !== 'mock').at(-1);
    if (!latest) return [];
    const pending = await Allotment.findAll({ where: { roundId: latest.id, status: 'allotted' } });
    return User.findAll({ where: { id: pending.map(a => a.facultyId) } });
  }
};

const LINKS = {
  registration: '/faculty/upload-documents',
  verification: '/faculty/upload-documents',
  option_entry: '/faculty/options',
  choices: '/faculty/allotment-status'
};

// Sends one reminder per phase closing time, in the 24 hours before it closes.
export const sendDueReminders = async () => {
  const setting = await Setting.findByPk('remindersSent');
  const sent = setting?.value || {};
  const now = Date.now();

  for (const phase of await getSchedule()) {
    if (!RECIPIENTS[phase.phase] || !phase.endAt || !phase.isOpen) continue;
    const closesIn = new Date(phase.endAt).getTime() - now;
    const key = `${phase.phase}@${new Date(phase.endAt).toISOString()}`;
    if (closesIn <= 0 || closesIn > REMIND_WITHIN_MS || sent[key]) continue;

    const users = await RECIPIENTS[phase.phase]();
    await notifyMany(users, () => ({
      type: 'deadline_reminder',
      title: `${phase.label} closes soon`,
      message: `${phase.label} closes on ${formatDate(phase.endAt)}. Please complete any pending steps before then.`,
      link: LINKS[phase.phase]
    }));
    sent[key] = new Date().toISOString();
    await Setting.upsert({ key: 'remindersSent', value: sent });
  }
};

export const startReminderScheduler = () => {
  const run = () => sendDueReminders().catch(err => console.error(`Reminder check failed: ${err.message}`));
  run();
  return setInterval(run, CHECK_EVERY_MS);
};
