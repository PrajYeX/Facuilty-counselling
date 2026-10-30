import { getSchedule, describeClosedPhase } from '../services/schedule.js';

// Allow the request when any of the given phases is currently open.
export const requirePhase = (...phases) => async (req, res, next) => {
  try {
    const schedule = await getSchedule();
    const relevant = schedule.filter(p => phases.includes(p.phase));
    if (relevant.some(p => p.isOpen)) return next();
    res.status(403).json({
      message: relevant.map(describeClosedPhase).join('; '),
      phaseClosed: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
