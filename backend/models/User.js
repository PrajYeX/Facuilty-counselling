import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/db.js';

const User = sequelize.define('User', {
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
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'faculty', 'college'),
    defaultValue: 'faculty'
  },
  // For college accounts: the college they represent.
  collegeId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Reservation category key (see services/categories.js).
  category: {
    type: DataTypes.STRING,
    defaultValue: 'GEN'
  },
  // Existing accounts count as verified; registration sets this to false.
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerifyTokenHash: {
    type: DataTypes.STRING
  },
  passwordResetTokenHash: {
    type: DataTypes.STRING
  },
  passwordResetExpires: {
    type: DataTypes.DATE
  },
  phone: {
    type: DataTypes.STRING
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY
  },
  qualifications: {
    type: DataTypes.JSON
  },
  documents: {
    type: DataTypes.JSON
  },
  totalScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Derived from the per-document statuses (see services/documents.js).
  verificationStatus: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Never send these to a client.
export const PRIVATE_FIELDS = ['password', 'emailVerifyTokenHash', 'passwordResetTokenHash', 'passwordResetExpires'];

User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

User.associate = (models) => {
  User.hasMany(models.Allotment, { as: 'allotments', foreignKey: 'facultyId' });
  User.hasMany(models.OptionEntry, { as: 'options', foreignKey: 'facultyId' });
  User.belongsTo(models.College, { as: 'college', foreignKey: 'collegeId', constraints: false });
};

export default User;
