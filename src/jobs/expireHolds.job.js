const cron = require('node-cron');
const Booking = require('../models/Booking');
const Product = require('../models/Product');

const job = cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const expired = await Booking.find({ status: 'pending', holdExpiresAt: { $lte: now } });
    for(const b of expired){
      b.status = 'cancelled';
      b.adminNotes = 'Hold expired - auto cancelled';
      await b.save();
      const product = await Product.findById(b.productId);
      if (product) {
        const nextReserved = Math.min((product.reservedUnits || 0) + (b.quantity || 1), product.totalUnits || 0);
        product.reservedUnits = nextReserved;
        product.status = nextReserved === 0 ? 'booked' : 'available';
        await product.save();
      }
      console.log('Expired hold cancelled', b._id);
    }
  } catch(err) {
    console.error('Expire holds job error', err);
  }
});

module.exports = job;
