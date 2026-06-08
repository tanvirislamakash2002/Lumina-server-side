import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { adminController } from "./admin.controller";

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(auth(Role.ADMIN));

// Dashboard & Stats
router.get("/dashboard", adminController.getDashboard);
router.get("/stats", adminController.getSystemStats);

// User Management
router.get("/users", adminController.getAllUsers);
router.get("/users/:userId", adminController.getUserDetails);
router.patch("/users/:userId/role", adminController.updateUserRole);
router.post("/users/:userId/suspend", adminController.suspendUser);
router.post("/users/:userId/activate", adminController.activateUser);
router.delete("/users/:userId", adminController.deleteUser);
router.post("/users/bulk", adminController.bulkUserAction);

// Project Management
router.get("/projects", adminController.getAllProjects);
router.delete("/projects/:projectId", adminController.deleteProject);

// Logs & Audit
router.get("/logs", adminController.getSystemLogs);
router.get("/audit", adminController.getAuditTrail);
router.get("/audit/stats", adminController.getAuditStats);
// System
router.post("/cache/clear", adminController.clearCache);

export const adminRouter: Router = router;