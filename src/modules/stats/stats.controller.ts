import { Request, Response, NextFunction } from "express";
import { statsService } from "./stats.service";

const getPlatformStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await statsService.getPlatformStats();

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

const getUserStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const targetUserId = req.query.userId as string || userId;

        // Only admins can view other users' stats
        if (targetUserId !== userId && userRole !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to view other users' stats",
            });
        }

        const result = await statsService.getUserStats(targetUserId);

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

const getProjectStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await statsService.getProjectStats(projectId as string, userId, userRole);

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

const getTaskStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { taskId } = req.params;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required",
            });
        }

        const result = await statsService.getTaskStats(taskId as string, userId, userRole);

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

const getTeamStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Only admins and PMs can view team stats
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            return res.status(403).json({
                success: false,
                message: "Only Admins and Project Managers can view team stats",
            });
        }

        const result = await statsService.getTeamStats();

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

        const result = await statsService.getActivityStats(userId, userRole, days);

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

const getCompletionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await statsService.getCompletionStats(userId, userRole);

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

export const statsController = {
    getPlatformStats,
    getUserStats,
    getProjectStats,
    getTaskStats,
    getTeamStats,
    getActivityStats,
    getCompletionStats,
};