

const Member = require('../models/Member');
const mongoose = require('mongoose');


exports.verifyMember = async (req,res) => {
  const { memberId } = req.body;
  if(!memberId) return res.status(400).json({ valid:false, message:'memberId required' });

  const member = await Member.findOne({ memberId });
  if(!member) return res.json({ valid:false });

  const now = new Date();
  const valid = member.status === 'active' && (!member.validUntil || member.validUntil > now);
  res.json({ valid, member: valid ? {
    memberId: member.memberId, name: member.name, discountPercent: member.discountPercent, validUntil: member.validUntil
  } : null });
};


// List all members
exports.listMembers = async (req, res) => {
  try {
    const members = await Member.find({ isDeleted: false }).sort('-createdAt').limit(500);
    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single member
exports.getMember = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid member ID" });

  try {
    const member = await Member.findById(id);
    if (!member || member.isDeleted) return res.status(404).json({ message: "Member not found" });
    res.json(member);
  } catch (error) {
    console.error("Error fetching member:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create member
exports.createMember = async (req, res) => {
  const { name, memberId, phone, email } = req.body;
  if (!name || !memberId || !phone)
    return res.status(400).json({ message: "Name, memberId, and phone are required" });

  try {
    const existing = await Member.findOne({ memberId });
    if (existing) return res.status(400).json({ message: "Member ID already exists" });

    const member = await Member.create({ name, memberId, phone, email });
    res.status(201).json({ message: "Member created", member });
  } catch (error) {
    console.error("Error creating member:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update member
exports.updateMember = async (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid member ID" });

  try {
    const member = await Member.findById(id);
    if (!member || member.isDeleted) return res.status(404).json({ message: "Member not found" });

    member.name = name || member.name;
    member.phone = phone || member.phone;
    member.email = email || member.email;

    await member.save();
    res.json({ message: "Member updated", member });
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete member (soft delete)
exports.deleteMember = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid member ID" });

  try {
    const member = await Member.findById(id);
    if (!member || member.isDeleted) return res.status(404).json({ message: "Member not found" });

    member.isDeleted = true;
    member.deletedAt = new Date();
    await member.save();

    res.json({ message: "Member deleted (soft delete)" });
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ message: "Server error" });
  }
};
