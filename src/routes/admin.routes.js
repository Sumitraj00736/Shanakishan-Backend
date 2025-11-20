const router = require('express').Router();
const authCtrl = require('../controllers/auth.controller');
const adminCtrl = require('../controllers/admin.controller');
const categoryCtrl = require('../controllers/category.controller');
const supportCtrl = require('../controllers/support.controller');
const memberCtrl = require('../controllers/member.controller');
const productCtrl = require('../controllers/product.controller');
const { adminAuth } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
// -------- Auth --------
router.post('/auth/login', authCtrl.adminLogin);

// -------- Bookings --------
router.get('/bookings', adminAuth, adminCtrl.listBookings);
router.get('/bookings/:id', adminAuth, adminCtrl.getBooking);
router.post('/bookings/:id/verify-payment', adminAuth, adminCtrl.verifyPayment);
router.post('/bookings/:id/cancel', adminAuth, adminCtrl.cancelBooking);

// -------- Products --------
router.post('/products', adminAuth, upload.array('images', 10), productCtrl.createProduct);
router.put('/products/:id', adminAuth, adminCtrl.updateProduct);
router.delete('/products/:id', adminAuth, adminCtrl.deleteProduct); // optional delete

// -------- Categories --------
router.post('/categories', adminAuth, categoryCtrl.createCategory);
router.put('/categories/:id', adminAuth, categoryCtrl.updateCategory);
router.delete('/categories/:id', adminAuth, categoryCtrl.deleteCategory);
router.get('/categories', categoryCtrl.getAllCategories); // optional admin list

// -------- Members --------
router.get('/members', adminAuth, memberCtrl.listMembers);      // list all
router.get('/members/:id', adminAuth, memberCtrl.getMember);   // get single member
router.post('/members', adminAuth, memberCtrl.createMember);   // create member
router.put('/members/:id', adminAuth, memberCtrl.updateMember); // update member
router.delete('/members/:id', adminAuth, memberCtrl.deleteMember); 

// -------- Support Tickets --------
router.get('/support', adminAuth, supportCtrl.listTickets); // list all tickets
router.put('/support/:id', adminAuth, supportCtrl.updateTicket); // update/resolve

module.exports = router;
