const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createAdmin, listAdmins, deleteAdmin, toggleAdmin, getAnalytics, getAllEvents
} = require('../controllers/superadminController');

const guard = [protect, authorizeRoles('superAdmin')];

router.post('/admins', guard, createAdmin);
router.get('/admins', guard, listAdmins);
router.delete('/admins/:id', guard, deleteAdmin);
router.patch('/admins/:id/toggle', guard, toggleAdmin);
router.get('/analytics', guard, getAnalytics);
router.get('/events', guard, getAllEvents);

module.exports = router;
