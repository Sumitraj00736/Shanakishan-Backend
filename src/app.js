require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');
const expireHoldsJob = require('./jobs/expireHolds.job');

const app = express();

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length) {
  throw new Error(`Missing required env vars: ${missingEnv.join(", ")}`);
}

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: Boolean(allowedOrigins.length),
  })
);
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST", "PATCH"],
    credentials: Boolean(allowedOrigins.length),
  },
});

io.on("connection", (socket) => {
  const memberId = String(socket.handshake.auth?.memberId || "").trim();
  const guestPhone = String(socket.handshake.auth?.guestPhone || "").trim();
  if (memberId) {
    socket.join(`member:${memberId}`);
  }
  if (guestPhone) {
    socket.join(`guest:${guestPhone}`);
  }
});

app.set("io", io);

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
const HOST = process.env.HOST || "0.0.0.0";

connectDB(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
    });
    // start cron job
    expireHoldsJob.start();
  })
  .catch(err => { console.error('DB connection error', err); });
