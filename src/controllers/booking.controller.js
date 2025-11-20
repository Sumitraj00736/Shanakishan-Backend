const Booking = require("../models/Booking");
const Product = require("../models/Product");
const Member = require("../models/Member");
const mongoose = require("mongoose");

const HOLD_MINUTES = parseInt(process.env.HOLD_MINUTES || "15");

function datesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

// helper to compute reserved units for a product in date-range
async function sumReservedForRange(productId, startDate, endDate) {
  const bookings = await Booking.find({
    productId,
    status: { $in: ["pending", "confirmed"] },
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $lte: endDate, $gte: startDate } },
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
    ],
  });
  let sum = 0;
  for (const b of bookings) sum += b.quantity || 1;
  return sum;
}

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
    if (!product || !product.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found or inactive" });
    }

    const start = new Date(startDateTime);
    console.log("start:", start);
    const end = new Date(endDateTime);
    console.log("end:", end);
    if (end <= start) {
      console.log("Invalid date range: end is before or equal to start");
      console.log("start:", start, "end:", end);
      return res
        .status(400)
        .json({ success: false, message: "End time must be after start time" });
    }

    // -------- 3. Check overlapping bookings --------
    const overlappingBookings = await Booking.aggregate([
      {
        $match: {
          productId: product._id,
          status: { $in: ["pending", "confirmed"] },
          $or: [
            { startDateTime: { $lt: end }, endDateTime: { $gt: start } }, // overlap condition
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalReserved: { $sum: "$quantity" },
        },
      },
    ]);

    const reservedUnitsDuringRequestedTime =
      overlappingBookings[0]?.totalReserved || 0;
    const availableUnits =
      product.totalUnits -
      product.maintenanceUnits -
      reservedUnitsDuringRequestedTime;

    if (availableUnits < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableUnits} unit(s) available for the selected time`,
      });
    }

    // -------- 4. Calculate price per hour and total rent --------
    // -------- 4. Calculate price per hour and total rent --------
    let diffHours = (end - start) / (1000 * 60 * 60); // actual hours, can be fractional
    if (diffHours < 1) diffHours = 1; // minimum booking 1 hour
    console.log("diffHours:", diffHours);

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

    const totalRent = pricePerHour * diffHours * quantity; // can now include fractional hours

    if (!totalRent || totalRent <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Total rent calculation failed" });
    }

    // -------- 5. Create Booking --------
    const booking = await Booking.create({
      productId,
      quantity,
      startDateTime: start,
      endDateTime: end,
      hours: diffHours,
      pricePerHour,
      totalRent,
      userName,
      userPhone,
      userEmail,
      memberId,
      refundableDeposit: product.refundableDeposit,
      status: "pending", // admin can confirm payment if needed
    });

    // -------- 6. Response --------
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
