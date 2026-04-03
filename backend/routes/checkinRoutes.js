const express = require('express');
const router = express.Router();
const { checkIn, getCheckinStats } = require('../controllers/checkinController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdminSessionForAttendance } = require('../middleware/adminSessionMiddleware');

router.post('/', requireAdminSessionForAttendance, checkIn);
router.get('/stats/:eventId', protect, getCheckinStats);

module.exports = router;
