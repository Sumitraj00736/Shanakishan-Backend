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
    origin: '*',
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// 1. Specific routes MUST come first
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// 2. Home route MUST use .get and be at the bottom
app.get('/', (req, res) => { res.send('API is running perfectly'); });

// global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// 3. Ensure PORT can be set by cPanel/Passenger
const PORT = process.env.PORT || 3000; 

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    // start cron job
    expireHoldsJob.start();
  })
  .catch(err => { console.error('DB connection error', err); });