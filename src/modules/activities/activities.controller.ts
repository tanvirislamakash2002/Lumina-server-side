import { Request, Response, NextFunction } from "express";
import { activitiesService } from "./activities.service";

const getActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const projectId = req.query.projectId as string;
        const taskId = req.query.taskId as string;
        const action = req.query.action as string;

        const result = await activitiesService.getActivities(
            userId,
            userRole,
            {
                page,
                limit,
                projectId,
                taskId,
                action,
            }
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

const getRecentActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await activitiesService.getRecentActivities(
            userId,
            userRole,
            limit
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

const getProjectActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await activitiesService.getProjectActivities(
            projectId as string,
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

const getTaskActivities = async (req: Request, res: Response, next: NextFunction) => {
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

        const result = await activitiesService.getTaskActivities(
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

const getUserActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const targetUserId = req.query.userId as string || userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        // Only admins can view other users' activities
        if (targetUserId !== userId && userRole !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to view other users' activities",
            });
        }

        const result = await activitiesService.getUserActivities(
            targetUserId,
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

const getActivityStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const days = parseInt(req.query.days as string) || 30;

        const result = await activitiesService.getActivityStats(
            userId,
            userRole,
            days
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

export const activitiesController = {
    getActivities,
    getRecentActivities,
    getProjectActivities,
    getTaskActivities,
    getUserActivities,
    getActivityStats,
};