import { Prisma } from "../../generated/prisma";
import { prisma } from "../../lib/prisma";

const getDashboard = async (userId: string, userRole: string) => {
    try {
        const [kpiCards, projectSummaries, upcomingDeadlines, highPriorityTasks, memberWorkload, charts, recentActivities] = await Promise.all([
            getKPICards(userId, userRole),
            getProjectSummaries(userId, userRole, 5),
            getUpcomingDeadlines(userId, userRole, 10),
            getHighPriorityTasks(userId, userRole, 5),
            getMemberWorkload(userId, userRole, undefined, 10),
            getCharts(userId, userRole, 30),
            getRecentActivities(userId, userRole, 10),
        ]);

        return {
            success: true,
            data: {
                kpiCards: kpiCards.data,
                projectSummaries: projectSummaries.data,
                upcomingDeadlines: upcomingDeadlines.data,
                highPriorityTasks: highPriorityTasks.data,
                memberWorkload: memberWorkload.data,
                charts: charts.data,
                recentActivities: recentActivities.data,
            },
        };
    } catch (error) {
        console.error("Get dashboard error:", error);
        return { success: false, message: "Failed to fetch dashboard data" };
    }
};

const getKPICards = async (userId: string, userRole: string) => {
    try {
        // Get projects the user has access to
        let projectWhere: any = {};

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            projectWhere = {
                members: { some: { userId } },
            };
        }

        // Get all projects accessible to user
        const accessibleProjects = await prisma.project.findMany({
            where: projectWhere,
            select: { id: true },
        });

        const projectIds = accessibleProjects.map(p => p.id);

        // For admins and PMs, get all projects
        const taskWhere: any = {};
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            taskWhere.projectId = { in: projectIds };
        }

        // Get task counts
        const [totalProjects, totalTasks, completedTasks, overdueTasks] = await Promise.all([
            prisma.project.count({ where: projectWhere }),
            prisma.task.count({ where: taskWhere }),
            prisma.task.count({ where: { ...taskWhere, status: "COMPLETED" } }),
            prisma.task.count({
                where: {
                    ...taskWhere,
                    status: { not: "COMPLETED" },
                    dueDate: { lt: new Date() },
                },
            }),
        ]);

        const pendingTasks = totalTasks - completedTasks;
        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // Get active projects count
        const activeProjects = await prisma.project.count({
            where: { ...projectWhere, status: "ACTIVE" },
        });

        return {
            success: true,
            data: {
                totalProjects,
                activeProjects,
                totalTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                completionRate,
            },
        };
    } catch (error) {
        console.error("Get KPI cards error:", error);
        return { success: false, message: "Failed to fetch KPI data" };
    }
};

const getProjectSummaries = async (userId: string, userRole: string, limit: number) => {
    try {
        let projectWhere: any = {};

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            projectWhere = {
                members: { some: { userId } },
            };
        }

        const projects = await prisma.project.findMany({
            where: projectWhere,
            take: limit,
            orderBy: { deadline: "asc" },
            include: {
                _count: {
                    select: { tasks: true },
                },
                tasks: {
                    where: { status: "COMPLETED" },
                    select: { id: true },
                },
            },
        });

        const projectSummaries = projects.map(project => {
            const totalTasks = project._count.tasks;
            const completedTasks = project.tasks.length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
            const daysUntilDeadline = Math.ceil(
                (new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                id: project.id,
                name: project.name,
                status: project.status,
                deadline: project.deadline,
                daysUntilDeadline,
                totalTasks,
                completedTasks,
                progress,
                isOverdue: daysUntilDeadline < 0 && project.status !== "COMPLETED",
            };
        });

        return {
            success: true,
            data: projectSummaries,
        };
    } catch (error) {
        console.error("Get project summaries error:", error);
        return { success: false, message: "Failed to fetch project summaries" };
    }
};

