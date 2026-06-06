import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { projectsController } from "./projects.controller";

const router = express.Router();

// All project routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Project CRUD
router.post("/", projectsController.createProject);
router.get("/", projectsController.getProjects);
router.get("/:projectId", projectsController.getProjectById);
router.patch("/:projectId", projectsController.updateProject);
router.delete("/:projectId", projectsController.deleteProject);
router.post("/bulk-delete", auth(Role.ADMIN, Role.PROJECT_MANAGER), projectsController.bulkDeleteProjects);

// Project analytics
router.get("/:projectId/stats", projectsController.getProjectStats);
router.get("/:projectId/progress", projectsController.getProjectProgress);

export const projectsRouter: Router = router;