import { Request, Response, NextFunction } from "express";
import { dashboardService } from "./dashboard.service";

const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await dashboardService.getDashboard(userId, userRole);

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

const getKPICards = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await dashboardService.getKPICards(userId, userRole);

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

const getProjectSummaries = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const limit = parseInt(req.query.limit as string) || 5;

        const result = await dashboardService.getProjectSummaries(userId, userRole, limit);

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

const getUpcomingDeadlines = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await dashboardService.getUpcomingDeadlines(userId, userRole, limit);

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

const getHighPriorityTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const limit = parseInt(req.query.limit as string) || 5;

        const result = await dashboardService.getHighPriorityTasks(userId, userRole, limit);

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

const getMemberWorkload = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const projectId = req.query.projectId as string;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await dashboardService.getMemberWorkload(
            userId,
            userRole,
            projectId,
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

const getCharts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const days = parseInt(req.query.days as string) || 30;

        const result = await dashboardService.getCharts(userId, userRole, days);

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

        const result = await dashboardService.getRecentActivities(userId, userRole, limit);

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

export const dashboardController = {
    getDashboard,
    getKPICards,
    getProjectSummaries,
    getUpcomingDeadlines,
    getHighPriorityTasks,
    getMemberWorkload,
    getCharts,
    getRecentActivities,
};