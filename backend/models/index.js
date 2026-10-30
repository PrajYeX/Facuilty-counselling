import sequelize from '../config/db.js';
import User from './User.js';
import College from './College.js';
import ScoringCriteria from './ScoringCriteria.js';
import Allotment from './Allotment.js';
import DepartmentSeat from './DepartmentSeat.js';
import OptionEntry from './OptionEntry.js';
import CounsellingRound from './CounsellingRound.js';
import SchedulePhase from './SchedulePhase.js';
import Setting from './Setting.js';
import Notification from './Notification.js';
import AuditLog from './AuditLog.js';
import Announcement from './Announcement.js';

const models = {
  User,
  College,
  ScoringCriteria,
  Allotment,
  DepartmentSeat,
  OptionEntry,
  CounsellingRound,
  SchedulePhase,
  Setting,
  Notification,
  AuditLog,
  Announcement
};

// Initialize associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

export {
  sequelize,
  User,
  College,
  ScoringCriteria,
  Allotment,
  DepartmentSeat,
  OptionEntry,
  CounsellingRound,
  SchedulePhase,
  Setting,
  Notification,
  AuditLog,
  Announcement
};
export default models;
