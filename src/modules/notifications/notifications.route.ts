import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { notificationsController } from "./notifications.controller";

const router = express.Router();

// All routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Get notifications
router.get("/", notificationsController.getNotifications);
router.get("/unread-count", notificationsController.getUnreadCount);

// Mark as read
router.patch("/:notificationId/read", notificationsController.markAsRead);
router.patch("/read-all", notificationsController.markAllAsRead);

// Delete notifications
router.delete("/:notificationId", notificationsController.deleteNotification);
router.delete("/read/all", notificationsController.deleteAllRead);

// Notification settings
router.get("/settings", notificationsController.getNotificationSettings);
router.patch("/settings", notificationsController.updateNotificationSettings);

export const notificationsRouter: Router = router;