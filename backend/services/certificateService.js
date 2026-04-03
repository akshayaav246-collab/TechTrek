const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const Registration = require('../models/Registration');
const Event = require('../models/Event');

const generateCertificateInBackground = async (registrationId) => {
  try {
    // Initial fetch to get names and update status
    let registration = await Registration.findById(registrationId)
      .populate('user', 'name')
      .populate('event', 'name dateTime venue');

    if (!registration || !registration.user || !registration.event) {
      throw new Error('Registration, user, or event not found');
    }

    // Update status to generating
    registration.certificate_status = 'generating';
    await registration.save();

    const studentName = registration.user.name;
    const eventName = registration.event.name;
    
    // Format date as "10 April 2026"
    const eventDateObj = new Date(registration.event.dateTime);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const eventDate = `${eventDateObj.getDate()} ${months[eventDateObj.getMonth()]} ${eventDateObj.getFullYear()}`;
    
    const venueName = registration.event.venue || 'No Venue Specified';
    const organizerName = 'Mr.Sendhil Kumar';
    const organizerTitle = 'Managing Director';

    // Load template
    const templatePath = path.join(__dirname, '../templates/certificate.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // String replacements
    html = html.replace(/{{studentName}}/g, studentName);
    html = html.replace(/{{eventName}}/g, eventName);
    html = html.replace(/{{eventDate}}/g, eventDate);
    html = html.replace(/{{venueName}}/g, venueName);
    html = html.replace(/{{organizerName}}/g, organizerName);
    html = html.replace(/{{organizerTitle}}/g, organizerTitle);

    // Ensure certificates directory exists
    const certDir = path.join(__dirname, '../certificates');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    const pdfPathRelativeToBackend = `certificates/${registrationId}.pdf`;
    const finalPdfPath = path.join(__dirname, '..', pdfPathRelativeToBackend);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: finalPdfPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
    });
    
    await browser.close();

    // Update database on success
    registration.certificate_status = 'ready';
    registration.certificate_url = `/${pdfPathRelativeToBackend}`;
    await registration.save();
    
    console.log(`Certificate generated successfully for registration: ${registrationId}`);

  } catch (error) {
    console.error(`Certificate generation failed for registration ${registrationId}:`, error);
    try {
      await Registration.findByIdAndUpdate(registrationId, {
        certificate_status: 'failed'
      });
    } catch (dbError) {
      console.error('Failed to update DB on certificate failure:', dbError);
    }
  }
};

const isCertificateAvailable = async (registrationId) => {
  const registration = await Registration.findById(registrationId).lean();
  
  if (!registration) {
    return 'REGISTRATION_NOT_FOUND';
  }
  
  if (!registration.checkedIn) {
    return 'NOT_CHECKED_IN';
  }
  
  if (!registration.feedback_submitted) {
    return 'FEEDBACK_PENDING';
  }
  
  if (registration.certificate_status === 'failed') {
    return 'GENERATION_FAILED';
  }
  
  if (registration.certificate_status !== 'ready') {
    return 'CERTIFICATE_NOT_READY';
  }
  
  return true;
};

module.exports = {
  generateCertificateInBackground,
  isCertificateAvailable
};
