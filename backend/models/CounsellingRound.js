import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const ROUND_TYPES = ['mock', 'round1', 'round2', 'extended'];

const CounsellingRound = sequelize.define('CounsellingRound', {
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
  type: {
    type: DataTypes.ENUM(...ROUND_TYPES),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('completed', 'undone'),
    defaultValue: 'completed'
  },
  reportingDeadline: {
    type: DataTypes.DATE
  },
  summary: {
    type: DataTypes.JSON
  },
  // Status changes this round made to earlier allotments ({ allotmentId, from, to }),
  // replayed in reverse when the round is undone.
  changes: {
    type: DataTypes.JSON
  }
}, {
  timestamps: true
});

CounsellingRound.associate = (models) => {
  CounsellingRound.hasMany(models.Allotment, { as: 'allotments', foreignKey: 'roundId' });
};

export default CounsellingRound;
