import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Announcement = sequelize.define('Announcement', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  audience: {
    type: DataTypes.ENUM('all', 'faculty', 'college'),
    defaultValue: 'all'
  },
  pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.INTEGER
  }
}, {
  timestamps: true
});

export default Announcement;
