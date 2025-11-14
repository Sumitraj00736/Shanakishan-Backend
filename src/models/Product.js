const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: String,
  images: [String],
  totalUnits: { type: Number, default: 1 },        // physical count
  maintenanceUnits: { type: Number, default: 0 },   // temporarily unavailable
  reservedUnits: { type: Number, default: 0 },      // units reserved (pending or confirmed)
  basePrice: { type: Number, required: true },     // non-member price
  memberPrice: { type: Number },                    // member price
  refundableDeposit: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
