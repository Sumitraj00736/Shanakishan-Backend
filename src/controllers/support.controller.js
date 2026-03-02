const Support = require('../models/SupportTicket');
const { createNotification, sanitizeNotification } = require("../utils/notification");
// List all support tickets
exports.listTickets = async (req,res) => {
  const tickets = await Support.find().sort('-createdAt');
  res.json(tickets);
};

//create ticket 
exports.createTicket = async (req, res) => {
  try {
    const { bookingId, name, phone, email, message } = req.body;

    if (!name || !phone || !message) {
      return res
        .status(400)
        .json({ message: "All fields except bookingId are required" });
    }

    // Auto-fetch memberId if the user is logged in as a member
    // req.member should be set by your authentication middleware
    const memberId = req.member ? req.member.memberId : null;

    // Create support ticket
    const ticket = await Support.create({
      bookingId: bookingId || null,
      name,
      phone,
      email,
      message,
      memberId,          
      status: "pending",
      adminMessage: "",   // Optional: initialize adminMessage
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("support:created", { ticket });
      const adminNotification = await createNotification({
        audienceType: "admin",
        type: "support",
        event: "created",
        title: "New Support Ticket",
        message: `New support ticket from ${ticket.name}`,
        status: ticket.status,
        data: { ticket },
      });
      io.emit("admin:support-notification", {
        message: `New support ticket from ${ticket.name}`,
        status: ticket.status,
        ticket,
        notification: sanitizeNotification(adminNotification),
      });
      const payload = {
        message: "Support ticket submitted",
        status: ticket.status,
        ticket,
      };
      if (ticket.memberId) {
        const memberNotification = await createNotification({
          audienceType: "member",
          memberId: ticket.memberId,
          type: "support",
          event: "created",
          title: "Support Ticket Submitted",
          message: payload.message,
          status: ticket.status,
          data: { ticket },
        });
        io.to(`member:${ticket.memberId}`).emit("user:support-notification", {
          ...payload,
          notification: sanitizeNotification(memberNotification),
        });
      }
      if (ticket.phone) {
        const guestNotification = await createNotification({
          audienceType: "guest",
          guestPhone: ticket.phone,
          type: "support",
          event: "created",
          title: "Support Ticket Submitted",
          message: payload.message,
          status: ticket.status,
          data: { ticket },
        });
        io.to(`guest:${ticket.phone}`).emit("user:support-notification", {
          ...payload,
          notification: sanitizeNotification(guestNotification),
        });
      }
    }

    res.status(201).json({
      message: "Support ticket created",
      ticket,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



// Update resolve a ticket
exports.updateTicket = async (req,res) => {
  const { id } = req.params;
  const { status, adminMessage } = req.body;
  console.log("message ", status, adminMessage)

  const ticket = await Support.findById(id);
  if(!ticket) return res.status(404).json({ message: 'Ticket not found' });

  ticket.status = status || ticket.status;
  ticket.adminMessage = adminMessage || ticket.adminMessage;
  await ticket.save();

  const io = req.app.get("io");
  if (io) {
    io.emit("support:updated", { ticket });
    const adminNotification = await createNotification({
      audienceType: "admin",
      type: "support",
      event: "updated",
      title: "Support Ticket Updated",
      message: `Support ticket updated (${ticket.status})`,
      status: ticket.status,
      data: { ticket },
    });
    io.emit("admin:support-notification", {
      message: `Support ticket updated (${ticket.status})`,
      status: ticket.status,
      ticket,
      notification: sanitizeNotification(adminNotification),
    });
    const payload = {
      message: `Support status updated to ${ticket.status}`,
      status: ticket.status,
      ticket,
    };
    if (ticket.memberId) {
      const memberNotification = await createNotification({
        audienceType: "member",
        memberId: ticket.memberId,
        type: "support",
        event: "updated",
        title: "Support Ticket Updated",
        message: payload.message,
        status: ticket.status,
        data: { ticket },
      });
      io.to(`member:${ticket.memberId}`).emit("user:support-notification", {
        ...payload,
        notification: sanitizeNotification(memberNotification),
      });
    }
    if (ticket.phone) {
      const guestNotification = await createNotification({
        audienceType: "guest",
        guestPhone: ticket.phone,
        type: "support",
        event: "updated",
        title: "Support Ticket Updated",
        message: payload.message,
        status: ticket.status,
        data: { ticket },
      });
      io.to(`guest:${ticket.phone}`).emit("user:support-notification", {
        ...payload,
        notification: sanitizeNotification(guestNotification),
      });
    }
  }

  res.json({ message: 'Ticket updated', ticket });
};
