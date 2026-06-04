import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadService } from "./upload.service";

// Configure multer for files
const storage = multer.memoryStorage();
const fileFilter = (req: any, file: any, cb: any) => {
    const allowedTypes = [
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
        "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File type not allowed. Allowed: images, PDF, DOC, DOCX, TXT"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Upload avatar
const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const result = await uploadService.uploadAvatar(
            user.id,
            file.buffer,
            file.originalname
        );

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
};

// Remove avatar
const removeAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await uploadService.removeAvatar(user.id);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
};

// Upload task attachment
const uploadTaskAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { taskId } = req.params;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required"
            });
        }

        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const result = await uploadService.uploadTaskAttachment(
            taskId as string,
            user.id,
            file.buffer,
            file.originalname,
            file.mimetype,
            file.size
        );

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
};

// Delete task attachment
const deleteTaskAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { attachmentId } = req.params;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!attachmentId) {
            return res.status(400).json({
                success: false,
                message: "Attachment ID is required"
            });
        }

        const result = await uploadService.deleteTaskAttachment(
            attachmentId as string,
            user.id,
            user.role
        );

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
};

// Get task attachments
const getTaskAttachments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { taskId } = req.params;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required"
            });
        }

        const result = await uploadService.getTaskAttachments(taskId as string);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
};

// Upload project image
const uploadProjectImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { projectId } = req.params;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required"
            });
        }

        const file = (req as any).file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const result = await uploadService.uploadProjectImage(
            projectId as string,
            user.id,
            user.role,
            file.buffer,
            file.originalname
        );

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
};

export const uploadMiddleware = upload.single("file");

export const uploadController = {
    uploadAvatar,
    removeAvatar,
    uploadTaskAttachment,
    deleteTaskAttachment,
    getTaskAttachments,
    uploadProjectImage,
};