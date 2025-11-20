const Support = require('../models/SupportTicket');
const member = require('../models/Member')
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

  res.json({ message: 'Ticket updated', ticket });
};



