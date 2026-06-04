import { prisma } from "../../lib/prisma";

const getPlatformStats = async () => {
    try {
        const [
            totalUsers,
            totalProjects,
            totalTasks,
            completedTasks,
            activeProjects,
            completedProjects,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.project.count(),
            prisma.task.count(),
            prisma.task.count({ where: { status: "COMPLETED" } }),
            prisma.project.count({ where: { status: "ACTIVE" } }),
            prisma.project.count({ where: { status: "COMPLETED" } }),
        ]);

        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // Get recent signups (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const newUsersThisWeek = await prisma.user.count({
            where: { createdAt: { gte: sevenDaysAgo } },
        });

        // Get task distribution by priority
        const tasksByPriority = await prisma.task.groupBy({
            by: ["priority"],
            _count: true,
        });

        // Get task distribution by status
        const tasksByStatus = await prisma.task.groupBy({
            by: ["status"],
            _count: true,
        });

        return {
            success: true,
            data: {
                totalUsers,
                totalProjects,
                totalTasks,
                completedTasks,
                completionRate,
                activeProjects,
                completedProjects,
                newUsersThisWeek,
                tasksByPriority: tasksByPriority.map(t => ({
                    priority: t.priority,
                    count: t._count,
                })),
                tasksByStatus: tasksByStatus.map(t => ({
                    status: t.status,
                    count: t._count,
                })),
            },
        };
    } catch (error) {
        console.error("Get platform stats error:", error);
        return { success: false, message: "Failed to fetch platform stats" };
    }
};

const getUserStats = async (targetUserId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        const [
            totalTasks,
            completedTasks,
            inProgressTasks,
            todoTasks,
            overdueTasks,
            projectsCount,
            commentsCount,
        ] = await Promise.all([
            prisma.task.count({ where: { assignedTo: targetUserId } }),
            prisma.task.count({ where: { assignedTo: targetUserId, status: "COMPLETED" } }),
            prisma.task.count({ where: { assignedTo: targetUserId, status: "IN_PROGRESS" } }),
            prisma.task.count({ where: { assignedTo: targetUserId, status: "TODO" } }),
            prisma.task.count({
                where: {
                    assignedTo: targetUserId,
                    status: { not: "COMPLETED" },
                    dueDate: { lt: new Date() },
                },
            }),
            prisma.projectMember.count({ where: { userId: targetUserId } }),
            prisma.comment.count({ where: { userId: targetUserId } }),
        ]);

        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // Get tasks by priority for this user
        const tasksByPriority = await prisma.task.groupBy({
            by: ["priority"],
            where: { assignedTo: targetUserId },
            _count: true,
        });

        // Get recent activity
        const recentActivity = await prisma.activity.findMany({
            where: { userId: targetUserId },
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                project: { select: { name: true } },
                task: { select: { title: true } },
            },
        });

        return {
            success: true,
            data: {
                user,
                stats: {
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    todoTasks,
                    overdueTasks,
                    completionRate,
                    projectsCount,
                    commentsCount,
                },
                tasksByPriority: tasksByPriority.map(t => ({
                    priority: t.priority,
                    count: t._count,
                })),
                recentActivity: recentActivity.map(a => ({
                    action: a.action,
                    message: a.message,
                    createdAt: a.createdAt,
                    projectName: a.project?.name,
                    taskTitle: a.task?.title,
                })),
                memberSince: user.createdAt,
            },
        };
    } catch (error) {
        console.error("Get user stats error:", error);
        return { success: false, message: "Failed to fetch user stats" };
    }
};

