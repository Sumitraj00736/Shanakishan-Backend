const mongoose = require('mongoose');
const MemberSchema = new mongoose.Schema({
  memberId: { type: String, unique: true, required: true },
  name: String,
  phone: String,
  email: String,
  status: { type: String, enum: ['active','suspended','expired'], default: 'active' },
  validUntil: Date,
  discountPercent: { type: Number, default: 0 }
},{ timestamps:true });
module.exports = mongoose.model('Member', MemberSchema);
