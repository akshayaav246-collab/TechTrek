const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  college: { type: String, required: true },
  year: { type: String, required: true },
  discipline: { type: String, required: true },
  domain: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin', 'superAdmin'], default: 'student' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