const getProjectStats = async (projectId: string, userId: string, userRole: string) => {
    try {
        // Check access
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

        const projectData = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                _count: {
                    select: {
                        tasks: true,
                        members: true,
                    },
                },
            },
        });

        if (!projectData) {
            return { success: false, message: "Project not found" };
        }

        const [
            completedTasks,
            inProgressTasks,
            todoTasks,
            overdueTasks,
            tasksByPriority,
            memberStats,
        ] = await Promise.all([
            prisma.task.count({ where: { projectId, status: "COMPLETED" } }),
            prisma.task.count({ where: { projectId, status: "IN_PROGRESS" } }),
            prisma.task.count({ where: { projectId, status: "TODO" } }),
            prisma.task.count({
                where: {
                    projectId,
                    status: { not: "COMPLETED" },
                    dueDate: { lt: new Date() },
                },
            }),
            prisma.task.groupBy({
                by: ["priority"],
                where: { projectId },
                _count: true,
            }),
            prisma.projectMember.findMany({
                where: { projectId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
            }),
        ]);

        const totalTasks = projectData._count.tasks;
        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // Calculate member workload
        const memberWorkload = await Promise.all(
            memberStats.map(async (member) => {
                const memberTasks = await prisma.task.count({
                    where: { projectId, assignedTo: member.userId },
                });
                const memberCompleted = await prisma.task.count({
                    where: { projectId, assignedTo: member.userId, status: "COMPLETED" },
                });
                return {
                    user: member.user,
                    totalTasks: memberTasks,
                    completedTasks: memberCompleted,
                    completionRate: memberTasks === 0 ? 0 : Math.round((memberCompleted / memberTasks) * 100),
                };
            })
        );

        // Calculate days remaining
        const daysUntilDeadline = Math.ceil(
            (new Date(projectData.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
            success: true,
            data: {
                id: projectData.id,
                name: projectData.name,
                status: projectData.status,
                deadline: projectData.deadline,
                daysUntilDeadline,
                isOverdue: daysUntilDeadline < 0 && projectData.status !== "COMPLETED",
                stats: {
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    todoTasks,
                    overdueTasks,
                    completionRate,
                    memberCount: projectData._count.members,
                },
                tasksByPriority: tasksByPriority.map(t => ({
                    priority: t.priority,
                    count: t._count,
                })),
                memberWorkload,
            },
        };
    } catch (error) {
        console.error("Get project stats error:", error);
        return { success: false, message: "Failed to fetch project stats" };
    }
};

const getTaskStats = async (taskId: string, userId: string, userRole: string) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                comments: {
                    select: {
                        id: true,
                        createdAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
                attachments: {
                    select: {
                        id: true,
                        filename: true,
                        size: true,
                        createdAt: true,
                        uploader: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
                activities: {
                    select: {
                        id: true,
                        action: true,
                        message: true,
                        createdAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        });

        if (!task) {
            return { success: false, message: "Task not found" };
        }

        // Check access
        const isAssigned = task.assignedTo === userId;
        const isProjectMember = task.project.members.length > 0;
        const hasAccess = isAssigned || isProjectMember || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this task" };
        }

        // Calculate days until due
        const daysUntilDue = Math.ceil(
            (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get comment count
        const commentCount = await prisma.comment.count({ where: { taskId } });
        const attachmentCount = await prisma.attachment.count({ where: { taskId } });

        return {
            success: true,
            data: {
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                daysUntilDue,
                isOverdue: daysUntilDue < 0 && task.status !== "COMPLETED",
                assignedTo: task.assignedUser,
                project: {
                    id: task.project.id,
                    name: task.project.name,
                },
                stats: {
                    commentCount,
                    attachmentCount,
                    activityCount: task.activities.length,
                },
                recentComments: task.comments,
                recentAttachments: task.attachments,
                recentActivity: task.activities,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            },
        };
    } catch (error) {
        console.error("Get task stats error:", error);
        return { success: false, message: "Failed to fetch task stats" };
    }
};

const getTeamStats = async () => {
    try {
        const [
            totalMembers,
            activeMembers,
            adminCount,
            projectManagerCount,
            teamMemberCount,
            totalTasksAssigned,
            completedTasks,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
            prisma.user.count({ where: { role: "ADMIN" } }),
            prisma.user.count({ where: { role: "PROJECT_MANAGER" } }),
            prisma.user.count({ where: { role: "TEAM_MEMBER" } }),
            prisma.task.count({ where: { assignedTo: { not: null } } }),
            prisma.task.count({ where: { status: "COMPLETED" } }),
        ]);

        // Get top performers (users with most completed tasks)
        const topPerformers = await prisma.user.findMany({
            where: { accountStatus: "ACTIVE" },
            take: 5,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                _count: {
                    select: {
                        assignedTasks: true,
                    },
                },
            },
            orderBy: {
                assignedTasks: {
                    _count: "desc",
                },
            },
        });

        // Get actual completed tasks count for top performers
        const topPerformersWithStats = await Promise.all(
            topPerformers.map(async (user) => {
                const completedCount = await prisma.task.count({
                    where: { assignedTo: user.id, status: "COMPLETED" },
                });
                return {
                    ...user,
                    completedTasks: completedCount,
                    completionRate: user._count.assignedTasks === 0 
                        ? 0 
                        : Math.round((completedCount / user._count.assignedTasks) * 100),
                };
            })
        );

        // Get team workload distribution
        const workloadDistribution = await prisma.user.findMany({
            where: { accountStatus: "ACTIVE" },
            select: {
                id: true,
                name: true,
                role: true,
                _count: {
                    select: {
                        assignedTasks: true,
                    },
                },
            },
            orderBy: {
                assignedTasks: {
                    _count: "desc",
                },
            },
        });

        return {
            success: true,
            data: {
                overview: {
                    totalMembers,
                    activeMembers,
                    adminCount,
                    projectManagerCount,
                    teamMemberCount,
                    totalTasksAssigned,
                    completedTasks,
                    overallCompletionRate: totalTasksAssigned === 0 
                        ? 0 
                        : Math.round((completedTasks / totalTasksAssigned) * 100),
                },
                topPerformers: topPerformersWithStats,
                workloadDistribution: workloadDistribution.map(w => ({
                    userId: w.id,
                    name: w.name,
                    role: w.role,
                    taskCount: w._count.assignedTasks,
                })),
            },
        };
    } catch (error) {
        console.error("Get team stats error:", error);
        return { success: false, message: "Failed to fetch team stats" };
    }
};

const getActivityStats = async (userId: string, userRole: string, days: number) => {
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

        // Daily activity counts
        const dailyActivities = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
            SELECT 
                DATE("createdAt") as date,
                COUNT(*) as count
            FROM activities
            WHERE "createdAt" >= ${startDate}
            GROUP BY DATE("createdAt")
            ORDER BY date ASC
        `;

        // Activity by action - removed take, will limit after sort
        const actionsCountRaw = await prisma.activity.groupBy({
            by: ["action"],
            where,
            _count: true,
        });

        // Sort manually by count descending and take top 10
        const actionsCount = actionsCountRaw
            .sort((a, b) => b._count - a._count)
            .slice(0, 10);

        // Most active users - removed take, will limit after sort
        const activeUsersRaw = await prisma.activity.groupBy({
            by: ["userId"],
            where,
            _count: true,
        });

        // Sort manually by count descending and take top 5
        const activeUsersSorted = activeUsersRaw
            .sort((a, b) => b._count - a._count)
            .slice(0, 5);

        // Get user details for active users
        const activeUsersWithDetails = await Promise.all(
            activeUsersSorted.map(async (u) => {
                const user = await prisma.user.findUnique({
                    where: { id: u.userId },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                });
                return {
                    userId: u.userId,
                    name: user?.name,
                    email: user?.email,
                    image: user?.image,
                    activityCount: u._count,
                };
            })
        );

        return {
            success: true,
            data: {
                dailyActivities: dailyActivities.map(d => ({
                    date: d.date,
                    count: Number(d.count),
                })),
                actionsCount: actionsCount.map(a => ({
                    action: a.action,
                    count: a._count,
                })),
                activeUsers: activeUsersWithDetails,
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

const getCompletionStats = async (userId: string, userRole: string) => {
    try {
        // Build where clause based on role
        let taskWhere: any = {};

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);
            taskWhere.projectId = { in: projectIds };
        }

        // Completion by priority
        const completionByPriority = await Promise.all(
            ["HIGH", "MEDIUM", "LOW"].map(async (priority) => {
                const total = await prisma.task.count({
                    where: { ...taskWhere, priority: priority as any },
                });
                const completed = await prisma.task.count({
                    where: { ...taskWhere, priority: priority as any, status: "COMPLETED" },
                });
                return {
                    priority,
                    total,
                    completed,
                    rate: total === 0 ? 0 : Math.round((completed / total) * 100),
                };
            })
        );

        // Completion trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);

        const monthlyCompletion = await prisma.$queryRaw<{ month: Date; total: bigint; completed: bigint }[]>`
            SELECT 
                DATE_TRUNC('month', "createdAt") as month,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed
            FROM tasks
            WHERE "createdAt" >= ${sixMonthsAgo}
            GROUP BY DATE_TRUNC('month', "createdAt")
            ORDER BY month ASC
        `;

        // Average completion time (in days)
        const completedTasks = await prisma.task.findMany({
            where: { ...taskWhere, status: "COMPLETED" },
            select: { createdAt: true, updatedAt: true },
        });

        let avgCompletionDays = 0;
        if (completedTasks.length > 0) {
            const totalDays = completedTasks.reduce((sum, task) => {
                const days = (task.updatedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                return sum + days;
            }, 0);
            avgCompletionDays = Math.round(totalDays / completedTasks.length);
        }

        return {
            success: true,
            data: {
                completionByPriority,
                monthlyCompletion: monthlyCompletion.map(m => ({
                    month: m.month,
                    total: Number(m.total),
                    completed: Number(m.completed),
                    rate: Number(m.total) === 0 ? 0 : Math.round((Number(m.completed) / Number(m.total)) * 100),
                })),
                avgCompletionDays,
                totalCompletedTasks: completedTasks.length,
            },
        };
    } catch (error) {
        console.error("Get completion stats error:", error);
        return { success: false, message: "Failed to fetch completion stats" };
    }
};

export const statsService = {
    getPlatformStats,
    getUserStats,
    getProjectStats,
    getTaskStats,
    getTeamStats,
    getActivityStats,
    getCompletionStats,
};