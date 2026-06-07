import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const getDashboard = async (adminId: string) => {
    try {
        // Get system-wide stats
        const [
            totalUsers,
            activeUsers,
            suspendedUsers,
            totalProjects,
            activeProjects,
            completedProjects,
            totalTasks,
            completedTasks,
            overdueTasks,
            recentActivities,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
            prisma.user.count({ where: { accountStatus: "SUSPENDED" } }),
            prisma.project.count(),
            prisma.project.count({ where: { status: "ACTIVE" } }),
            prisma.project.count({ where: { status: "COMPLETED" } }),
            prisma.task.count(),
            prisma.task.count({ where: { status: "COMPLETED" } }),
            prisma.task.count({
                where: {
                    status: { not: "COMPLETED" },
                    dueDate: { lt: new Date() },
                },
            }),
            prisma.activity.findMany({
                take: 10,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, image: true },
                    },
                    project: {
                        select: { id: true, name: true },
                    },
                    task: {
                        select: { id: true, title: true },
                    },
                },
            }),
        ]);

        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // Get recent users
        const recentUsers = await prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                accountStatus: true,
                createdAt: true,
            },
        });

        // Get recent projects
        const recentProjects = await prisma.project.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { tasks: true, members: true },
                },
            },
        });

        return {
            success: true,
            data: {
                stats: {
                    totalUsers,
                    activeUsers,
                    suspendedUsers,
                    totalProjects,
                    activeProjects,
                    completedProjects,
                    totalTasks,
                    completedTasks,
                    overdueTasks,
                    completionRate,
                },
                recentActivities: recentActivities.map(a => ({
                    id: a.id,
                    action: a.action,
                    message: a.message,
                    createdAt: a.createdAt,
                    user: a.user,
                    project: a.project,
                    task: a.task,
                })),
                recentUsers,
                recentProjects: recentProjects.map(p => ({
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    taskCount: p._count.tasks,
                    memberCount: p._count.members,
                    createdAt: p.createdAt,
                })),
            },
        };
    } catch (error) {
        console.error("Get admin dashboard error:", error);
        return { success: false, message: "Failed to fetch dashboard data" };
    }
};

