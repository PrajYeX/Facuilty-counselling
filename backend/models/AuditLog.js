import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// Append-only record of admin and college actions.
const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  _id: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.id;
    }
  },
  actorId: {
    type: DataTypes.INTEGER
  },
  // Stored as text so the log stays readable if the account is later deleted.
  actorName: {
    type: DataTypes.STRING
  },
  actorRole: {
    type: DataTypes.STRING
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  targetType: {
    type: DataTypes.STRING
  },
  targetId: {
    type: DataTypes.STRING
  },
  summary: {
    type: DataTypes.STRING
  },
  details: {
    type: DataTypes.JSON
  }
}, {
  timestamps: true,
  updatedAt: false
});

export default AuditLog;
