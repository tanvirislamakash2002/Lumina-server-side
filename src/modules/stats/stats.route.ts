import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { statsController } from "./stats.controller";

const router = express.Router();

// Platform stats (public - no auth required)
router.get("/platform", statsController.getPlatformStats);

// All other stats require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// User stats
router.get("/user", statsController.getUserStats);

// Project stats
router.get("/project/:projectId", statsController.getProjectStats);

// Task stats
router.get("/task/:taskId", statsController.getTaskStats);

// Team stats (admin/PM only)
router.get("/team", statsController.getTeamStats);

// Activity stats
router.get("/activities", statsController.getActivityStats);

// Completion stats
router.get("/completion", statsController.getCompletionStats);

export const statsRouter: Router = router;