const getSystemStats = async () => {
    try {
        const [
            totalUsers,
            userGrowthLastMonth,
            totalProjects,
            projectGrowthLastMonth,
            totalTasks,
            taskGrowthLastMonth,
            activeUsersLast30Days,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({
                where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            }),
            prisma.project.count(),
            prisma.project.count({
                where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            }),
            prisma.task.count(),
            prisma.task.count({
                where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            }),
            prisma.user.count({
                where: {
                    sessions: { some: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
                },
            }),
        ]);

        // Get daily active users for chart
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyActiveUsers = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
            SELECT 
                DATE("createdAt") as date,
                COUNT(DISTINCT "userId") as count
            FROM sessions
            WHERE "createdAt" >= ${thirtyDaysAgo}
            GROUP BY DATE("createdAt")
            ORDER BY date ASC
        `;

        return {
            success: true,
            data: {
                totalUsers,
                userGrowthLastMonth,
                totalProjects,
                projectGrowthLastMonth,
                totalTasks,
                taskGrowthLastMonth,
                activeUsersLast30Days,
                dailyActiveUsers: dailyActiveUsers.map(d => ({
                    date: d.date,
                    count: Number(d.count),
                })),
            },
        };
    } catch (error) {
        console.error("Get system stats error:", error);
        return { success: false, message: "Failed to fetch system stats" };
    }
};

const getAllUsers = async (params: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
    verified?: string;
    sort?: string;
}) => {
    try {
        const { page, limit, search, role, status, verified, sort } = params;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        if (role && role !== "all") {
            where.role = role as any;
        }

        if (status && status !== "all") {
            where.accountStatus = status as any;
        }

        if (verified === "verified") {
            where.emailVerified = true;
        } else if (verified === "unverified") {
            where.emailVerified = false;
        }

        let orderBy: any = { createdAt: "desc" };
        if (sort === "oldest") {
            orderBy = { createdAt: "asc" };
        } else if (sort === "name_asc") {
            orderBy = { name: "asc" };
        } else if (sort === "name_desc") {
            orderBy = { name: "desc" };
        }

        const [users, totalItems] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    emailVerified: true,
                    image: true,
                    role: true,
                    accountStatus: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            assignedTasks: true,
                            projectMembers: true,
                            activities: true,
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
        ]);

        const stats = {
            total: await prisma.user.count(),
            admin: await prisma.user.count({ where: { role: "ADMIN" } }),
            projectManager: await prisma.user.count({ where: { role: "PROJECT_MANAGER" } }),
            teamMember: await prisma.user.count({ where: { role: "TEAM_MEMBER" } }),
            active: await prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
            suspended: await prisma.user.count({ where: { accountStatus: "SUSPENDED" } }),
        };

        return {
            success: true,
            data: {
                users: users.map(user => ({
                    ...user,
                    emailVerified: user.emailVerified,
                })),
                stats,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
            },
        };
    } catch (error) {
        console.error("Get all users error:", error);
        return { success: false, message: "Failed to fetch users" };
    }
};

const getUserDetails = async (userId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                role: true,
                accountStatus: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        assignedTasks: true,
                        projectMembers: true,
                        activities: true,
                        comments: true,
                    },
                },
            },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        // Get user's projects
        const projects = await prisma.projectMember.findMany({
            where: { userId },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        deadline: true,
                    },
                },
            },
        });

        // Get user's recent activities
        const recentActivities = await prisma.activity.findMany({
            where: { userId },
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
                project: { select: { name: true } },
                task: { select: { title: true } },
            },
        });

        return {
            success: true,
            data: {
                ...user,
                projects: projects.map(p => p.project),
                recentActivities: recentActivities.map(a => ({
                    action: a.action,
                    message: a.message,
                    createdAt: a.createdAt,
                    projectName: a.project?.name,
                    taskTitle: a.task?.title,
                })),
            },
        };
    } catch (error) {
        console.error("Get user details error:", error);
        return { success: false, message: "Failed to fetch user details" };
    }
};

const updateUserRole = async (userId: string, newRole: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole as any },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ADMIN_ACTION",
                message: `User ${user.email} role changed to ${newRole}`,
                userId: userId,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Update user role error:", error);
        return { success: false, message: "Failed to update user role" };
    }
};

const suspendUser = async (userId: string, adminId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        if (user.role === "ADMIN") {
            return { success: false, message: "Cannot suspend another admin" };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { accountStatus: "SUSPENDED" },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ADMIN_ACTION",
                message: `User ${user.email} was suspended`,
                userId: adminId,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Suspend user error:", error);
        return { success: false, message: "Failed to suspend user" };
    }
};

const activateUser = async (userId: string, adminId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        await prisma.user.update({
            where: { id: userId },
            data: { accountStatus: "ACTIVE" },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ADMIN_ACTION",
                message: `User ${user.email} was activated`,
                userId: adminId,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Activate user error:", error);
        return { success: false, message: "Failed to activate user" };
    }
};

const deleteUser = async (userId: string, adminId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ADMIN_ACTION",
                message: `User ${user.email} was deleted`,
                userId: adminId,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Delete user error:", error);
        return { success: false, message: "Failed to delete user" };
    }
};

const bulkUserAction = async (
    action: string,
    userIds: string[],
    adminId: string
) => {
    try {
        let successCount = 0;
        let failCount = 0;

        for (const userId of userIds) {
            let result;
            switch (action) {
                case "suspend":
                    result = await suspendUser(userId, adminId);
                    break;
                case "activate":
                    result = await activateUser(userId, adminId);
                    break;
                case "delete":
                    result = await deleteUser(userId, adminId);
                    break;
                default:
                    result = { success: false };
            }

            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        return {
            success: true,
            message: `${successCount} user(s) ${action}ed successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
        };
    } catch (error) {
        console.error("Bulk user action error:", error);
        return { success: false, message: "Failed to perform bulk action" };
    }
};

