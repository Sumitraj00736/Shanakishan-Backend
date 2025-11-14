const Support = require('../models/SupportTicket');

// List all support tickets
exports.listTickets = async (req,res) => {
  const tickets = await Support.find().sort('-createdAt');
  res.json(tickets);
};

// Update / resolve a ticket
exports.updateTicket = async (req,res) => {
  const { id } = req.params;
  const { status, message } = req.body;

  const ticket = await Support.findById(id);
  if(!ticket) return res.status(404).json({ message: 'Ticket not found' });

  ticket.status = status || ticket.status;
  ticket.adminMessage = message || ticket.adminMessage;
  await ticket.save();

  res.json({ message: 'Ticket updated', ticket });
};
