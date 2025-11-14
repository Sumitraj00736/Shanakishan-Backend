const mongoose = require('mongoose');
const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
  name: String,
  role: { type: String, default: 'manager' }
},{ timestamps:true });
module.exports = mongoose.model('Admin', AdminSchema);
