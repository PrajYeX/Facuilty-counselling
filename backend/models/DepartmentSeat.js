import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// Vacancies for one department in one college, e.g. "CSE: 3".
// Filled counts are derived from Allotment rows, never stored.
const DepartmentSeat = sequelize.define('DepartmentSeat', {
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
  collegeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Sum of categorySeats; kept in sync by the college controller.
  totalSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  // Seats per reservation category, e.g. { GEN: 2, WOMEN: 1 }.
  // Null means every seat is General (rows created before categories existed).
  categorySeats: {
    type: DataTypes.JSON
  }
}, {
  // Uniqueness is enforced in the controllers: a composite unique index here
  // breaks sequelize.sync({ alter: true }) on SQLite, which drops the rows.
  timestamps: true
});

DepartmentSeat.associate = (models) => {
  DepartmentSeat.belongsTo(models.College, { as: 'college', foreignKey: 'collegeId' });
  DepartmentSeat.hasMany(models.OptionEntry, { as: 'options', foreignKey: 'seatId' });
  DepartmentSeat.hasMany(models.Allotment, { as: 'allotments', foreignKey: 'seatId' });
};

export default DepartmentSeat;
