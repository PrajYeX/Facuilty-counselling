import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// One line of a faculty member's option list. Lower priority = more preferred.
const OptionEntry = sequelize.define('OptionEntry', {
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
  facultyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  seatId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  // Uniqueness is enforced in the controllers: a composite unique index here
  // breaks sequelize.sync({ alter: true }) on SQLite, which drops the rows.
  timestamps: true
});

OptionEntry.associate = (models) => {
  OptionEntry.belongsTo(models.User, { as: 'faculty', foreignKey: 'facultyId' });
  OptionEntry.belongsTo(models.DepartmentSeat, { as: 'seat', foreignKey: 'seatId' });
};

export default OptionEntry;
