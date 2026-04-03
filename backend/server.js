require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const hallRoutes = require('./routes/hallRoutes');
const seatRoutes = require('./routes/seatRoutes');
const speakerRoutes = require('./routes/speakerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const { startSeatReminderCron } = require('./services/seatCron');
const { revokeExpiredSessions } = require('./controllers/adminController');

// Connect to Database
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/speakers', speakerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/certificates', certificateRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('TechTrek API is running...');
});

// Start our cron services
startSeatReminderCron();
setInterval(() => {
  revokeExpiredSessions().catch((error) => console.error('Admin session cleanup failed:', error.message));
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
