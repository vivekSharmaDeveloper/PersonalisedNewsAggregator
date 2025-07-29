const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  interests: [{ type: String }],
  sources: [{ type: String }], // new field for consistency
  subscribedSources: [{ type: String }], // keep for backward compatibility
  onboarded: { type: Boolean, default: false },
  lastLogin: { type: Date },
  lastLoginLocation: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  console.log('Hashing password for user:', this.username);
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare plain password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 