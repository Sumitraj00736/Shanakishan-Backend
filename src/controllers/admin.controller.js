const Booking = require("../models/Booking");
const Product = require("../models/Product");
const cloudinary = require("../config/cloudinary");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");
const { buildBookingsCsv } = require("../utils/csv");
const { createNotification, sanitizeNotification } = require("../utils/notification");

function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "products" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
}

function parseStatus(statusParam) {
  if (!statusParam) return null;
  return statusParam
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function parseDateRange(from, to) {
  const range = {};
  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime())) range.$gte = fromDate;
  }
  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) range.$lte = toDate;
  }
  return Object.keys(range).length ? range : null;
}

function buildBookingFilter(query) {
  const { status, from, to, q } = query;
  const filter = {};

  const statuses = parseStatus(status);
  if (statuses?.length) filter.status = { $in: statuses };

  const createdAt = parseDateRange(from, to);
  if (createdAt) filter.createdAt = createdAt;

  if (q) {
    filter.$or = [
      { userName: { $regex: q, $options: "i" } },
      { userPhone: { $regex: q, $options: "i" } },
      { userEmail: { $regex: q, $options: "i" } },
      { memberId: { $regex: q, $options: "i" } },
    ];
  }

  return filter;
}

function bookingAmount(booking) {
  return Number(booking.totalRent || booking.totalAmount || booking.payment?.amount || 0);
}

exports.listBookings = async (req, res) => {
  const filter = buildBookingFilter(req.query);
  const bookings = await Booking.find(filter).sort("-createdAt").limit(1000).lean();
  res.json(bookings);
};

exports.getBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Not found" });
  res.json(booking);
};

exports.verifyPayment = async (req, res) => {
  const { id } = req.params;
  const { method = "cash", amount } = req.body;
  const booking = await Booking.findById(id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (booking.status !== "pending") {
    return res.status(400).json({ message: "Only pending bookings can be verified" });
  }

  const payableAmount = Number(amount || booking.totalRent || booking.totalAmount || 0);
  booking.payment = {
    method,
    amount: payableAmount,
    verifiedBy: req.admin.username,
    verifiedAt: new Date(),
  };
  booking.status = "confirmed";
  if (!booking.totalRent && booking.totalAmount) booking.totalRent = booking.totalAmount;
  if (!booking.totalAmount && booking.totalRent) booking.totalAmount = booking.totalRent;
  await booking.save();
  const bookedProduct = await Product.findById(booking.productId).lean();
  const bookingDetails = {
    booking,
    product: bookedProduct ? { _id: bookedProduct._id, name: bookedProduct.name } : null,
  };
  const io = req.app.get("io");
  if (io) {
    io.emit("booking:updated", { booking });
    const payload = {
      bookingId: booking._id,
      message: `Booking confirmed for ${booking.userName || booking.userPhone || "user"}`,
      status: booking.status,
      booking,
    };
    const adminNotification = await createNotification({
      audienceType: "admin",
      type: "booking",
      event: "confirmed",
      title: "Booking Confirmed",
      message: payload.message,
      status: booking.status,
      data: bookingDetails,
    });
    io.emit("admin:booking-notification", {
      ...payload,
      notification: sanitizeNotification(adminNotification),
    });
    if (booking.memberId) {
      const memberNotification = await createNotification({
        audienceType: "member",
        memberId: booking.memberId,
        type: "booking",
        event: "confirmed",
        title: "Booking Confirmed",
        message: payload.message,
        status: booking.status,
        data: bookingDetails,
      });
      io.to(`member:${booking.memberId}`).emit("member:booking-confirmed", payload);
      io.to(`member:${booking.memberId}`).emit("user:booking-notification", {
        ...payload,
        notification: sanitizeNotification(memberNotification),
      });
    }
    if (booking.userPhone) {
      const guestNotification = await createNotification({
        audienceType: "guest",
        guestPhone: booking.userPhone,
        type: "booking",
        event: "confirmed",
        title: "Booking Confirmed",
        message: payload.message,
        status: booking.status,
        data: bookingDetails,
      });
      io.to(`guest:${booking.userPhone}`).emit("user:booking-notification", {
        ...payload,
        notification: sanitizeNotification(guestNotification),
      });
    }
  }

  res.json({ message: "Payment verified and booking confirmed", bookingId: booking._id });
};

exports.cancelBooking = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.status === "cancelled") {
      return res.json({ success: true, message: "Booking is already cancelled" });
    }

    booking.status = "cancelled";
    booking.adminNotes = reason || "Cancelled by admin";
    await booking.save();

    const product = await Product.findById(booking.productId);
    if (product) {
      const nextReserved = Math.min((product.reservedUnits || 0) + (booking.quantity || 1), product.totalUnits || 0);
      product.reservedUnits = nextReserved;
      product.status = nextReserved === 0 ? "booked" : "available";
      await product.save();
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("booking:updated", { booking });
      const payload = {
        bookingId: booking._id,
        message: `Booking cancelled for ${booking.userName || booking.userPhone || "user"}`,
        status: booking.status,
        booking,
      };
      const details = {
        booking,
        product: product ? { _id: product._id, name: product.name } : null,
      };
      const adminNotification = await createNotification({
        audienceType: "admin",
        type: "booking",
        event: "cancelled",
        title: "Booking Cancelled",
        message: payload.message,
        status: booking.status,
        data: details,
      });
      io.emit("admin:booking-notification", {
        ...payload,
        notification: sanitizeNotification(adminNotification),
      });
      if (booking.memberId) {
        const memberNotification = await createNotification({
          audienceType: "member",
          memberId: booking.memberId,
          type: "booking",
          event: "cancelled",
          title: "Booking Cancelled",
          message: payload.message,
          status: booking.status,
          data: details,
        });
        io.to(`member:${booking.memberId}`).emit("user:booking-notification", {
          ...payload,
          notification: sanitizeNotification(memberNotification),
        });
      }
      if (booking.userPhone) {
        const guestNotification = await createNotification({
          audienceType: "guest",
          guestPhone: booking.userPhone,
          type: "booking",
          event: "cancelled",
          title: "Booking Cancelled",
          message: payload.message,
          status: booking.status,
          data: details,
        });
        io.to(`guest:${booking.userPhone}`).emit("user:booking-notification", {
          ...payload,
          notification: sanitizeNotification(guestNotification),
        });
      }
      io.emit("product:updated", {
        productId: product?._id || booking.productId,
        reservedUnits: product?.reservedUnits,
        totalUnits: product?.totalUnits,
        status: product?.status,
      });
    }

    res.json({ success: true, message: "Booking cancelled successfully", booking });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  const { name, totalUnits, basePrice, memberPrice } = req.body;
  const p = await Product.create({ name, totalUnits, basePrice, memberPrice });
  res.status(201).json(p);
};

