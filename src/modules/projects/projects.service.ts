import { Prisma, ProjectStatus } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

const createProject = async (
    userId: string,
    userRole: string,
    data: {
        name: string;
        description?: string;
        deadline?: Date;
        status?: ProjectStatus;
    }
) => {
    try {
        // Only ADMIN and PROJECT_MANAGER can create projects
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            return {
                success: false,
                message: "Only Project Managers and Admins can create projects",
            };
        }

        const project = await prisma.project.create({
            data: {
                name: data.name,
                description: data.description || null,
                deadline: data.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                status: data.status || "ACTIVE",
            },
        });

        // Add creator as a member of the project
        await prisma.projectMember.create({
            data: {
                userId,
                projectId: project.id,
                joinedAt: new Date(),
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "PROJECT_CREATED",
                message: `Project "${project.name}" was created`,
                userId,
                projectId: project.id,
            },
        });

        return {
            success: true,
            data: {
                id: project.id,
                name: project.name,
                description: project.description,
                deadline: project.deadline,
                status: project.status,
                createdAt: project.createdAt,
            },
        };
    } catch (error) {
        console.error("Create project error:", error);
        return { success: false, message: "Failed to create project" };
    }
};

const getProjects = async (
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        sortBy: string;
    }
) => {
    try {
        const { page, limit, search, status, sortBy } = params;
        const skip = (page - 1) * limit;

        // Build where clause
        let where: Prisma.ProjectWhereInput = {};

        // Admins and PMs see all projects
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            // Team members only see projects they're part of
            where = {
                members: {
                    some: { userId },
                },
            };
        }

        if (search) {
            where.name = { contains: search, mode: "insensitive" };
        }

        if (status && status !== "all") {
            where.status = status as ProjectStatus;
        }

        // Build order by
        let orderBy: Prisma.ProjectOrderByWithRelationInput = {};
        switch (sortBy) {
            case "oldest":
                orderBy = { createdAt: "asc" };
                break;
            case "deadline_asc":
                orderBy = { deadline: "asc" };
                break;
            case "deadline_desc":
                orderBy = { deadline: "desc" };
                break;
            case "name_asc":
                orderBy = { name: "asc" };
                break;
            default:
                orderBy = { createdAt: "desc" };
        }

        const projects = await prisma.project.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                _count: {
                    select: {
                        tasks: true,
                        members: true,
                    },
                },
                tasks: {
                    where: { status: "COMPLETED" },
                    select: { id: true },
                },
            },
        });

        const totalItems = await prisma.project.count({ where });

        // Calculate progress for each project
        const projectsWithProgress = projects.map(project => {
            const totalTasks = project._count.tasks;
            const completedTasks = project.tasks.length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return {
                id: project.id,
                name: project.name,
                description: project.description,
                deadline: project.deadline,
                status: project.status,
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

        // Get summary stats for dashboard
        const [total, active, completed, onHold] = await Promise.all([
            prisma.project.count(),
            prisma.project.count({ where: { status: "ACTIVE" } }),
            prisma.project.count({ where: { status: "COMPLETED" } }),
            prisma.project.count({ where: { status: "ON_HOLD" } }),
        ]);

        return {
            success: true,
            data: {
                projects: projectsWithProgress,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                stats: {
                    total,
                    active,
                    completed,
                    onHold,
                },
            },
        };
    } catch (error) {
        console.error("Get projects error:", error);
        return { success: false, message: "Failed to fetch projects" };
    }
};

const getProjectById = async (projectId: string, userId: string, userRole: string) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                                role: true,
                            },
                        },
                    },
                },
                tasks: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        assignedUser: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true,
                            },
                        },
                    },
                },
            },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        // Check access
        const isMember = project.members.some(m => m.userId === userId);
        const hasAccess = isMember || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this project" };
        }

        // Calculate progress
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(t => t.status === "COMPLETED").length;
        const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // Group tasks by status
        const tasksByStatus = {
            TODO: project.tasks.filter(t => t.status === "TODO").length,
            IN_PROGRESS: project.tasks.filter(t => t.status === "IN_PROGRESS").length,
            COMPLETED: completedTasks,
        };

        return {
            success: true,
            data: {
                id: project.id,
                name: project.name,
                description: project.description,
                deadline: project.deadline,
                status: project.status,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                progress,
                stats: {
                    totalTasks,
                    completedTasks,
                    memberCount: project.members.length,
                    tasksByStatus,
                },
                members: project.members.map(m => m.user),
                tasks: project.tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    description: t.description,
                    dueDate: t.dueDate,
                    priority: t.priority,
                    status: t.status,
                    assignedTo: t.assignedUser,
                    createdAt: t.createdAt,
                })),
            },
        };
    } catch (error) {
        console.error("Get project by ID error:", error);
        return { success: false, message: "Failed to fetch project" };
    }
};

const updateProject = async (
    projectId: string,
    userId: string,
    userRole: string,
    data: {
        name?: string;
        description?: string;
        deadline?: Date;
        status?: ProjectStatus;
    }
) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    where: { userId },
                },
            },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        const isMember = project.members.length > 0;
        const canEdit = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!canEdit) {
            return { success: false, message: "Only Project Managers and Admins can update projects" };
        }

        const updateData: Prisma.ProjectUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description || null;
        if (data.deadline !== undefined) updateData.deadline = data.deadline;
        if (data.status !== undefined) updateData.status = data.status;

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: updateData,
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "PROJECT_UPDATED",
                message: `Project "${updatedProject.name}" was updated`,
                userId,
                projectId: project.id,
            },
        });

        return {
            success: true,
            data: updatedProject,
        };
    } catch (error) {
        console.error("Update project error:", error);
        return { success: false, message: "Failed to update project" };
    }
};

