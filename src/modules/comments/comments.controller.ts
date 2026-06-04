import { Request, Response, NextFunction } from "express";
import { commentsService } from "./comments.service";

const createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { taskId } = req.params;
        const { content, parentId } = req.body;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required",
            });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Comment content is required",
            });
        }

        if (content.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Comment cannot exceed 5000 characters",
            });
        }

        const result = await commentsService.createComment(
            taskId as string,
            userId,
            content.trim(),
            parentId || null
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json({
            success: true,
            data: result.data,
            message: "Comment added successfully",
        });
    } catch (error) {
        next(error);
    }
};

const updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { commentId } = req.params;
        const { content } = req.body;

        if (!commentId) {
            return res.status(400).json({
                success: false,
                message: "Comment ID is required",
            });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Comment content is required",
            });
        }

        if (content.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Comment cannot exceed 5000 characters",
            });
        }

        const result = await commentsService.updateComment(
            commentId as string,
            userId,
            userRole,
            content.trim()
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: "Comment updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { commentId } = req.params;

        if (!commentId) {
            return res.status(400).json({
                success: false,
                message: "Comment ID is required",
            });
        }

        const result = await commentsService.deleteComment(
            commentId as string,
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

const getTaskComments = async (req: Request, res: Response, next: NextFunction) => {
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

        const result = await commentsService.getTaskComments(
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

const getUserComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await commentsService.getUserComments(
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

const getCommentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { commentId } = req.params;

        if (!commentId) {
            return res.status(400).json({
                success: false,
                message: "Comment ID is required",
            });
        }

        const result = await commentsService.getCommentById(
            commentId as string,
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

export const commentsController = {
    createComment,
    updateComment,
    deleteComment,
    getTaskComments,
    getUserComments,
    getCommentById,
};