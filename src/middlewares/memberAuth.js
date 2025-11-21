const jwt = require("jsonwebtoken");

exports.memberAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    req.member = null; 
    console.log("No auth token provided, treating as guest");

    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.member = decoded;
    console.log("Authenticated Member ID:", req.member.memberId);
    next();
  } catch (err) {
    req.member = null; 
    console.log("Invalid auth token, treating as guest");
    next();
  }
};
