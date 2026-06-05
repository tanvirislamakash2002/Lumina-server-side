import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma";
import { settingsController } from "./settings.controller";

const router = express.Router();

// All settings routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// ============ User Settings (All authenticated users) ============
// Notification settings
router.get("/notifications", settingsController.getNotificationSettings);
router.patch("/notifications", settingsController.updateNotificationSettings);

// Theme settings
router.get("/theme", settingsController.getThemeSettings);
router.patch("/theme", settingsController.updateThemeSettings);

// Security settings
router.get("/security", settingsController.getSecuritySettings);
router.patch("/security", settingsController.updateSecuritySettings);

// Session management
router.get("/sessions", settingsController.getSessions);
router.delete("/sessions/:sessionId", settingsController.revokeSession);
router.delete("/sessions", settingsController.revokeAllSessions);

// ============ Admin Only Settings ============
// General settings
router.get("/general", auth(Role.ADMIN), settingsController.getGeneralSettings);
router.patch("/general", auth(Role.ADMIN), settingsController.updateGeneralSettings);

// System settings
router.get("/system", auth(Role.ADMIN), settingsController.getSystemSettings);
router.patch("/system", auth(Role.ADMIN), settingsController.updateSystemSettings);

export const settingsRouter: Router = router;