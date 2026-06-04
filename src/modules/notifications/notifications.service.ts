import { Prisma, NotificationType } from "../../generated/prisma";
import { prisma } from "../../lib/prisma";

// User preferences storage (you may want to add this to your schema)
// For now, we'll store in memory or you can add a UserSettings model
// This is a placeholder - implement with your actual user settings model
let userSettings: Record<string, any> = {};

const defaultSettings = {
    taskAssigned: true,
    taskStatusChanged: true,
    taskDueSoon: true,
    taskOverdue: true,
    commentAdded: true,
    mentioned: true,
    projectInvite: true,
};

const getNotifications = async (
    userId: string,
    params: {
        page: number;
        limit: number;
        type?: string;
        isRead?: boolean;
    }
) => {
    try {
        const { page, limit, type, isRead } = params;
        const skip = (page - 1) * limit;

        const where: any = { userId };

        if (type && type !== "all") {
            where.type = type;
        }

        if (isRead !== undefined) {
            where.isRead = isRead;
        }

        const notifications = await prisma.notification.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        });

        const totalItems = await prisma.notification.count({ where });

        // Get counts by type for filtering UI
        const typeCounts = await prisma.notification.groupBy({
            by: ["type"],
            where: { userId },
            _count: true,
        });

        return {
            success: true,
            data: {
                notifications: notifications.map(notif => ({
                    id: notif.id,
                    type: notif.type,
                    message: notif.message,
                    isRead: notif.isRead,
                    metadata: notif.metadata,
                    createdAt: notif.createdAt,
                    readAt: notif.readAt,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                typeCounts: typeCounts.map(tc => ({
                    type: tc.type,
                    count: tc._count,
                })),
                unreadCount: await prisma.notification.count({
                    where: { userId, isRead: false },
                }),
            },
        };
    } catch (error) {
        console.error("Get notifications error:", error);
        return { success: false, message: "Failed to fetch notifications" };
    }
};

const getUnreadCount = async (userId: string) => {
    try {
        const count = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        return {
            success: true,
            data: { unreadCount: count },
        };
    } catch (error) {
        console.error("Get unread count error:", error);
        return { success: false, message: "Failed to get unread count" };
    }
};

const markAsRead = async (notificationId: string, userId: string) => {
    try {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            return { success: false, message: "Notification not found" };
        }

        if (notification.isRead) {
            return { success: false, message: "Notification already read" };
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Mark as read error:", error);
        return { success: false, message: "Failed to mark notification as read" };
    }
};

const markAllAsRead = async (userId: string) => {
    try {
        const result = await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return {
            success: true,
            message: `${result.count} notification(s) marked as read`,
        };
    } catch (error) {
        console.error("Mark all as read error:", error);
        return { success: false, message: "Failed to mark notifications as read" };
    }
};

const deleteNotification = async (notificationId: string, userId: string) => {
    try {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            return { success: false, message: "Notification not found" };
        }

        await prisma.notification.delete({
            where: { id: notificationId },
        });

        return { success: true };
    } catch (error) {
        console.error("Delete notification error:", error);
        return { success: false, message: "Failed to delete notification" };
    }
};

const deleteAllRead = async (userId: string) => {
    try {
        const result = await prisma.notification.deleteMany({
            where: { userId, isRead: true },
        });

        return {
            success: true,
            message: `${result.count} read notification(s) deleted`,
        };
    } catch (error) {
        console.error("Delete all read error:", error);
        return { success: false, message: "Failed to delete read notifications" };
    }
};

const getNotificationSettings = async (userId: string) => {
    try {
        // Get user settings from database or use defaults
        // If you have a UserSettings model, fetch from there
        const settings = userSettings[userId] || defaultSettings;

        return {
            success: true,
            data: settings,
        };
    } catch (error) {
        console.error("Get notification settings error:", error);
        return { success: false, message: "Failed to fetch notification settings" };
    }
};

