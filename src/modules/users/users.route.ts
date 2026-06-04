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

// ============ Admin Only Routes ============
router.get("/", auth(Role.ADMIN), usersController.getAllUsers);
router.get("/:userId", auth(Role.ADMIN), usersController.getUserById);
router.patch("/:userId/role", auth(Role.ADMIN), usersController.updateUserRole);

export const usersRouter: Router = router;