import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma";
import { activitiesController } from "./activities.controller";

const router = express.Router();

// All routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// General activities (with filters)
router.get("/", activitiesController.getActivities);
router.get("/recent", activitiesController.getRecentActivities);
router.get("/stats", activitiesController.getActivityStats);

// Project-specific activities
router.get("/project/:projectId", activitiesController.getProjectActivities);

// Task-specific activities
router.get("/task/:taskId", activitiesController.getTaskActivities);

// User-specific activities
router.get("/user/me", activitiesController.getUserActivities);
router.get("/user/:userId", auth(Role.ADMIN), activitiesController.getUserActivities);

export const activitiesRouter: Router = router;