const getUpcomingDeadlines = async (userId: string, userRole: string, limit: number) => {
    try {
        let taskWhere: any = {
            status: { not: "COMPLETED" },
            dueDate: { gte: new Date() },
        };

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            taskWhere = {
                ...taskWhere,
                OR: [
                    { assignedTo: userId },
                    { project: { members: { some: { userId } } } },
                ],
            };
        }

        const tasks = await prisma.task.findMany({
            where: taskWhere,
            take: limit,
            orderBy: { dueDate: "asc" },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        const formattedTasks = tasks.map(task => {
            const daysUntil = Math.ceil(
                (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                id: task.id,
                title: task.title,
                dueDate: task.dueDate,
                daysUntil,
                priority: task.priority,
                project: task.project,
                assignedTo: task.assignedUser,
            };
        });

        return {
            success: true,
            data: formattedTasks,
        };
    } catch (error) {
        console.error("Get upcoming deadlines error:", error);
        return { success: false, message: "Failed to fetch upcoming deadlines" };
    }
};

const getHighPriorityTasks = async (userId: string, userRole: string, limit: number) => {
    try {
        let taskWhere: any = {
            priority: "HIGH",
            status: { not: "COMPLETED" },
        };

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            taskWhere = {
                ...taskWhere,
                OR: [
                    { assignedTo: userId },
                    { project: { members: { some: { userId } } } },
                ],
            };
        }

        const tasks = await prisma.task.findMany({
            where: taskWhere,
            take: limit,
            orderBy: [
                { dueDate: "asc" },
                { createdAt: "desc" },
            ],
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        return {
            success: true,
            data: tasks.map(task => ({
                id: task.id,
                title: task.title,
                dueDate: task.dueDate,
                status: task.status,
                project: task.project,
                assignedTo: task.assignedUser,
            })),
        };
    } catch (error) {
        console.error("Get high priority tasks error:", error);
        return { success: false, message: "Failed to fetch high priority tasks" };
    }
};

const getMemberWorkload = async (
    userId: string,
    userRole: string,
    projectId?: string,
    limit: number = 10
) => {
    try {
        // Get team members (users with access to projects the current user can see)
        let memberWhere: any = {
            accountStatus: "ACTIVE",
        };

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            // Regular members can only see other members in their projects
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);

            const projectMembers = await prisma.projectMember.findMany({
                where: { projectId: { in: projectIds } },
                select: { userId: true },
            });

            const memberIds = [...new Set(projectMembers.map(m => m.userId))];
            memberWhere.id = { in: memberIds };
        }

        // Apply project filter if provided
        let taskWhere: any = {};
        if (projectId) {
            taskWhere.projectId = projectId;
        } else if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);
            taskWhere.projectId = { in: projectIds };
        }

        const members = await prisma.user.findMany({
            where: memberWhere,
            take: limit,
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
            },
        });

        const workload = await Promise.all(
            members.map(async (member) => {
                const taskCounts = await prisma.task.aggregate({
                    where: {
                        assignedTo: member.id,
                        ...taskWhere,
                    },
                    _count: true,
                });

                const completedTasks = await prisma.task.count({
                    where: {
                        assignedTo: member.id,
                        status: "COMPLETED",
                        ...taskWhere,
                    },
                });

                const inProgressTasks = await prisma.task.count({
                    where: {
                        assignedTo: member.id,
                        status: "IN_PROGRESS",
                        ...taskWhere,
                    },
                });

                const todoTasks = await prisma.task.count({
                    where: {
                        assignedTo: member.id,
                        status: "TODO",
                        ...taskWhere,
                    },
                });

                const overdueTasks = await prisma.task.count({
                    where: {
                        assignedTo: member.id,
                        status: { not: "COMPLETED" },
                        dueDate: { lt: new Date() },
                        ...taskWhere,
                    },
                });

                return {
                    ...member,
                    totalTasks: taskCounts._count,
                    completedTasks,
                    inProgressTasks,
                    todoTasks,
                    overdueTasks,
                    completionRate:
                        taskCounts._count === 0
                            ? 0
                            : Math.round((completedTasks / taskCounts._count) * 100),
                };
            })
        );

        // Sort by total tasks descending
        workload.sort((a, b) => b.totalTasks - a.totalTasks);

        return {
            success: true,
            data: workload,
        };
    } catch (error) {
        console.error("Get member workload error:", error);
        return { success: false, message: "Failed to fetch member workload" };
    }
};

