const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getHalls, getHallById, createHall, updateHall, deleteHall,
} = require('../controllers/hallController');

const adminOnly = [protect, authorizeRoles('admin', 'superAdmin')];

router.get('/', adminOnly, getHalls);
router.get('/:id', adminOnly, getHallById);
router.post('/', adminOnly, createHall);
router.put('/:id', adminOnly, updateHall);
router.delete('/:id', adminOnly, deleteHall);

module.exports = router;
