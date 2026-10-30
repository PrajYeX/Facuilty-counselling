import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const PHASES = ['registration', 'verification', 'option_entry', 'results', 'choices'];

const SchedulePhase = sequelize.define('SchedulePhase', {
  phase: {
    type: DataTypes.ENUM(...PHASES),
    primaryKey: true
  },
  startAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

export default SchedulePhase;
