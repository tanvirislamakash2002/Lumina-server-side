import { Request, Response, NextFunction } from "express";
import { notificationsService } from "./notifications.service";

const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as string;
        const isReadParam = req.query.isRead as string;

        // Build params object only with defined values
        const params: {
            page: number;
            limit: number;
            type?: string;
            isRead?: boolean;
        } = {
            page,
            limit,
        };

        if (type && type !== "all") {
            params.type = type;
        }

        if (isReadParam === "true") {
            params.isRead = true;
        } else if (isReadParam === "false") {
            params.isRead = false;
        }
        // If neither, omit isRead property entirely

        const result = await notificationsService.getNotifications(userId, params);

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

const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await notificationsService.getUnreadCount(userId);

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

const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { notificationId } = req.params;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message: "Notification ID is required",
            });
        }

        const result = await notificationsService.markAsRead(
            notificationId as string,
            userId
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
        });
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await notificationsService.markAllAsRead(userId);

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

const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { notificationId } = req.params;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message: "Notification ID is required",
            });
        }

        const result = await notificationsService.deleteNotification(
            notificationId as string,
            userId
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

const deleteAllRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await notificationsService.deleteAllRead(userId);

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

const getNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await notificationsService.getNotificationSettings(userId);

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

const updateNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { taskAssigned, taskStatusChanged, taskDueSoon, taskOverdue, commentAdded, mentioned, projectInvite } = req.body;

        // Build settings object only with provided values
        const settings: {
            taskAssigned?: boolean;
            taskStatusChanged?: boolean;
            taskDueSoon?: boolean;
            taskOverdue?: boolean;
            commentAdded?: boolean;
            mentioned?: boolean;
            projectInvite?: boolean;
        } = {};

        if (taskAssigned !== undefined) settings.taskAssigned = taskAssigned;
        if (taskStatusChanged !== undefined) settings.taskStatusChanged = taskStatusChanged;
        if (taskDueSoon !== undefined) settings.taskDueSoon = taskDueSoon;
        if (taskOverdue !== undefined) settings.taskOverdue = taskOverdue;
        if (commentAdded !== undefined) settings.commentAdded = commentAdded;
        if (mentioned !== undefined) settings.mentioned = mentioned;
        if (projectInvite !== undefined) settings.projectInvite = projectInvite;

        const result = await notificationsService.updateNotificationSettings(userId, settings);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Notification settings updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const notificationsController = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    getNotificationSettings,
    updateNotificationSettings,
};