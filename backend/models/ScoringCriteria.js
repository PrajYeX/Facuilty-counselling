import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ScoringCriteria = sequelize.define('ScoringCriteria', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING
  },
  field: {
    type: DataTypes.STRING,
    allowNull: false
  },
  condition: {
    type: DataTypes.JSON
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

export default ScoringCriteria;
