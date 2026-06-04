import { Request, Response, NextFunction } from "express";
import { attachmentsService } from "./attachments.service";

const uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { taskId } = req.params;
        const file = (req as any).file;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required",
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: "File size must be less than 5MB",
            });
        }

        // Validate file type
        const allowedMimeTypes = [
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/zip",
            "application/x-zip-compressed",
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "File type not allowed. Allowed: images, PDF, DOC, DOCX, TXT, ZIP",
            });
        }

        const result = await attachmentsService.uploadAttachment(
            taskId as string,
            userId,
            userRole,
            file.buffer,
            file.originalname,
            file.mimetype,
            file.size
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json({
            success: true,
            data: result.data,
            message: "File uploaded successfully",
        });
    } catch (error) {
        next(error);
    }
};

const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { attachmentId } = req.params;

        if (!attachmentId) {
            return res.status(400).json({
                success: false,
                message: "Attachment ID is required",
            });
        }

        const result = await attachmentsService.deleteAttachment(
            attachmentId as string,
            userId,
            userRole
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

const getTaskAttachments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { taskId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required",
            });
        }

        const result = await attachmentsService.getTaskAttachments(
            taskId as string,
            userId,
            userRole,
            { page, limit }
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const getAttachmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { attachmentId } = req.params;

        if (!attachmentId) {
            return res.status(400).json({
                success: false,
                message: "Attachment ID is required",
            });
        }

        const result = await attachmentsService.getAttachmentById(
            attachmentId as string,
            userId,
            userRole
        );

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { attachmentId } = req.params;

        if (!attachmentId) {
            return res.status(400).json({
                success: false,
                message: "Attachment ID is required",
            });
        }

        const result = await attachmentsService.downloadAttachment(
            attachmentId as string,
            userId,
            userRole
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Redirect to the file URL or send file data
        // Option 1: Redirect to URL
        if (result.data?.url) {
            return res.redirect(result.data.url);
        }

        // Option 2: Send file data (if using local storage)
        // res.setHeader('Content-Type', result.data.mimeType);
        // res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
        // return res.send(result.data.buffer);

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const attachmentsController = {
    uploadAttachment,
    deleteAttachment,
    getTaskAttachments,
    getAttachmentById,
    downloadAttachment,
};