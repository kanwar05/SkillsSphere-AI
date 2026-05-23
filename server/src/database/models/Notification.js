import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      minlength: [5, "Message must be at least 5 characters"],
    },

    type: {
      type: String,
      enum: [
        "info",
        "warning",
        "success",
        "error",
        "job-update",
        "interview",
        "application",
      ],
      default: "info",
      required: [true, "Notification type is required"],
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    metadata: {
      relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      relatedModel: {
        type: String,
        enum: ["JobPosting", "JobApplication", "Interview", "Resume", null],
        default: null,
      },
      actionUrl: {
        type: String,
        default: null,
      },
      _id: false,
    },
  },
  { timestamps: true },
);

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["skill_gap_alert", "general", "system"],
      default: "general",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedData: {
      jobId: { type: mongoose.Schema.Types.ObjectId, ref: "JobPosting" },
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      score: Number,
    }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
