import express, { Router } from "express";
import multer from "multer";
import auth from "../../middlewares/auth";
import { Role } from "../../generated/prisma/enums";
import { attachmentsController } from "./attachments.controller";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// All routes require authentication
router.use(auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN));

// Attachment CRUD
router.post(
    "/task/:taskId",
    upload.single("file"),
    attachmentsController.uploadAttachment
);
router.delete("/:attachmentId", attachmentsController.deleteAttachment);

// Get attachments
router.get("/task/:taskId", attachmentsController.getTaskAttachments);
router.get("/:attachmentId", attachmentsController.getAttachmentById);
router.get("/:attachmentId/download", attachmentsController.downloadAttachment);

export const attachmentsRouter: Router = router;