const deleteProject = async (projectId: string, userId: string, userRole: string) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        const canDelete = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!canDelete) {
            return { success: false, message: "Only Project Managers and Admins can delete projects" };
        }

        // Delete project (cascade will handle tasks, members, activities)
        await prisma.project.delete({
            where: { id: projectId },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "PROJECT_DELETED",
                message: `Project "${project.name}" was deleted`,
                userId,
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

const bulkDeleteProjects = async (
    projectIds: string[],
    userId: string,
    userRole: string
) => {
    try {
        // Check permissions
        const canDelete = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";
        if (!canDelete) {
            return { success: false, message: "Only Project Managers and Admins can delete projects" };
        }

        let successCount = 0;
        let failCount = 0;
        const deletedProjects: string[] = [];

        for (const projectId of projectIds) {
            try {
                // Check if project exists
                const project = await prisma.project.findUnique({
                    where: { id: projectId },
                });

                if (!project) {
                    failCount++;
                    continue;
                }

                // Delete project (cascade will handle tasks, members, activities)
                await prisma.project.delete({
                    where: { id: projectId },
                });

                // Log activity for each deleted project
                await prisma.activity.create({
                    data: {
                        action: "PROJECT_DELETED",
                        message: `Project "${project.name}" was deleted`,
                        userId,
                    },
                });

                successCount++;
                deletedProjects.push(project.name);
            } catch (error) {
                console.error(`Failed to delete project ${projectId}:`, error);
                failCount++;
            }
        }

        return {
            success: true,
            message: `${successCount} project(s) deleted successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
            data: {
                successCount,
                failCount,
                deletedProjects,
            },
        };
    } catch (error) {
        console.error("Bulk delete projects error:", error);
        return { success: false, message: "Failed to delete projects" };
    }
};

const getProjectStats = async (projectId: string, userId: string, userRole: string) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    where: { userId },
                },
            },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        const isMember = project.members.length > 0;
        const hasAccess = isMember || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this project" };
        }

        // Get task counts
        const [totalTasks, completedTasks, inProgressTasks, todoTasks, overdueTasks, tasksByPriority, tasksByStatus, projectMembers] = await Promise.all([
            prisma.task.count({ where: { projectId } }),
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
            prisma.task.groupBy({
                by: ["status"],
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

        // Get workload for each member
        const workload = await Promise.all(
            projectMembers.map(async (member) => {
                const tasks = await prisma.task.findMany({
                    where: {
                        projectId,
                        assignedTo: member.userId,
                    },
                    select: { status: true },
                });

                return {
                    userId: member.user.id,
                    name: member.user.name,
                    image: member.user.image,
                    totalTasks: tasks.length,
                    completedTasks: tasks.filter(t => t.status === "COMPLETED").length,
                    inProgressTasks: tasks.filter(t => t.status === "IN_PROGRESS").length,
                    todoTasks: tasks.filter(t => t.status === "TODO").length,
                };
            })
        );

        return {
            success: true,
            data: {
                totalTasks,
                completedTasks,
                inProgressTasks,
                todoTasks,
                overdueTasks,
                tasksByPriority: tasksByPriority.map(t => ({
                    priority: t.priority,
                    count: t._count,
                })),
                tasksByStatus: tasksByStatus.map(t => ({
                    status: t.status,
                    count: t._count,
                })),
                memberWorkload: workload,
            },
        };
    } catch (error) {
        console.error("Get project stats error:", error);
        return { success: false, message: "Failed to fetch project stats" };
    }
};

const getProjectProgress = async (projectId: string, userId: string, userRole: string) => {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: {
                    where: { userId },
                },
            },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        const isMember = project.members.length > 0;
        const hasAccess = isMember || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this project" };
        }

        const totalTasks = await prisma.task.count({ where: { projectId } });
        const completedTasks = await prisma.task.count({
            where: { projectId, status: "COMPLETED" },
        });
        const inProgressTasks = await prisma.task.count({
            where: { projectId, status: "IN_PROGRESS" },
        });
        const todoTasks = totalTasks - completedTasks - inProgressTasks;

        const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        // Get tasks completed over time for chart
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const tasksCompletedOverTime = await prisma.task.findMany({
            where: {
                projectId,
                status: "COMPLETED",
                updatedAt: { gte: thirtyDaysAgo },
            },
            select: { updatedAt: true },
        });

        // Group by date - using optional chaining
        const completionByDate: Record<string, number> = {};
        tasksCompletedOverTime.forEach(task => {
            const date = task.updatedAt?.toISOString().split("T")[0];
            if (date) {
                completionByDate[date] = (completionByDate[date] || 0) + 1;
            }
        });

        const chartData = Object.entries(completionByDate).map(([date, count]) => ({ date, count }));

        return {
            success: true,
            data: {
                progress,
                totalTasks,
                completedTasks,
                inProgressTasks,
                todoTasks,
                chartData,
            },
        };
    } catch (error) {
        console.error("Get project progress error:", error);
        return { success: false, message: "Failed to fetch project progress" };
    }
};

export const projectsService = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    bulkDeleteProjects,
    getProjectStats,
    getProjectProgress,
};