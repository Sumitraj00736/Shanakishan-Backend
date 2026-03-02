const Notification = require("../models/Notification");

const parseLimit = (value, fallback = 50) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 200);
};

exports.listAdminNotifications = async (req, res) => {
  const limit = parseLimit(req.query.limit, 60);
  const filter = { audienceType: "admin" };
  if (req.query.read === "true") filter.read = true;
  if (req.query.read === "false") filter.read = false;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort("-createdAt").limit(limit).lean(),
    Notification.countDocuments({ audienceType: "admin", read: false }),
  ]);

  res.json({ notifications, unreadCount });
};

exports.markAdminNotificationRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, audienceType: "admin" },
    { read: true, readAt: new Date() },
    { new: true }
  ).lean();

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }
  res.json({ notification });
};

exports.markAllAdminNotificationsRead = async (req, res) => {
  await Notification.updateMany(
    { audienceType: "admin", read: false },
    { read: true, readAt: new Date() }
  );
  res.json({ success: true });
};

exports.listUserNotifications = async (req, res) => {
  const limit = parseLimit(req.query.limit, 80);
  const memberId = req.member?.memberId ? String(req.member.memberId).trim() : "";
  const guestPhone = String(req.query.phone || "").trim();

  const match = [];
  if (memberId) match.push({ audienceType: "member", memberId });
  if (guestPhone) match.push({ audienceType: "guest", guestPhone });

  if (!match.length) {
    return res.status(400).json({ message: "Member login or phone is required" });
  }

  const userFilter = { $or: match };
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(userFilter).sort("-createdAt").limit(limit).lean(),
    Notification.countDocuments({ ...userFilter, read: false }),
  ]);

  res.json({ notifications, unreadCount });
};

exports.markUserNotificationRead = async (req, res) => {
  const memberId = req.member?.memberId ? String(req.member.memberId).trim() : "";
  const guestPhone = String(req.body?.phone || req.query?.phone || "").trim();

  const ownerFilter = [];
  if (memberId) ownerFilter.push({ audienceType: "member", memberId });
  if (guestPhone) ownerFilter.push({ audienceType: "guest", guestPhone });

  if (!ownerFilter.length) {
    return res.status(400).json({ message: "Member login or phone is required" });
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: ownerFilter },
    { read: true, readAt: new Date() },
    { new: true }
  ).lean();

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  res.json({ notification });
};

exports.markAllUserNotificationsRead = async (req, res) => {
  const memberId = req.member?.memberId ? String(req.member.memberId).trim() : "";
  const guestPhone = String(req.body?.phone || req.query?.phone || "").trim();

  const ownerFilter = [];
  if (memberId) ownerFilter.push({ audienceType: "member", memberId });
  if (guestPhone) ownerFilter.push({ audienceType: "guest", guestPhone });

  if (!ownerFilter.length) {
    return res.status(400).json({ message: "Member login or phone is required" });
  }

  await Notification.updateMany({ $or: ownerFilter, read: false }, { read: true, readAt: new Date() });
  res.json({ success: true });
};
