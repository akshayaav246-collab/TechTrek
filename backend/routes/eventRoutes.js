const express = require('express');
const router = express.Router();
const {
  getEvents, getEventById, createEvent, getMyEvents, getEventDashboard, markEventCompleted, getAdminAnalytics, attachHallLayout, getParticipants, exportCSV, updateEvent, deleteEvent, startCheckin, getEventColleges
} = require('../controllers/eventController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Public
router.get('/', getEvents);
router.get('/colleges', getEventColleges); // colleges from upcoming events — used on signup

// Admin-only routes (must come BEFORE /:id)
router.post('/',                protect, authorizeRoles('admin', 'superAdmin'), createEvent);
router.get('/analytics',        protect, authorizeRoles('admin', 'superAdmin'), getAdminAnalytics);
router.get('/mine',             protect, authorizeRoles('admin', 'superAdmin'), getMyEvents);
router.get('/dashboard/:eventId', protect, authorizeRoles('admin', 'superAdmin'), getEventDashboard);
router.patch('/:eventId/complete',     protect, authorizeRoles('admin', 'superAdmin'), markEventCompleted);
router.patch('/:eventId/hall',         protect, authorizeRoles('admin', 'superAdmin'), attachHallLayout);
router.patch('/:eventId/checkin-start',protect, authorizeRoles('admin', 'superAdmin'), startCheckin);
router.get('/:eventId/participants',   protect, authorizeRoles('admin', 'superAdmin'), getParticipants);
router.get('/:eventId/export',         protect, authorizeRoles('admin', 'superAdmin'), exportCSV);
router.put('/:eventId',                protect, authorizeRoles('admin', 'superAdmin'), updateEvent);
router.delete('/:eventId',             protect, authorizeRoles('admin', 'superAdmin'), deleteEvent);

// Public (must be last)
router.get('/:id', getEventById);

module.exports = router;
