import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma";
import { dashboardController } from "./dashboard.controller";

const router = express.Router();

// All dashboard routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Main dashboard endpoint
router.get("/", dashboardController.getDashboard);

// KPI cards
router.get("/kpi", dashboardController.getKPICards);

// Project summaries
router.get("/projects", dashboardController.getProjectSummaries);

// Deadlines and priorities
router.get("/deadlines", dashboardController.getUpcomingDeadlines);
router.get("/high-priority", dashboardController.getHighPriorityTasks);

// Team workload
router.get("/workload", dashboardController.getMemberWorkload);

// Charts and analytics
router.get("/charts", dashboardController.getCharts);

// Recent activity
router.get("/activities", dashboardController.getRecentActivities);

export const dashboardRouter: Router = router;