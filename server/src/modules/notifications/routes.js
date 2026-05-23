import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import {
  getNotifications,
  getUnreadCount,
  createNotification,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotificationById,
  deleteAllNotificationsForUser,
} from "./controller.js";

const router = express.Router();

// Protect all routes
router.use(protect);

router.get("/", getNotifications);

router.get("/unread-count", getUnreadCount);

router.post("/", createNotification);

router.get("/:id", getNotification);

router.patch("/:id/read", markAsRead);

router.patch("/mark-all/read", markAllAsRead);

router.delete("/:id", deleteNotificationById);

router.delete("/", deleteAllNotificationsForUser);
import { getNotifications, markAsRead } from "./controller.js";

const router = express.Router();

router.use(protect);
router.get("/", getNotifications);
router.post("/read", markAsRead);

export default router;
