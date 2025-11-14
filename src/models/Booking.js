const mongoose = require('mongoose');
const BookingSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productSnapshot: Object,
  userName: String,
  userPhone: String,
  userEmail: String,
  memberId: String,
  pricePerUnit: Number,
  quantity: { type: Number, default: 1 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalAmount: Number,
  depositAmount: Number,
  status: { type: String, enum: ['pending','confirmed','cancelled','completed'], default: 'pending' },
  holdExpiresAt: Date,
  payment: {
    method: String,
    amount: Number,
    verifiedBy: String,
    verifiedAt: Date,
    notes: String
  },
  adminNotes: String
},{ timestamps:true });

module.exports = mongoose.model('Booking', BookingSchema);
