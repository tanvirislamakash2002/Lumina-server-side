import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma";
import { usersController } from "./users.controller";

const router = express.Router();

// ============ Authenticated Routes (All logged-in users) ============
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Profile management
router.get("/me", usersController.getProfile);
router.patch("/me", usersController.updateProfile);
router.post("/me/change-password", usersController.changePassword);
router.delete("/me", usersController.deleteAccount);

// Workload (for dashboard)
router.get("/me/workload", usersController.getUserWorkload);

// Team members listing (for task assignment dropdowns)
router.get("/members", usersController.getTeamMembers);
// ============ Team Members (for team page) ============
// Project Managers and Admins can access, Team Members get limited view
router.get("/team-members", usersController.getTeamMembersWithProjects);

// ============ Admin & Project Manager Routes ============
// Project Managers also need to see all users for task assignment
router.get("/", auth(Role.ADMIN, Role.PROJECT_MANAGER), usersController.getAllUsers);
router.get("/:userId", auth(Role.ADMIN, Role.PROJECT_MANAGER), usersController.getUserById);

// ============ Admin Only Routes ============
router.patch("/:userId/role", auth(Role.ADMIN), usersController.updateUserRole);


router.get("/:userId/projects", auth(Role.ADMIN, Role.PROJECT_MANAGER), usersController.getUserProjects);

export const usersRouter: Router = router;