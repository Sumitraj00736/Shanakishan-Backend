const router = require('express').Router();
const productCtrl = require('../controllers/product.controller');
const memberCtrl = require('../controllers/member.controller');
const bookingCtrl = require('../controllers/booking.controller');
const supportCtrl = require('../controllers/support.controller');

router.get('/categories', productCtrl.listCategories);
router.get('/categories/:id/products', productCtrl.listProductsByCategory);
router.get('/products', productCtrl.searchProducts);
router.get('/products/:id', productCtrl.getProduct);
router.post('/members/verify', memberCtrl.verifyMember);
router.post('/bookings', bookingCtrl.createBooking);
router.get('/bookings/:id/status', bookingCtrl.getBookingStatus);
// router.post('/support', supportCtrl.createTicket);

module.exports = router;
