require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');
const expireHoldsJob = require('./jobs/expireHolds.job');

const app = express();
app.use(
  cors({
    origin: ["https://sanakishandash.netlify.app", "http://localhost:5173", "http://192.168.1.29:5173"],
    
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // if using cookies
  })
);app.use(express.json());

// routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    // start cron job
    expireHoldsJob.start();
  })
  .catch(err => { console.error('DB connection error', err); });
