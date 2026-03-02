const router = require('express').Router();
const productCtrl = require('../controllers/product.controller');
const memberCtrl = require('../controllers/member.controller');
const bookingCtrl = require('../controllers/booking.controller');
const supportCtrl = require('../controllers/support.controller');
const notificationCtrl = require('../controllers/notification.controller');
const { memberAuth } = require('../middlewares/memberAuth');

router.get('/categories', productCtrl.listCategories);
router.get('/categories/:id/products', productCtrl.listProductsByCategory);
router.get('/products', productCtrl.searchProducts);
router.get('/products/:id', productCtrl.getProduct);
router.post('/members/login',memberAuth, memberCtrl.memberLogin);
router.post('/bookings', memberAuth, bookingCtrl.createBooking);
router.get('/bookings/:id/status', bookingCtrl.getBookingStatus);
router.post('/support', memberAuth ,supportCtrl.createTicket);
router.get('/notifications', memberAuth, notificationCtrl.listUserNotifications);
router.patch('/notifications/:id/read', memberAuth, notificationCtrl.markUserNotificationRead);
router.patch('/notifications/read-all', memberAuth, notificationCtrl.markAllUserNotificationsRead);

module.exports = router;
