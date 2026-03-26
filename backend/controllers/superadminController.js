const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const bcrypt = require('bcryptjs');

// @desc    Create an admin account
// @route   POST /api/superadmin/admins
const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required.' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User with this email already exists.' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name, email, password: hashed,
      phone: 'N/A', college: 'TechTrek HQ', year: 'N/A',
      discipline: 'Admin', domain: email.split('@')[1] || 'techtrek.in',
      role: 'admin', isActive: true,
    });

    res.status(201).json({
      _id: admin._id, name: admin.name, email: admin.email,
      role: admin.role, isActive: admin.isActive, createdAt: admin.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List all admins
// @route   GET /api/superadmin/admins
const listAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an admin
// @route   DELETE /api/superadmin/admins/:id
const deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found.' });
    }
    await admin.deleteOne();
    res.json({ message: 'Admin deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle admin active status
// @route   PATCH /api/superadmin/admins/:id/toggle
const toggleAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found.' });
    }
    admin.isActive = !admin.isActive;
    await admin.save();
    res.json({ _id: admin._id, isActive: admin.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Platform analytics
// @route   GET /api/superadmin/analytics
const getAnalytics = async (req, res) => {
  try {
    const [totalEvents, totalStudents, totalAdmins, regStats, checkinStats] = await Promise.all([
      Event.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'admin' }),
      Registration.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Event.aggregate([
        { $group: { _id: null, totalCheckedIn: { $sum: '$checkedInCount' }, totalRegistered: { $sum: '$registeredCount' } } }
      ]),
    ]);

    const regMap = {};
    regStats.forEach(r => { regMap[r._id] = r.count; });

    const totals = checkinStats[0] || { totalCheckedIn: 0, totalRegistered: 0 };
    const noShowRate = totals.totalRegistered > 0
      ? Math.round((1 - totals.totalCheckedIn / totals.totalRegistered) * 100)
      : 0;

    res.json({
      totalEvents, totalStudents, totalAdmins,
      registrations: {
        registered: regMap['REGISTERED'] || 0,
        waitlisted: regMap['WAITLISTED'] || 0,
        checkedIn: regMap['CHECKED_IN'] || 0,
      },
      checkedInCount: totals.totalCheckedIn,
      noShowRate,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all events (superAdmin oversight)
// @route   GET /api/superadmin/events
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createAdmin, listAdmins, deleteAdmin, toggleAdmin, getAnalytics, getAllEvents };
