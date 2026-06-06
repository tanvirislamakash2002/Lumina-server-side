import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { projectMembersController } from "./project-members.controller";

const router = express.Router();

// All routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Member management (PM and Admin only)
router.post("/:projectId/members", projectMembersController.addMember);
router.delete("/:projectId/members/:memberId", projectMembersController.removeMember);
router.get("/:projectId/members/available", projectMembersController.getAvailableMembers);

// Member viewing (all authenticated users)
router.get("/:projectId/members", projectMembersController.getProjectMembers);
router.get("/:projectId/members/check", projectMembersController.checkMembership);

// User's projects
router.get("/user/projects", projectMembersController.getUserProjects);

export const projectMembersRouter: Router = router;