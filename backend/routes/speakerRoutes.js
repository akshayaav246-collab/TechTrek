const express = require('express');
const router = express.Router();
const { listSpeakers, upsertSpeaker } = require('../controllers/speakerController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', protect, authorizeRoles('admin', 'superAdmin'), listSpeakers);
router.post('/', protect, authorizeRoles('admin', 'superAdmin'), upsertSpeaker);

module.exports = router;
