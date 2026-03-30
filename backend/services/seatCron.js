const SeatBooking = require('../models/SeatBooking');
const Event = require('../models/Event');
const { sendSeatReminderEmail } = require('../utils/mailer');
const mongoose = require('mongoose');

const NETWORK_ERRORS = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH']);

const startSeatReminderCron = () => {
  // Run every 1 minute
  setInterval(async () => {
    // Skip if mongoose is not in connected state (readyState 1 = connected)
    if (mongoose.connection.readyState !== 1) {
      console.warn('[Cron] Skipping seat reminders — MongoDB not connected (readyState:', mongoose.connection.readyState, ')');
      return;
    }

    try {
      // Find holds expiring within the next 10 minutes
      const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);
      
      const expiringHolds = await SeatBooking.find({
        status: 'temp_hold',
        reminderSent: false,
        expiresAt: { $lte: tenMinutesFromNow, $gt: new Date() }
      }).populate('userId');
      
      for (const hold of expiringHolds) {
        if (!hold.userId) continue;
        
        let eventName = hold.eventId;
        try {
          const event = await Event.findOne({ eventId: hold.eventId });
          if (event && event.name) {
            eventName = event.name;
          }
        } catch (e) {
          // Ignore individual event lookup failures
        }

        await sendSeatReminderEmail({
          name: hold.userId.name || hold.userId.fullName || 'User',
          email: hold.userId.email,
          seatId: hold.seatId,
          eventName: eventName
        });
        
        hold.reminderSent = true;
        await hold.save();
        console.log(`[Cron] Sent 10-min reminder email to ${hold.userId.email} for seat ${hold.seatId} at ${eventName}`);
      }
    } catch (err) {
      // Check if this is a network/DNS error — log concisely, don't dump full stack
      const code = err?.cause?.code || err?.code;
      if (NETWORK_ERRORS.has(code) || err?.name === 'MongoNetworkError' || err?.name === 'MongoServerSelectionError') {
        console.warn(`[Cron] Seat reminder skipped — DB unreachable (${code || err?.name}). Check network/Atlas connectivity.`);
      } else {
        console.error('[Cron Error] Failed to process seat reminders:', err);
      }
    }
  }, 60 * 1000);
};

module.exports = { startSeatReminderCron };
