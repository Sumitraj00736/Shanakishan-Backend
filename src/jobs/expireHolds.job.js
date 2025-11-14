const cron = require('node-cron');
const Booking = require('../models/Booking');
const Product = require('../models/Product');

const job = cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const expired = await Booking.find({ status: 'pending', holdExpiresAt: { $lte: now } });
    for(const b of expired){
      // decrement reservedUnits
      await Product.findByIdAndUpdate(b.productId, { $inc: { reservedUnits: -(b.quantity || 1) } });
      b.status = 'cancelled';
      b.adminNotes = 'Hold expired - auto cancelled';
      await b.save();
      console.log('Expired hold cancelled', b._id);
    }
  } catch(err) {
    console.error('Expire holds job error', err);
  }
});

module.exports = job;
