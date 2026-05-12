const router = require('express').Router();
const authCtrl = require('../controllers/auth.controller');
const adminCtrl = require('../controllers/admin.controller');
const categoryCtrl = require('../controllers/category.controller');
const supportCtrl = require('../controllers/support.controller');
const memberCtrl = require('../controllers/member.controller');
const productCtrl = require('../controllers/product.controller');
const notificationCtrl = require('../controllers/notification.controller');
const { adminAuth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
// -------- Auth --------
router.post('/auth/login', authCtrl.adminLogin);

// -------- Bookings --------
router.get('/bookings', adminAuth, adminCtrl.listBookings);
router.get('/bookings/:id', adminAuth, adminCtrl.getBooking);
router.post('/bookings/:id/verify-payment', adminAuth, adminCtrl.verifyPayment);
router.post('/bookings/:id/cancel', adminAuth, adminCtrl.cancelBooking);
router.delete('/bookings/:id', adminAuth, adminCtrl.deleteBooking);
router.delete('/bookings', adminAuth, adminCtrl.deleteBookings);
router.get('/analytics/overview', adminAuth, adminCtrl.analyticsOverview);
router.get('/reports/bookings.csv', adminAuth, adminCtrl.downloadBookingsCsv);

// -------- Products --------
router.post('/products', adminAuth, upload.array('images', 10), productCtrl.createProduct);
router.put('/products/:id', adminAuth, upload.array('images', 10), adminCtrl.updateProduct);
router.get('/products/category/:id',adminAuth, productCtrl.listProductsByCategory)
router.delete('/products/:id', adminAuth, adminCtrl.deleteProduct);


// -------- Categories --------
router.post('/categories', adminAuth, categoryCtrl.createCategory);
router.put('/categories/:id', adminAuth, categoryCtrl.updateCategory);
router.delete('/categories/:id', adminAuth, categoryCtrl.deleteCategory);
router.get('/categories', categoryCtrl.getAllCategories); 

// -------- Members --------
router.get('/members', adminAuth, memberCtrl.listMembers);     
router.get('/members/:id', adminAuth, memberCtrl.getMember); 
router.post('/members', adminAuth, memberCtrl.createMember);   
router.put('/members/:id', adminAuth, memberCtrl.updateMember); 
router.delete('/members/:id', adminAuth, memberCtrl.deleteMember);

// -------- Support Tickets --------
router.get('/support', adminAuth, supportCtrl.listTickets);
router.put('/support/:id', adminAuth, supportCtrl.updateTicket); 
router.delete('/support/:id', adminAuth, supportCtrl.deleteTicket);
router.delete('/support', adminAuth, supportCtrl.deleteTickets);

// -------- Notifications --------
router.get("/notifications", adminAuth, notificationCtrl.listAdminNotifications);
router.patch("/notifications/:id/read", adminAuth, notificationCtrl.markAdminNotificationRead);
router.patch("/notifications/read-all", adminAuth, notificationCtrl.markAllAdminNotificationsRead);

module.exports = router;
