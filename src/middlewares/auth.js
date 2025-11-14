const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.adminAuth = async (req,res,next) => {
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({ message: 'Missing token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.id);
    if(!admin) return res.status(401).json({ message: 'Invalid token' });
    req.admin = { id: admin._id, username: admin.username, role: admin.role };
    next();
  } catch(err){
    return res.status(401).json({ message: 'Invalid token' });
  }
};
