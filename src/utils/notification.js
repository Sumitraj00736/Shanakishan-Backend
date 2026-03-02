const Notification = require("../models/Notification");

const createNotification = async ({
  audienceType,
  memberId = null,
  guestPhone = null,
  type,
  event,
  title,
  message,
  status = "",
  data = {},
}) => {
  return Notification.create({
    audienceType,
    memberId,
    guestPhone,
    type,
    event,
    title,
    message,
    status,
    data,
  });
};

const sanitizeNotification = (notificationDoc) => {
  if (!notificationDoc) return null;
  const notification = notificationDoc.toObject ? notificationDoc.toObject() : notificationDoc;
  return {
    _id: notification._id,
    audienceType: notification.audienceType,
    memberId: notification.memberId,
    guestPhone: notification.guestPhone,
    type: notification.type,
    event: notification.event,
    title: notification.title,
    message: notification.message,
    status: notification.status,
    data: notification.data,
    read: notification.read,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
};

module.exports = {
  createNotification,
  sanitizeNotification,
};
