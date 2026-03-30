require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const hallRoutes = require('./routes/hallRoutes');
const seatRoutes = require('./routes/seatRoutes');
const speakerRoutes = require('./routes/speakerRoutes');
const { startSeatReminderCron } = require('./services/seatCron');

// Connect to Database
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/speakers', speakerRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('TechTrek API is running...');
});

// Start our cron services
startSeatReminderCron();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