const getAllProjects = async (params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    sort?: string;
}) => {
    try {
        const { page, limit, search, status, sort } = params;
        const skip = (page - 1) * limit;

        let orderBy: any = { createdAt: "desc" };
        if (sort === "oldest") {
            orderBy = { createdAt: "asc" };
        } else if (sort === "name_asc") {
            orderBy = { name: "asc" };
        } else if (sort === "name_desc") {
            orderBy = { name: "desc" };
        } else if (sort === "deadline_asc") {
            orderBy = { deadline: "asc" };
        }

        const where: Prisma.ProjectWhereInput = {};

        if (search) {
            where.name = { contains: search, mode: "insensitive" };
        }

        if (status && status !== "all") {
            where.status = status as any;
        }

        const [projects, totalItems] = await Promise.all([
            prisma.project.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    _count: {
                        select: { tasks: true, members: true },
                    },
                    tasks: {
                        where: { status: "COMPLETED" },
                        select: { id: true },
                    },
                },
            }),
            prisma.project.count({ where }),
        ]);

        const projectsWithProgress = projects.map(project => {
            const totalTasks = project._count.tasks;
            const completedTasks = project.tasks.length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return {
                id: project.id,
                name: project.name,
                description: project.description,
                status: project.status,
                deadline: project.deadline,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                stats: {
                    totalTasks,
                    completedTasks,
                    memberCount: project._count.members,
                    progress,
                },
            };
        });

        const stats = {
            total: await prisma.project.count(),
            active: await prisma.project.count({ where: { status: "ACTIVE" } }),
            completed: await prisma.project.count({ where: { status: "COMPLETED" } }),
            onHold: await prisma.project.count({ where: { status: "ON_HOLD" } }),
        };

        return {
            success: true,
            data: {
                projects: projectsWithProgress,
                stats,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
            },
        };
    } catch (error) {
        console.error("Get all projects error:", error);
        return { success: false, message: "Failed to fetch projects" };
    }
};

const deleteProject = async (projectId: string, adminId: string) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        await prisma.project.delete({
            where: { id: projectId },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ADMIN_ACTION",
                message: `Project "${project.name}" was deleted by admin`,
                userId: adminId,
            },
        });

        return {
            success: true,
            message: `Project "${project.name}" deleted successfully`,
        };
    } catch (error) {
        console.error("Delete project error:", error);
        return { success: false, message: "Failed to delete project" };
    }
};

const getSystemLogs = async (params: {
    page: number;
    limit: number;
    level?: string;
    days: number;
}) => {
    try {
        const { page, limit, level, days } = params;
        const skip = (page - 1) * limit;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Note: This is a placeholder. In production, you'd have a Logs table
        // For now, using activities as system logs
        const where: any = {
            createdAt: { gte: startDate },
        };

        const logs = await prisma.activity.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        const totalItems = await prisma.activity.count({ where });

        return {
            success: true,
            data: {
                logs: logs.map(log => ({
                    id: log.id,
                    level: "INFO",
                    action: log.action,
                    message: log.message,
                    userId: log.userId,
                    userName: log.user?.name,
                    userEmail: log.user?.email,
                    createdAt: log.createdAt,
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
        console.error("Get system logs error:", error);
        return { success: false, message: "Failed to fetch system logs" };
    }
};

const getAuditTrail = async (params: {
    page: number;
    limit: number;
    userId?: string;
    action?: string;
    days: number;
}) => {
    try {
        const { page, limit, userId, action, days } = params;
        const skip = (page - 1) * limit;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const where: any = {
            createdAt: { gte: startDate },
        };

        if (userId) {
            where.userId = userId;
        }

        if (action) {
            where.action = action;
        }

        const activities = await prisma.activity.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
                project: {
                    select: { id: true, name: true },
                },
                task: {
                    select: { id: true, title: true },
                },
            },
        });

        const totalItems = await prisma.activity.count({ where });

        return {
            success: true,
            data: {
                activities: activities.map(a => ({
                    id: a.id,
                    action: a.action,
                    message: a.message,
                    details: a.details,
                    createdAt: a.createdAt,
                    user: a.user,
                    project: a.project,
                    task: a.task,
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
        console.error("Get audit trail error:", error);
        return { success: false, message: "Failed to fetch audit trail" };
    }
};

const clearCache = async () => {
    try {
        // Implement cache clearing logic based on your caching strategy
        // This could be Redis flush, Next.js revalidation, etc.

        // Placeholder for cache clearing
        return { success: true };
    } catch (error) {
        console.error("Clear cache error:", error);
        return { success: false, message: "Failed to clear cache" };
    }
};

export const adminService = {
    getDashboard,
    getSystemStats,
    getAllUsers,
    getUserDetails,
    updateUserRole,
    suspendUser,
    activateUser,
    deleteUser,
    bulkUserAction,
    getAllProjects,
    deleteProject,
    getSystemLogs,
    getAuditTrail,
    clearCache,
};