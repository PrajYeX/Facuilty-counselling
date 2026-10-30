import { AuditLog } from '../models/index.js';

// Never throws: auditing must not block the action it records.
export const audit = async (req, action, { targetType, targetId, summary, details } = {}) => {
  try {
    await AuditLog.create({
      actorId: req.user?.id,
      actorName: req.user?.name,
      actorRole: req.user?.role,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      summary,
      details
    });
  } catch (error) {
    console.error(`Failed to write audit log for ${action}: ${error.message}`);
  }
};
