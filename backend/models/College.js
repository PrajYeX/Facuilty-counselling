import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const College = sequelize.define('College', {
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
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  location: {
    type: DataTypes.STRING
  },
  district: {
    type: DataTypes.STRING
  },
  tier: {
    type: DataTypes.ENUM('Tier 1', 'Tier 2', 'Tier 3'),
    allowNull: false
  },
  // Sum of the department seats; kept in sync by the college controller.
  totalSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

College.associate = (models) => {
  College.hasMany(models.DepartmentSeat, { as: 'seats', foreignKey: 'collegeId' });
  College.hasMany(models.Allotment, { as: 'allotments', foreignKey: 'collegeId' });
};

export default College;
