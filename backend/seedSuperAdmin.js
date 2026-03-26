require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const createSuperAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME || 'techtrek' });
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ role: 'superAdmin' });
  if (existing) {
    console.log(`SuperAdmin already exists: ${existing.email}`);
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('SuperAdmin@123', salt);

  await User.create({
    name: 'TechTrek SuperAdmin',
    email: 'superadmin@techtrek.in',
    password: hashedPassword,
    phone: '0000000000',
    college: 'TechTrek HQ',
    year: 'N/A',
    discipline: 'Platform',
    domain: 'techtrek.in',
    role: 'superAdmin',
    isActive: true,
  });

  console.log('✅ SuperAdmin created!');
  console.log('   Email:    superadmin@techtrek.in');
  console.log('   Password: SuperAdmin@123');
  console.log('   ⚠️  Change the password after first login!');
  process.exit(0);
};

createSuperAdmin().catch(err => { console.error(err); process.exit(1); });
