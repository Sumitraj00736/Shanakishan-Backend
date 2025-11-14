const Booking = require('../models/Booking');
const Product = require('../models/Product');

exports.listBookings = async (req,res) => {
  const { status, from, to, q } = req.query;
  const filter = {};
  if(status) filter.status = status;
  if(from || to) filter.createdAt = {};
  if(from) filter.createdAt.$gte = new Date(from);
  if(to) filter.createdAt.$lte = new Date(to);
  if(q) filter.$or = [{ userName: {$regex:q,$options:'i'} }, { userPhone: {$regex:q,$options:'i'} }];

  const bookings = await Booking.find(filter).sort('-createdAt').limit(500);
  res.json(bookings);
};

exports.getBooking = async (req,res) => {
  const booking = await Booking.findById(req.params.id);
  if(!booking) return res.status(404).json({ message: 'Not found' });
  res.json(booking);
};

exports.verifyPayment = async (req,res) => {
  const { id } = req.params;
  const { method='cash', amount } = req.body;
  const booking = await Booking.findById(id);
  if(!booking) return res.status(404).json({ message: 'Booking not found' });
  if(booking.status !== 'pending') return res.status(400).json({ message: 'Only pending bookings can be verified' });

  booking.payment = { method, amount: amount || booking.totalAmount, verifiedBy: req.admin.username, verifiedAt: new Date() };
  booking.status = 'confirmed';
  await booking.save();

  // booking confirmed → keep reservedUnits as-is (already reserved on creation). Optionally move units from reservedUnits to confirmedUnits if you track both.
  res.json({ message: 'Payment verified and booking confirmed', bookingId: booking._id });
};

exports.cancelBooking = async (req,res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const booking = await Booking.findById(id);
  if(!booking) return res.status(404).json({ message: 'Booking not found' });
  if(booking.status === 'cancelled') return res.json({ message: 'Already cancelled' });

  // decrement reservedUnits on product
  await Product.findByIdAndUpdate(booking.productId, { $inc: { reservedUnits: -(booking.quantity || 1) } });

  booking.status = 'cancelled';
  booking.adminNotes = reason || 'Cancelled by admin';
  await booking.save();
  res.json({ message: 'Booking cancelled' });
};

// product create/update
exports.createProduct = async (req,res) => {
  const { name, totalUnits, basePrice, memberPrice } = req.body;
  const p = await Product.create({ name, totalUnits, basePrice, memberPrice });
  res.status(201).json(p);
};
exports.updateProduct = async (req,res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(p);
};

exports.listMembers = async (req,res) => {
  const Member = require('../models/Member');
  const m = await Member.find().limit(500);
  res.json(m);
};


exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.deleteOne(); // ✅ use deleteOne instead of remove
    return res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


