const Booking = require("../models/Booking");
const Product = require("../models/Product");
const { createNotification, sanitizeNotification } = require("../utils/notification");

const HOLD_MINUTES = parseInt(process.env.HOLD_MINUTES || "15", 10);

// Create booking: atomic reservation by updating product.reservedUnits with condition
exports.createBooking = async (req, res) => {
  try {
    const {
      productId,
      quantity,
      startDateTime,
      endDateTime,
      userName,
      userPhone,
      userEmail,
    } = req.body;

    // Logged-in member (if any)
    const memberId = req.member ? req.member.memberId : null;

    // -------- 1. Validate required fields --------
    if (!productId || !quantity || !startDateTime || !endDateTime) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    if (!userName || !userPhone) {
      return res
        .status(400)
        .json({ success: false, message: "User details required" });
    }

    // -------- 2. Find Product --------
    const product = await Product.findById(productId);
    if (!product || !product.isActive || product.status === "booked") {
      return res
        .status(404)
        .json({ success: false, message: "Currently not available" });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: "Invalid quantity" });
    }

    if (product.reservedUnits < qty) {
      return res.status(400).json({
        success: false,
        message: "Currently not available",
      });
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (end <= start) {
      return res
        .status(400)
        .json({ success: false, message: "End time must be after start time" });
    }

    // -------- 3. Calculate price per hour and total rent --------
    let diffHours = (end - start) / (1000 * 60 * 60); 
    if (diffHours < 1) diffHours = 1; 
    const pricePerHour =
      memberId && product.memberPrice ? product.memberPrice : product.basePrice;

    if (!pricePerHour || pricePerHour <= 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Price per hour is missing for this product",
        });
    }

    const totalRent = pricePerHour * diffHours * qty;

    if (!totalRent || totalRent <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Total rent calculation failed" });
    }

    const nextReservedUnits = Math.max((product.reservedUnits || 0) - qty, 0);
    product.reservedUnits = nextReservedUnits;
    product.status = nextReservedUnits === 0 ? "booked" : "available";
    await product.save();

    // -------- 4. Create Booking --------
    const booking = await Booking.create({
      productId,
      quantity: qty,
      startDateTime: start,
      endDateTime: end,
      hours: diffHours,
      pricePerHour,
      totalRent,
      totalAmount: totalRent, // backward compatibility for older consumers
      userName,
      userPhone,
      userEmail,
      memberId,
      refundableDeposit: product.refundableDeposit,
      status: "pending", // admin can confirm payment if needed
      holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("booking:created", { booking });
      io.emit("product:updated", {
        productId: product._id,
        reservedUnits: product.reservedUnits,
        totalUnits: product.totalUnits,
        status: product.status,
      });
      const adminNotification = await createNotification({
        audienceType: "admin",
        type: "booking",
        event: "created",
        title: "New Booking",
        message: `New booking by ${booking.userName || booking.userPhone || "user"}`,
        status: booking.status,
        data: {
          booking,
          product: {
            _id: product._id,
            name: product.name,
          },
        },
      });
      io.emit("admin:booking-notification", {
        bookingId: booking._id,
        status: booking.status,
        message: `New booking by ${booking.userName || booking.userPhone || "user"}`,
        booking,
        notification: sanitizeNotification(adminNotification),
      });
      const payload = {
        bookingId: booking._id,
        message: `You booked ${product.name}`,
        status: booking.status,
        booking,
      };
      const detailData = {
        booking,
        product: {
          _id: product._id,
          name: product.name,
        },
      };
      if (booking.memberId) {
        const notification = await createNotification({
          audienceType: "member",
          memberId: booking.memberId,
          type: "booking",
          event: "booked",
          title: "Booking Placed",
          message: `You booked ${product.name}. Status: ${booking.status}`,
          status: booking.status,
          data: detailData,
        });
        io.to(`member:${booking.memberId}`).emit("user:booking-notification", {
          ...payload,
          notification: sanitizeNotification(notification),
        });
      }
      if (booking.userPhone) {
        const notification = await createNotification({
          audienceType: "guest",
          guestPhone: booking.userPhone,
          type: "booking",
          event: "booked",
          title: "Booking Placed",
          message: `You booked ${product.name}. Status: ${booking.status}`,
          status: booking.status,
          data: detailData,
        });
        io.to(`guest:${booking.userPhone}`).emit("user:booking-notification", {
          ...payload,
          notification: sanitizeNotification(notification),
        });
      }
    }

    // -------- 5. Response --------
    return res.json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (err) {
    console.error("Error creating booking:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// public endpoint to check status
exports.getBookingStatus = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Not found" });
  res.json({
    status: booking.status,
    holdExpiresAt: booking.holdExpiresAt,
    payment: booking.payment,
  });
};
