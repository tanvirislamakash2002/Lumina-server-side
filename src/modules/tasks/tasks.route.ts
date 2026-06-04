import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma";
import { tasksController } from "./tasks.controller";

const router = express.Router();

// All task routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Task CRUD operations
router.post("/project/:projectId", tasksController.createTask);
router.get("/project/:projectId", tasksController.getTasks);
router.get("/my-tasks", tasksController.getTasksByUser);
router.get("/overdue", tasksController.getOverdueTasks);
router.get("/:taskId", tasksController.getTaskById);
router.patch("/:taskId", tasksController.updateTask);
router.delete("/:taskId", tasksController.deleteTask);
router.patch("/:taskId/status", tasksController.updateTaskStatus);

export const tasksRouter: Router = router;