exports.updateProduct = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (req.files?.length) {
      const uploadResults = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer))
      );
      payload.images = uploadResults.map((result) => result.secure_url);
    }

    if (payload.totalUnits !== undefined) {
      payload.totalUnits = Number(payload.totalUnits);
    }

    if (payload.reservedUnits !== undefined) {
      payload.reservedUnits = Number(payload.reservedUnits);
    } else if (payload.totalUnits !== undefined) {
      payload.reservedUnits = Number(payload.totalUnits);
    }

    if (payload.basePrice !== undefined) {
      payload.basePrice = Number(payload.basePrice);
    }

    if (payload.memberPrice !== undefined && payload.memberPrice !== "") {
      payload.memberPrice = Number(payload.memberPrice);
    }

    if (payload.memberPrice === "") {
      payload.memberPrice = null;
    }

    if (payload.reservedUnits !== undefined) {
      payload.status = Number(payload.reservedUnits) <= 0 ? "booked" : "available";
    }

    const p = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.json(p);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.listMembers = async (req, res) => {
  const Member = require("../models/Member");
  const m = await Member.find().limit(500);
  res.json(m);
};

exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.deleteOne();
    return res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.analyticsOverview = async (req, res) => {
  const filter = buildBookingFilter(req.query);
  const bookings = await Booking.find(filter).sort("createdAt").lean();

  const summary = {
    totalBookings: bookings.length,
    confirmedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    totalSales: 0,
  };

  const byDay = new Map();
  const byStatus = {};
  const byProduct = new Map();

  bookings.forEach((booking) => {
    const status = booking.status || "unknown";
    const amount = bookingAmount(booking);
    const day = new Date(booking.createdAt).toISOString().slice(0, 10);

    byStatus[status] = (byStatus[status] || 0) + 1;

    if (!byDay.has(day)) byDay.set(day, { date: day, bookings: 0, sales: 0 });
    const dayEntry = byDay.get(day);
    dayEntry.bookings += 1;
    if (status === "confirmed" || status === "completed") dayEntry.sales += amount;

    const productKey = String(booking.productId || "unknown");
    const productEntry = byProduct.get(productKey) || { productId: productKey, bookings: 0, sales: 0 };
    productEntry.bookings += 1;
    if (status === "confirmed" || status === "completed") productEntry.sales += amount;
    byProduct.set(productKey, productEntry);

    if (status === "confirmed" || status === "completed") {
      summary.confirmedBookings += 1;
      summary.totalSales += amount;
    } else if (status === "cancelled") {
      summary.cancelledBookings += 1;
    } else if (status === "pending") {
      summary.pendingBookings += 1;
    }
  });

  const productIds = Array.from(byProduct.keys()).filter((id) => id !== "unknown");
  const products = await Product.find({ _id: { $in: productIds } }, { _id: 1, name: 1, categoryId: 1 }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const topProducts = Array.from(byProduct.values())
    .map((p) => ({
      ...p,
      name: productMap.get(p.productId)?.name || "Unknown Product",
      categoryId: productMap.get(p.productId)?.categoryId || null,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const categoryBreakdownMap = new Map();
  topProducts.forEach((product) => {
    const key = String(product.categoryId || "uncategorized");
    const current = categoryBreakdownMap.get(key) || { categoryId: key, bookings: 0, sales: 0 };
    current.bookings += product.bookings;
    current.sales += product.sales;
    categoryBreakdownMap.set(key, current);
  });

  res.json({
    summary,
    series: Array.from(byDay.values()),
    breakdowns: {
      byStatus,
      byCategory: Array.from(categoryBreakdownMap.values()),
      topProducts,
    },
  });
};

exports.downloadBookingsCsv = async (req, res) => {
  const filter = buildBookingFilter(req.query);
  const bookings = await Booking.find(filter).sort("-createdAt").lean();
  const csv = buildBookingsCsv(bookings);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="bookings-report-${timestamp}.csv"`);
  res.status(200).send(csv);
};

exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    const admin = await Admin.findById(req.admin.id);
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    await booking.deleteOne();
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.deleteBookings = async (req, res) => {
  const { ids, password } = req.body;

  try {
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No booking IDs provided" });
    }

    const admin = await Admin.findById(req.admin.id);
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    await Booking.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: "Bookings deleted successfully" });
  } catch (error) {
    console.error("Error deleting bookings:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
