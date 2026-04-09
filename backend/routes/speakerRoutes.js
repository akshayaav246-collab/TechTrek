const express = require('express');
const router = express.Router();
const { listSpeakers, upsertSpeaker, extractLinkedInData } = require('../controllers/speakerController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', protect, authorizeRoles('admin', 'superAdmin'), listSpeakers);
router.post('/', protect, authorizeRoles('admin', 'superAdmin'), upsertSpeaker);
router.post('/extract', protect, authorizeRoles('admin', 'superAdmin'), extractLinkedInData);

module.exports = router;
