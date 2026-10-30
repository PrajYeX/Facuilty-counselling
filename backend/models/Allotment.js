import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// Lifecycle of an allotment:
//   mock      - result of a mock round; holds no seat
//   allotted  - seat allotted, faculty has not exercised a choice yet
//   accepted  - Choice 1: accept and join (frozen, leaves counselling)
//   upgrade   - Choice 2: accept, but try for a better option next round
//   rejected  - Choice 3: give up the seat, stay in the next round
//   quit      - Choice 4: give up the seat and leave counselling
//   lapsed    - no choice exercised before the next round ran
//   superseded- an upgrade holder was re-allotted in a later round
export const ALLOTMENT_STATUSES = [
  'mock', 'allotted', 'accepted', 'upgrade', 'rejected', 'quit', 'lapsed', 'superseded'
];

// Statuses that occupy a seat.
export const HELD_STATUSES = ['allotted', 'accepted', 'upgrade'];

const Allotment = sequelize.define('Allotment', {
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
  collegeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  seatId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING
  },
  // Which category's quota this seat was allotted from (GEN = open merit).
  category: {
    type: DataTypes.STRING,
    defaultValue: 'GEN'
  },
  roundId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  round: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  // Position of the allotted seat in the faculty member's option list (1 = first choice).
  optionNumber: {
    type: DataTypes.INTEGER
  },
  // True when an upgrade holder found nothing better and kept the same seat.
  retained: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  allottedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  choiceAt: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM(...ALLOTMENT_STATUSES),
    defaultValue: 'allotted'
  },
  // Set by the college once the faculty member reports (or fails to report) for duty.
  reportingStatus: {
    type: DataTypes.ENUM('reported', 'not_reported'),
    allowNull: true
  },
  reportedAt: {
    type: DataTypes.DATE
  },
  reportingNote: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true
});

Allotment.associate = (models) => {
  Allotment.belongsTo(models.User, { as: 'faculty', foreignKey: 'facultyId' });
  Allotment.belongsTo(models.College, { as: 'college', foreignKey: 'collegeId' });
  Allotment.belongsTo(models.DepartmentSeat, { as: 'seat', foreignKey: 'seatId' });
  Allotment.belongsTo(models.CounsellingRound, { as: 'counsellingRound', foreignKey: 'roundId' });
};

export default Allotment;