const getCharts = async (userId: string, userRole: string, days: number) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Determine accessible projects
        let projectWhere: any = {};
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            projectWhere = {
                members: { some: { userId } },
            };
        }

        const accessibleProjects = await prisma.project.findMany({
            where: projectWhere,
            select: { id: true },
        });
        const projectIds = accessibleProjects.map(p => p.id);

        // Task where clause
        let taskWhere: any = {};
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            taskWhere.projectId = { in: projectIds };
        }

        // Tasks by priority
        const tasksByPriority = await prisma.task.groupBy({
            by: ["priority"],
            where: taskWhere,
            _count: true,
        });

        // Tasks by status
        const tasksByStatus = await prisma.task.groupBy({
            by: ["status"],
            where: taskWhere,
            _count: true,
        });

        // Tasks completed over time - fixed raw query
        let tasksOverTime: { date: Date; count: bigint }[] = [];

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER" && projectIds.length > 0) {
            // Non-admin with specific project IDs
            tasksOverTime = await prisma.$queryRaw`
                SELECT 
                    DATE("updatedAt") as date,
                    COUNT(*) as count
                FROM tasks
                WHERE "updatedAt" >= ${startDate}
                    AND status = 'COMPLETED'
                    AND "projectId" IN (${Prisma.join(projectIds)})
                GROUP BY DATE("updatedAt")
                ORDER BY date ASC
            `;
        } else if (userRole === "ADMIN" || userRole === "PROJECT_MANAGER") {
            // Admin or PM - see all tasks
            tasksOverTime = await prisma.$queryRaw`
                SELECT 
                    DATE("updatedAt") as date,
                    COUNT(*) as count
                FROM tasks
                WHERE "updatedAt" >= ${startDate}
                    AND status = 'COMPLETED'
                GROUP BY DATE("updatedAt")
                ORDER BY date ASC
            `;
        }

        // Project progress trend (top 5 projects by task count)
        const projectProgress = await prisma.project.findMany({
            where: {
                ...(userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER"
                    ? { id: { in: projectIds } }
                    : {}),
            },
            take: 5,
            include: {
                _count: {
                    select: { tasks: true },
                },
                tasks: {
                    where: { status: "COMPLETED" },
                    select: { id: true },
                },
            },
        });

        const projectProgressData = projectProgress.map(project => ({
            name: project.name,
            totalTasks: project._count.tasks,
            completedTasks: project.tasks.length,
            progress:
                project._count.tasks === 0
                    ? 0
                    : Math.round((project.tasks.length / project._count.tasks) * 100),
        }));

        return {
            success: true,
            data: {
                tasksByPriority: tasksByPriority.map(t => ({
                    priority: t.priority,
                    count: t._count,
                })),
                tasksByStatus: tasksByStatus.map(t => ({
                    status: t.status,
                    count: t._count,
                })),
                tasksOverTime: tasksOverTime.map(t => ({
                    date: t.date,
                    count: Number(t.count),
                })),
                projectProgress: projectProgressData,
            },
        };
    } catch (error) {
        console.error("Get charts error:", error);
        return { success: false, message: "Failed to fetch chart data" };
    }
};

const getRecentActivities = async (userId: string, userRole: string, limit: number) => {
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

export const dashboardService = {
    getDashboard,
    getKPICards,
    getProjectSummaries,
    getUpcomingDeadlines,
    getHighPriorityTasks,
    getMemberWorkload,
    getCharts,
    getRecentActivities,
};