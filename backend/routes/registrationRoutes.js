const express = require('express');
const router = express.Router();
const { registerForEvent, checkRegistration, getMyRegistrations, cancelRegistration, cancelRegistrationByBody, cleanupExpiredPending } = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, registerForEvent);
router.post('/cancel', protect, cancelRegistrationByBody);
router.post('/cleanup-expired', protect, cleanupExpiredPending);
router.get('/check/:eventId', protect, checkRegistration);
router.get('/my', protect, getMyRegistrations);
router.delete('/:registrationId/cancel', protect, cancelRegistration);

module.exports = router;

