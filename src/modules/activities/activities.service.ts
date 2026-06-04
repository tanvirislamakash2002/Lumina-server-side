import { prisma } from "../../lib/prisma";

const getActivities = async (
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
        projectId?: string;
        taskId?: string;
        action?: string;
    }
) => {
    try {
        const { page, limit, projectId, taskId, action } = params;
        const skip = (page - 1) * limit;

        // Build where clause based on user role
        let where: any = {};

        // Non-admin users can only see activities from projects they're part of
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);

            where.OR = [
                { userId }, // Their own activities
                { projectId: { in: projectIds } }, // Activities in their projects
            ];
        }

        if (projectId) {
            where.projectId = projectId;
        }

        if (taskId) {
            where.taskId = taskId;
        }

        if (action && action !== "all") {
            where.action = action;
        }

        const activities = await prisma.activity.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        const totalItems = await prisma.activity.count({ where });

        // Get action counts for filtering UI
        const actionCounts = await prisma.activity.groupBy({
            by: ["action"],
            where,
            _count: true,
        });

        return {
            success: true,
            data: {
                activities: activities.map(activity => ({
                    id: activity.id,
                    action: activity.action,
                    message: activity.message,
                    details: activity.details,
                    createdAt: activity.createdAt,
                    user: activity.user,
                    project: activity.project,
                    task: activity.task,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                actionCounts: actionCounts.map(ac => ({
                    action: ac.action,
                    count: ac._count,
                })),
            },
        };
    } catch (error) {
        console.error("Get activities error:", error);
        return { success: false, message: "Failed to fetch activities" };
    }
};

const getRecentActivities = async (
    userId: string,
    userRole: string,
    limit: number
) => {
    try {
        // Build where clause based on user role
        let where: any = {};

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);

            where.OR = [
                { userId },
                { projectId: { in: projectIds } },
            ];
        }

        const activities = await prisma.activity.findMany({
            where,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        return {
            success: true,
            data: activities.map(activity => ({
                id: activity.id,
                action: activity.action,
                message: activity.message,
                details: activity.details,
                createdAt: activity.createdAt,
                user: activity.user,
                project: activity.project,
                task: activity.task,
            })),
        };
    } catch (error) {
        console.error("Get recent activities error:", error);
        return { success: false, message: "Failed to fetch recent activities" };
    }
};

const getProjectActivities = async (
    projectId: string,
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
    }
) => {
    try {
        const { page, limit } = params;
        const skip = (page - 1) * limit;

        // Check if user has access to the project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { members: { some: { userId } } },
                ],
            },
        });

        const hasAccess = project || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this project" };
        }

        const activities = await prisma.activity.findMany({
            where: { projectId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        const totalItems = await prisma.activity.count({ where: { projectId } });

        return {
            success: true,
            data: {
                activities: activities.map(activity => ({
                    id: activity.id,
                    action: activity.action,
                    message: activity.message,
                    details: activity.details,
                    createdAt: activity.createdAt,
                    user: activity.user,
                    task: activity.task,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
            },
        };
    } catch (error) {
        console.error("Get project activities error:", error);
        return { success: false, message: "Failed to fetch project activities" };
    }
};

const getTaskActivities = async (
    taskId: string,
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
    }
) => {
    try {
        const { page, limit } = params;
        const skip = (page - 1) * limit;

        // Check if user has access to the task
        const task = await prisma.task.findFirst({
            where: { id: taskId },
            include: {
                project: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
            },
        });

        if (!task) {
            return { success: false, message: "Task not found" };
        }

        const isProjectMember = task.project.members.length > 0;
        const hasAccess = isProjectMember ||
            userRole === "ADMIN" ||
            userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this task" };
        }

        const activities = await prisma.activity.findMany({
            where: { taskId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const totalItems = await prisma.activity.count({ where: { taskId } });

        return {
            success: true,
            data: {
                activities: activities.map(activity => ({
                    id: activity.id,
                    action: activity.action,
                    message: activity.message,
                    details: activity.details,
                    createdAt: activity.createdAt,
                    user: activity.user,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
            },
        };
    } catch (error) {
        console.error("Get task activities error:", error);
        return { success: false, message: "Failed to fetch task activities" };
    }
};

const getUserActivities = async (
    targetUserId: string,
    params: {
        page: number;
        limit: number;
    }
) => {
    try {
        const { page, limit } = params;
        const skip = (page - 1) * limit;

        const activities = await prisma.activity.findMany({
            where: { userId: targetUserId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        const totalItems = await prisma.activity.count({ where: { userId: targetUserId } });

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            },
        });

        // Get summary stats
        const actionSummary = await prisma.activity.groupBy({
            by: ["action"],
            where: { userId: targetUserId },
            _count: true,
            orderBy: {
                _count: {
                    action: "desc"
                }
            },
            take: 5,
        });

        return {
            success: true,
            data: {
                user,
                activities: activities.map(activity => ({
                    id: activity.id,
                    action: activity.action,
                    message: activity.message,
                    details: activity.details,
                    createdAt: activity.createdAt,
                    project: activity.project,
                    task: activity.task,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                summary: {
                    totalActivities: totalItems,
                    topActions: actionSummary.map(as => ({
                        action: as.action,
                        count: as._count,
                    })),
                },
            },
        };
    } catch (error) {
        console.error("Get user activities error:", error);
        return { success: false, message: "Failed to fetch user activities" };
    }
};

const getActivityStats = async (
    userId: string,
    userRole: string,
    days: number
) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Build where clause
        let where: any = {
            createdAt: { gte: startDate },
        };

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);

            where.OR = [
                { userId },
                { projectId: { in: projectIds } },
            ];
        }

        // Get daily activity counts
        const dailyStats = await prisma.$queryRaw`
            SELECT 
                DATE("createdAt") as date,
                COUNT(*) as count
            FROM activities
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE("createdAt")
            ORDER BY date ASC
        `;

        // Get activity by action - removed orderBy
        const actionStatsRaw = await prisma.activity.groupBy({
            by: ["action"],
            where,
            _count: true,
        });

        // Sort manually by count descending
        const actionStats = actionStatsRaw.sort((a, b) => b._count - a._count);

        // Get total counts
        const totalActivities = await prisma.activity.count({ where });
        const uniqueUsers = await prisma.activity.groupBy({
            by: ["userId"],
            where,
            _count: true,
        });

        // Get most active project - removed take, will limit after sort
        const topProjectsRaw = await prisma.activity.groupBy({
            by: ["projectId"],
            where: {
                ...where,
                projectId: { not: null },
            },
            _count: true,
        });

        // Sort manually by count descending and take first
        const topProjects = topProjectsRaw.sort((a, b) => b._count - a._count);
        const topProject = topProjects[0];

        let topProjectName = null;
        if (topProject?.projectId) {
            const project = await prisma.project.findUnique({
                where: { id: topProject.projectId },
                select: { name: true },
            });
            topProjectName = project?.name;
        }

        return {
            success: true,
            data: {
                totalActivities,
                uniqueUsersCount: uniqueUsers.length,
                topProject: topProjectName,
                dailyStats,
                actionStats: actionStats.map(ast => ({
                    action: ast.action,
                    count: ast._count,
                })),
                period: {
                    startDate,
                    endDate: new Date(),
                    days,
                },
            },
        };
    } catch (error) {
        console.error("Get activity stats error:", error);
        return { success: false, message: "Failed to fetch activity stats" };
    }
};

export const activitiesService = {
    getActivities,
    getRecentActivities,
    getProjectActivities,
    getTaskActivities,
    getUserActivities,
    getActivityStats,
};