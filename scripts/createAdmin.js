
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('../src/models/Admin');
const connectDB = require('../src/config/db');

(async () => {
  await connectDB(process.env.MONGO_URI);
  const pwHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  const exists = await Admin.findOne({ username: process.env.ADMIN_USERNAME || 'admin' });
  if(!exists) {
    const a = await Admin.create({ username: process.env.ADMIN_USERNAME || 'admin', passwordHash: pwHash, name: 'Super Admin', role: 'superadmin' });
    console.log('Created admin', a.username);
  } else console.log('Admin exists');
  process.exit(0);
})();
