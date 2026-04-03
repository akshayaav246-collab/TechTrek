const express = require('express');
const router = express.Router();
const {
  getEvents, getEventById, createEvent, getMyEvents, getEventDashboard, markEventCompleted, getAdminAnalytics, attachHallLayout, getParticipants, exportCSV, updateEvent, deleteEvent, startCheckin, getEventColleges,
  uploadPhotos, addFeedback, getEventFeedback, getEventFeedbackAdmin, getFeedbackCurationAdmin, updateFeedbackVisibility, toggleFeedbackLanding, toggleFeedbackEventPage, getFeaturedFeedback
} = require('../controllers/eventController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});
const upload = multer({ storage });

// Public
router.get('/', getEvents);
router.get('/colleges', getEventColleges); // colleges from upcoming events — used on signup
router.get('/featured/feedback', getFeaturedFeedback);

// Admin-only routes (must come BEFORE /:id)
router.post('/',                protect, authorizeRoles('admin', 'superAdmin'), createEvent);
router.get('/analytics',        protect, authorizeRoles('admin', 'superAdmin'), getAdminAnalytics);
router.get('/feedback/curation/admin', protect, authorizeRoles('admin', 'superAdmin'), getFeedbackCurationAdmin);
router.get('/mine',             protect, authorizeRoles('admin', 'superAdmin'), getMyEvents);
router.get('/dashboard/:eventId', protect, authorizeRoles('admin', 'superAdmin'), getEventDashboard);
router.patch('/:eventId/complete',     protect, authorizeRoles('admin', 'superAdmin'), markEventCompleted);
router.patch('/:eventId/hall',         protect, authorizeRoles('admin', 'superAdmin'), attachHallLayout);
router.patch('/:eventId/checkin-start',protect, authorizeRoles('admin', 'superAdmin'), startCheckin);
router.get('/:eventId/participants',   protect, authorizeRoles('admin', 'superAdmin'), getParticipants);
router.get('/:eventId/export',         protect, authorizeRoles('admin', 'superAdmin'), exportCSV);
router.put('/:eventId',                protect, authorizeRoles('admin', 'superAdmin'), updateEvent);
router.delete('/:eventId',             protect, authorizeRoles('admin', 'superAdmin'), deleteEvent);
router.post('/:eventId/photos',        protect, authorizeRoles('admin', 'superAdmin'), upload.array('photos', 10), uploadPhotos);
router.get('/:eventId/feedback/admin', protect, authorizeRoles('admin', 'superAdmin'), getEventFeedbackAdmin);
router.patch('/:eventId/feedback/:feedbackId/visibility', protect, authorizeRoles('admin', 'superAdmin'), updateFeedbackVisibility);
router.patch('/:eventId/feedback/:feedbackId/toggle-landing', protect, authorizeRoles('admin', 'superAdmin'), toggleFeedbackLanding);
router.patch('/:eventId/feedback/:feedbackId/toggle-event-page', protect, authorizeRoles('admin', 'superAdmin'), toggleFeedbackEventPage);

// Public / Auth Student
router.post('/:eventId/feedback', protect, addFeedback);
router.get('/:eventId/feedback', getEventFeedback);

// Public (must be last)
router.get('/:id', getEventById);

module.exports = router;
