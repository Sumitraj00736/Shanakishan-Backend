const mongoose = require('mongoose');

const SupportSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: false },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String},
  message: { type: String, required: true },
  memberId: String,
  adminMessage: { type: String, default: ""},
  status: { type: String, enum: ['pending','in-progress','resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Support', SupportSchema);
