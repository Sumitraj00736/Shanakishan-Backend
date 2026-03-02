const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    audienceType: {
      type: String,
      enum: ["admin", "member", "guest"],
      required: true,
    },
    memberId: { type: String, default: null },
    guestPhone: { type: String, default: null },
    type: {
      type: String,
      enum: ["booking", "support"],
      required: true,
    },
    event: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: "" },
    data: { type: Object, default: {} },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ audienceType: 1, createdAt: -1 });
NotificationSchema.index({ memberId: 1, createdAt: -1 });
NotificationSchema.index({ guestPhone: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
