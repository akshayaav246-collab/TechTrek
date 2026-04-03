const express = require('express');
const { adminLogin, adminLogout, getAdminMe, streamAlerts } = require('../controllers/adminController');
const { requireAdminSession } = require('../middleware/adminSessionMiddleware');

const router = express.Router();

router.post('/login', adminLogin);
router.post('/logout', requireAdminSession, adminLogout);
router.get('/me', requireAdminSession, getAdminMe);
router.get('/alerts/stream', streamAlerts);

module.exports = router;
