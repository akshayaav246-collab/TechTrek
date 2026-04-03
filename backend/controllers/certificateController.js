const path = require('path');
const fs = require('fs');
const Registration = require('../models/Registration');
const { isCertificateAvailable } = require('../services/certificateService');

const downloadCertificate = async (req, res) => {
  try {
    const { registrationId } = req.params;
    
    // Auth Check
    const registration = await Registration.findById(registrationId).populate('user', 'name');
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    
    // Only the student (or admin) can download
    if (registration.user._id.toString() !== req.user._id.toString() && req.user.role === 'student') {
      return res.status(403).json({ message: 'Not authorized to download this certificate' });
    }

    const availableCheck = await isCertificateAvailable(registrationId);
    if (availableCheck !== true) {
      return res.status(403).json({ message: 'Certificate is not available', reason: availableCheck });
    }

    const studentName = registration.user.name.replace(/\s+/g, '_');
    const pdfPathRelativeToBackend = registration.certificate_url.replace(/^\//, ''); // remove leading slash if any
    const absolutePath = path.join(__dirname, '..', pdfPathRelativeToBackend);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Certificate file not found on server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="GKT-Certificate-${studentName}.pdf"`);
    
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving certificate:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  downloadCertificate
};
