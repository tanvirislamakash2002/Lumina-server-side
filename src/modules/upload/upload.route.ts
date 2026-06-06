import express, { Router } from "express";
import auth from "../../middlewares/auth";
import { uploadController, uploadMiddleware } from "./upload.controller";
import { Role } from "../../generated/prisma/enums";

const router = express.Router();

// ============ Avatar Routes ============
router.post(
    "/avatar",
    auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN),
    uploadMiddleware,
    uploadController.uploadAvatar
);

router.delete(
    "/avatar",
    auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN),
    uploadController.removeAvatar
);

// ============ Task Attachment Routes ============
router.post(
    "/task/:taskId/attachment",
    auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN),
    uploadMiddleware,
    uploadController.uploadTaskAttachment
);

router.get(
    "/task/:taskId/attachments",
    auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN),
    uploadController.getTaskAttachments
);

router.delete(
    "/attachment/:attachmentId",
    auth(Role.TEAM_MEMBER, Role.PROJECT_MANAGER, Role.ADMIN),
    uploadController.deleteTaskAttachment
);

// ============ Project Image Routes ============
router.post(
    "/project/:projectId/image",
    auth(Role.PROJECT_MANAGER, Role.ADMIN),
    uploadMiddleware,
    uploadController.uploadProjectImage
);

export const uploadRouter: Router = router;