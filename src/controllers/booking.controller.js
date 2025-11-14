const Booking = require('../models/Booking');
const Product = require('../models/Product');
const Member = require('../models/Member');
const mongoose = require('mongoose');

const HOLD_MINUTES = parseInt(process.env.HOLD_MINUTES || '15');

function datesOverlap(aStart, aEnd, bStart, bEnd){
  return (aStart <= bEnd && bStart <= aEnd);
}

// helper to compute reserved units for a product in date-range
async function sumReservedForRange(productId, startDate, endDate){
  const bookings = await Booking.find({
    productId,
    status: { $in: ['pending','confirmed'] },
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $lte: endDate, $gte: startDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  });
  let sum = 0;
  for(const b of bookings) sum += (b.quantity || 1);
  return sum;
}

// Create booking: atomic reservation by updating product.reservedUnits with condition
exports.createBooking = async (req,res) => {
  const { productId, quantity=1, startDate, endDate, userName, userPhone, userEmail, memberId } = req.body;
  if(!productId || !startDate || !endDate || !userName || !userPhone) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sDate = new Date(startDate);
  const eDate = new Date(endDate);
  if(sDate > eDate) return res.status(400).json({ message: 'startDate must be <= endDate' });

  // load product
  const product = await Product.findById(productId);
  if(!product) return res.status(404).json({ message: 'Product not found' });

  // compute available units for the date range using prior bookings
  const alreadyReserved = await sumReservedForRange(productId, sDate, eDate);
  const effectiveAvailable = product.totalUnits - product.maintenanceUnits - alreadyReserved - product.reservedUnits;
  if(effectiveAvailable < quantity) return res.status(400).json({ message: 'Not enough units available for selected dates' });

  // compute price (member or non-member)
  let pricePerUnit = product.basePrice;
  if(memberId){
    const member = await Member.findOne({ memberId });
    if(member && member.status === 'active' && (!member.validUntil || member.validUntil > new Date())){
      pricePerUnit = product.memberPrice || product.basePrice;
    }
  }

  // Atomic update: increment product.reservedUnits by quantity only if there's capacity left
  const updated = await Product.findOneAndUpdate(
    { _id: productId, $expr: { $lte: [ { $add: ['$reservedUnits', quantity] }, { $subtract: ['$totalUnits', '$maintenanceUnits'] } ] } },
    { $inc: { reservedUnits: quantity } },
    { new: true }
  );

  if(!updated) {
    return res.status(409).json({ message: 'Could not reserve units (concurrent limit reached). Try again.' });
  }

  // Create booking record (pending) with holdExpiresAt
  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const totalAmount = pricePerUnit * quantity; // extend for deposit or days calculation as needed
  const booking = await Booking.create({
    productId,
    productSnapshot: { name: product.name, basePrice: product.basePrice, memberPrice: product.memberPrice },
    userName, userPhone, userEmail, memberId,
    pricePerUnit, quantity,
    startDate: sDate, endDate: eDate,
    totalAmount,
    status: 'pending',
    holdExpiresAt
  });

  res.status(201).json({
    bookingId: booking._id,
    status: booking.status,
    holdExpiresAt,
    pricePerUnit, quantity, totalAmount,
    message: `Booking held for ${HOLD_MINUTES} minutes. Admin will verify offline payment to confirm.`
  });
};

// public endpoint to check status
exports.getBookingStatus = async (req,res) => {
  const booking = await Booking.findById(req.params.id);
  if(!booking) return res.status(404).json({ message: 'Not found' });
  res.json({ status: booking.status, holdExpiresAt: booking.holdExpiresAt, payment: booking.payment });
};