const updateNotificationSettings = async (
    userId: string,
    settings: {
        taskAssigned?: boolean;
        taskStatusChanged?: boolean;
        taskDueSoon?: boolean;
        taskOverdue?: boolean;
        commentAdded?: boolean;
        mentioned?: boolean;
        projectInvite?: boolean;
    }
) => {
    try {
        // Get current settings
        const currentSettings = userSettings[userId] || defaultSettings;

        // Update settings
        userSettings[userId] = {
            ...currentSettings,
            ...settings,
        };

        // If you have a UserSettings model, update in database:
        // await prisma.userSettings.upsert({
        //     where: { userId },
        //     update: settings,
        //     create: { userId, ...settings },
        // });

        return { success: true };
    } catch (error) {
        console.error("Update notification settings error:", error);
        return { success: false, message: "Failed to update notification settings" };
    }
};

// Helper function to create a notification (used by other modules)
const createNotification = async (
    userId: string,
    type: NotificationType,
    message: string,
    metadata?: Record<string, any>
) => {
    try {
        // Check if user wants this type of notification
        const settings = userSettings[userId] || defaultSettings;
        
        let shouldNotify = true;
        switch (type) {
            case "TASK_ASSIGNED":
                shouldNotify = settings.taskAssigned;
                break;
            case "TASK_STATUS_CHANGED":
                shouldNotify = settings.taskStatusChanged;
                break;
            case "TASK_DUE_SOON":
                shouldNotify = settings.taskDueSoon;
                break;
            case "TASK_OVERDUE":
                shouldNotify = settings.taskOverdue;
                break;
            case "COMMENT_ADDED":
                shouldNotify = settings.commentAdded;
                break;
            case "MENTIONED":
                shouldNotify = settings.mentioned;
                break;
            case "PROJECT_INVITE":
                shouldNotify = settings.projectInvite;
                break;
            default:
                shouldNotify = true;
        }

        if (!shouldNotify) {
            return { success: true, skipped: true };
        }

        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                message,
                metadata: metadata || {},
            },
        });

        return { success: true, data: notification };
    } catch (error) {
        console.error("Create notification error:", error);
        return { success: false, message: "Failed to create notification" };
    }
};

// Helper to check for upcoming deadlines and create notifications
const checkUpcomingDeadlines = async () => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        dayAfterTomorrow.setHours(0, 0, 0, 0);

        // Tasks due tomorrow
        const tasksDueTomorrow = await prisma.task.findMany({
            where: {
                status: { not: "COMPLETED" },
                dueDate: {
                    gte: tomorrow,
                    lt: dayAfterTomorrow,
                },
            },
            include: {
                assignedUser: true,
                project: true,
            },
        });

        for (const task of tasksDueTomorrow) {
            if (task.assignedTo) {
                await createNotification(
                    task.assignedTo,
                    "TASK_DUE_SOON",
                    `Task "${task.title}" in project "${task.project.name}" is due tomorrow`,
                    {
                        taskId: task.id,
                        projectId: task.projectId,
                        dueDate: task.dueDate,
                    }
                );
            }
        }

        // Tasks overdue
        const overdueTasks = await prisma.task.findMany({
            where: {
                status: { not: "COMPLETED" },
                dueDate: { lt: new Date() },
            },
            include: {
                assignedUser: true,
                project: true,
            },
        });

        for (const task of overdueTasks) {
            if (task.assignedTo) {
                // Check if already notified today
                const existingNotification = await prisma.notification.findFirst({
                    where: {
                        userId: task.assignedTo,
                        type: "TASK_OVERDUE",
                        metadata: { path: ["taskId"], equals: task.id },
                        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                    },
                });

                if (!existingNotification) {
                    await createNotification(
                        task.assignedTo,
                        "TASK_OVERDUE",
                        `Task "${task.title}" in project "${task.project.name}" is overdue`,
                        {
                            taskId: task.id,
                            projectId: task.projectId,
                            dueDate: task.dueDate,
                        }
                    );
                }
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Check upcoming deadlines error:", error);
        return { success: false, message: "Failed to check deadlines" };
    }
};

export const notificationsService = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    getNotificationSettings,
    updateNotificationSettings,
    createNotification,
    checkUpcomingDeadlines,
};