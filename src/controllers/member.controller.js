

const Member = require('../models/Member');
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");


exports.memberLogin = async (req, res) => {
  try {
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ success: false, message: "memberId required" });
    }

    const member = await Member.findOne({ memberId });

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    // Validate member status
    const now = new Date();
    const isValid =
      member.status === "active" &&
      (!member.validUntil || member.validUntil > now);

    if (!isValid) {
      return res.status(403).json({ success: false, message: "Membership expired or inactive" });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: member._id,
        memberId: member.memberId,
        name: member.name,
        discount: member.discountPercent
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      member: {
        memberId: member.memberId,
        name: member.name,
        phone: member.phone,
        discountPercent: member.discountPercent,
        validUntil: member.validUntil
      }
    });

  } catch (err) {
    console.error("Member login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
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
  console.log("Get member ID:", req.params.id);
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
  const { name, phone, email, status } = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid member ID" });
  }

  try {
    const member = await Member.findById(id);
    if (!member || member.isDeleted) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    // Update fields only if provided
    if (name) member.name = name;
    if (phone) {
      // simple phone validation
      const phoneRegex = /^\+?\d{7,15}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: "Invalid phone format" });
      }
      member.phone = phone;
    }
    if (email) {
      // simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }
      member.email = email;
    }

    if (status) {
      const allowedStatus = ["active", "inactive", "suspended"];
      if(allowedStatus.indexOf(status) === -1){
        return res.status(400).json({ success: false, message: `Status must be one of: [${allowedStatus.join(", ")}]` });
      }
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${allowedStatus.join(", ")}` });
      }
      member.status = status;
    }

    await member.save();

    res.json({
      success: true,
      message: "Member updated successfully",
      member
    });

  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete member
exports.deleteMember = async (req, res) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "Invalid member ID" });

  try {
    // Permanently delete the member
    const deletedMember = await Member.findByIdAndDelete(id);

    if (!deletedMember) 
      return res.status(404).json({ success: false, message: "Member not found" });

    res.json({ success: true, message: "Member permanently deleted" });
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};