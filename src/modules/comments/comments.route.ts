import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { commentsController } from "./comments.controller";

const router = express.Router();

// All routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Comment CRUD
router.post("/task/:taskId", commentsController.createComment);
router.patch("/:commentId", commentsController.updateComment);
router.delete("/:commentId", commentsController.deleteComment);

// Get comments
router.get("/task/:taskId", commentsController.getTaskComments);
router.get("/user/my-comments", commentsController.getUserComments);
router.get("/:commentId", commentsController.getCommentById);

export const commentsRouter: Router = router;