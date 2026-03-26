const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send a welcome email after signup
 */
const sendWelcomeEmail = async ({ name, email }) => {
  await transporter.sendMail({
    from: `"TechTrek" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Welcome to TechTrek!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#FAF8F4;border-radius:16px;overflow:hidden;">
        <div style="background:#0E1B3D;padding:40px;text-align:center;">
          <h1 style="color:#E8831A;margin:0;font-size:32px;letter-spacing:-1px;">TechTrek</h1>
          <p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Viksit Bharat Initiative</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#0E1B3D;">Welcome, ${name}! 👋</h2>
          <p style="color:#555;line-height:1.7;">You've successfully joined <strong>TechTrek</strong> — India's premier student-industry bridge platform.</p>
          <p style="color:#555;line-height:1.7;">Explore upcoming summits, connect with industry leaders, and build your future in tech.</p>
          <a href="http://localhost:3000/events" style="display:inline-block;margin-top:24px;background:#E8831A;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px;">Explore Events →</a>
        </div>
        <div style="padding:24px 40px;border-top:1px solid #eee;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} TechTrek · Empowering India's Next Generation</p>
        </div>
      </div>
    `,
  });
};

/**
 * Send a registration confirmation email with QR code attached
 */
const sendRegistrationEmail = async ({ name, email, eventName, venue, dateTime, qrCodeBase64, status }) => {
  const isWaitlisted = status === 'WAITLISTED';
  const dateStr = new Date(dateTime).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  // Strip "data:image/png;base64," prefix for attachment
  const base64Data = qrCodeBase64.replace(/^data:image\/png;base64,/, '');

  await transporter.sendMail({
    from: `"TechTrek" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: isWaitlisted ? `⏳ Waitlisted: ${eventName}` : `✅ Registered: ${eventName} — Your TechTrek Ticket`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#FAF8F4;border-radius:16px;overflow:hidden;">
        <div style="background:#0E1B3D;padding:40px;text-align:center;">
          <h1 style="color:#E8831A;margin:0;font-size:32px;">TechTrek</h1>
          <p style="color:rgba(255,255,255,0.6);margin:8px 0 0;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Your Event Ticket</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#0E1B3D;">Hi ${name},</h2>
          ${isWaitlisted ? `
            <p style="color:#555;line-height:1.7;">You're on the waitlist for <strong>${eventName}</strong>. We'll notify you if a seat opens up!</p>
          ` : `
            <p style="color:#555;line-height:1.7;">You're registered for <strong>${eventName}</strong>! 🎉</p>
            <table style="width:100%;border-collapse:collapse;margin:24px 0;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;color:#999;font-size:12px;text-transform:uppercase;font-weight:bold;">Event</td><td style="padding:14px 20px;border-bottom:1px solid #eee;color:#0E1B3D;font-weight:bold;">${eventName}</td></tr>
              <tr><td style="padding:14px 20px;border-bottom:1px solid #eee;color:#999;font-size:12px;text-transform:uppercase;font-weight:bold;">Venue</td><td style="padding:14px 20px;border-bottom:1px solid #eee;color:#0E1B3D;">${venue}</td></tr>
              <tr><td style="padding:14px 20px;color:#999;font-size:12px;text-transform:uppercase;font-weight:bold;">Date</td><td style="padding:14px 20px;color:#0E1B3D;">${dateStr}</td></tr>
            </table>
            <div style="text-align:center;margin:32px 0;">
              <p style="color:#555;font-size:14px;font-weight:bold;margin-bottom:12px;">Your Check-In QR Code</p>
              <img src="cid:qr_code" alt="QR Code" style="width:200px;height:200px;border:4px solid #0E1B3D;border-radius:12px;"/>
              <p style="color:#999;font-size:12px;margin-top:12px;">Show this QR at the venue for check-in</p>
            </div>
          `}
        </div>
        <div style="padding:24px 40px;border-top:1px solid #eee;text-align:center;">
          <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} TechTrek · Empowering India's Next Generation</p>
        </div>
      </div>
    `,
    attachments: isWaitlisted ? [] : [
      {
        filename: 'techtrek-ticket-qr.png',
        content: base64Data,
        encoding: 'base64',
        cid: 'qr_code',
      }
    ]
  });
};

module.exports = { sendWelcomeEmail, sendRegistrationEmail };
