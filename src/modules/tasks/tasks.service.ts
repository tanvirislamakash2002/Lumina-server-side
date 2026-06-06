import { Prisma, Priority, TaskStatus } from "../../generated/prisma";
import { prisma } from "../../lib/prisma";

const getAllTasks = async (
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        priority?: string;
        projectId?: string;
        assignedTo?: string;
        sortBy: string;
    }
) => {
    try {
        const { page, limit, search, status, priority, projectId, assignedTo, sortBy } = params;
        const skip = (page - 1) * limit;

        // Build where clause based on user role
        let where: Prisma.TaskWhereInput = {};

        // Non-admin users can only see tasks from their projects
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);
            where.projectId = { in: projectIds };
        }

        // Apply filters
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        if (status && status !== "all") {
            where.status = status as TaskStatus;
        }

        if (priority && priority !== "all") {
            where.priority = priority as Priority;
        }

        if (projectId && projectId !== "all") {
            where.projectId = projectId;
        }

        if (assignedTo && assignedTo !== "all") {
            where.assignedTo = assignedTo;
        }

        // Build order by
        let orderBy: Prisma.TaskOrderByWithRelationInput = {};
        switch (sortBy) {
            case "oldest":
                orderBy = { createdAt: "asc" };
                break;
            case "deadline_asc":
                orderBy = { dueDate: "asc" };
                break;
            case "deadline_desc":
                orderBy = { dueDate: "desc" };
                break;
            case "priority_high":
                orderBy = { priority: "asc" };
                break;
            case "title_asc":
                orderBy = { title: "asc" };
                break;
            default:
                orderBy = { createdAt: "desc" };
        }

        const tasks = await prisma.task.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                assignedUser: {
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
                _count: {
                    select: {
                        comments: true,
                        attachments: true,
                    },
                },
            },
        });

        const totalItems = await prisma.task.count({ where });

        // Get stats
        const stats = await prisma.$transaction([
            prisma.task.count({ where }),
            prisma.task.count({ where: { ...where, status: "TODO" } }),
            prisma.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
            prisma.task.count({ where: { ...where, status: "COMPLETED" } }),
            prisma.task.count({
                where: {
                    ...where,
                    status: { not: "COMPLETED" },
                    dueDate: { lt: new Date() },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                tasks: tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    status: task.status,
                    assignedTo: task.assignedUser,
                    project: task.project,
                    commentCount: task._count.comments,
                    attachmentCount: task._count.attachments,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                stats: {
                    total: stats[0],
                    todo: stats[1],
                    inProgress: stats[2],
                    completed: stats[3],
                    overdue: stats[4],
                },
            },
        };
    } catch (error) {
        console.error("Get all tasks error:", error);
        return { success: false, message: "Failed to fetch tasks" };
    }
};

const createTask = async (
    projectId: string,
    userId: string,
    userRole: string,
    data: {
        title: string;
        description?: string;
        assignedTo?: string;
        dueDate?: Date;
        priority?: string;
        status?: string;
    }
) => {
    try {
        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        // Check permissions (PM or Admin can create tasks)
        const canCreate = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";
        if (!canCreate) {
            return { success: false, message: "Only Project Managers and Admins can create tasks" };
        }

        // Check for duplicate task title in same project
        const existingTask = await prisma.task.findFirst({
            where: {
                projectId,
                title: data.title,
            },
        });

        if (existingTask) {
            return { success: false, message: `Task "${data.title}" already exists in this project` };
        }

        // If assignedTo is provided, verify user exists
        if (data.assignedTo) {
            const assignedUser = await prisma.user.findUnique({
                where: { id: data.assignedTo },
            });
            if (!assignedUser) {
                return { success: false, message: "Assigned user not found" };
            }
        }

        const task = await prisma.task.create({
            data: {
                title: data.title,
                description: data.description || null,
                assignedTo: data.assignedTo || null,
                dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
                priority: (data.priority as Priority) || "MEDIUM",
                status: (data.status as TaskStatus) || "TODO",
                projectId,
            },
            include: {
                assignedUser: {
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

        // Log activity
        await prisma.activity.create({
            data: {
                action: "TASK_CREATED",
                message: `Task "${task.title}" was created in project "${task.project.name}"`,
                userId,
                projectId,
                taskId: task.id,
            },
        });

        // Create notification for assigned user
        if (data.assignedTo && data.assignedTo !== userId) {
            await prisma.notification.create({
                data: {
                    userId: data.assignedTo,
                    type: "TASK_ASSIGNED",
                    message: `You have been assigned to task "${task.title}" in project "${task.project.name}"`,
                    metadata: {
                        taskId: task.id,
                        projectId,
                        assignedBy: userId,
                    },
                },
            });
        }

        return {
            success: true,
            data: {
                id: task.id,
                title: task.title,
                description: task.description,
                assignedTo: task.assignedUser,
                dueDate: task.dueDate,
                priority: task.priority,
                status: task.status,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            },
        };
    } catch (error) {
        console.error("Create task error:", error);
        return { success: false, message: "Failed to create task" };
    }
};

const getTasks = async (
    projectId: string,
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        priority?: string;
        assignedTo?: string;
        sortBy: string;
    }
) => {
    try {
        const { page, limit, search, status, priority, assignedTo, sortBy } = params;
        const skip = (page - 1) * limit;

        // Check if user has access to project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { members: { some: { userId } } },
                    { createdBy: userId }, // If you have createdBy field
                ],
            },
        });

        const hasAccess = project || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this project" };
        }

        // Build where clause
        const where: Prisma.TaskWhereInput = { projectId };

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        if (status && status !== "all") {
            where.status = status as TaskStatus;
        }

        if (priority && priority !== "all") {
            where.priority = priority as Priority;
        }

        if (assignedTo && assignedTo !== "all") {
            where.assignedTo = assignedTo;
        }

        // Build order by
        let orderBy: Prisma.TaskOrderByWithRelationInput = {};
        switch (sortBy) {
            case "oldest":
                orderBy = { createdAt: "asc" };
                break;
            case "deadline_asc":
                orderBy = { dueDate: "asc" };
                break;
            case "deadline_desc":
                orderBy = { dueDate: "desc" };
                break;
            case "priority_high":
                orderBy = { priority: "asc" };
                break;
            case "title_asc":
                orderBy = { title: "asc" };
                break;
            default:
                orderBy = { createdAt: "desc" };
        }

        const tasks = await prisma.task.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
                assignedUser: {
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
                _count: {
                    select: {
                        comments: true,
                        attachments: true,
                    },
                },
            },
        });

        const totalItems = await prisma.task.count({ where });

        // Get stats
        const stats = await prisma.$transaction([
            prisma.task.count({ where: { projectId } }),
            prisma.task.count({ where: { projectId, status: "TODO" } }),
            prisma.task.count({ where: { projectId, status: "IN_PROGRESS" } }),
            prisma.task.count({ where: { projectId, status: "COMPLETED" } }),
            prisma.task.count({
                where: {
                    projectId,
                    status: { not: "COMPLETED" },
                    dueDate: { lt: new Date() },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                tasks: tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    status: task.status,
                    assignedTo: task.assignedUser,
                    commentCount: task._count.comments,
                    attachmentCount: task._count.attachments,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                stats: {
                    total: stats[0],
                    todo: stats[1],
                    inProgress: stats[2],
                    completed: stats[3],
                    overdue: stats[4],
                },
            },
        };
    } catch (error) {
        console.error("Get tasks error:", error);
        return { success: false, message: "Failed to fetch tasks" };
    }
};

const getTaskById = async (taskId: string, userId: string, userRole: string) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                assignedUser: {
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
                        status: true,
                        members: {
                            include: {
                                user: {
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
                },
                comments: {
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
                    },
                },
                attachments: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        uploader: {
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

        if (!task) {
            return { success: false, message: "Task not found" };
        }

        // Check access
        const isAssigned = task.assignedTo === userId;
        const isProjectMember = task.project.members.some(m => m.userId === userId);
        const hasAccess = isAssigned || isProjectMember || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this task" };
        }

        return {
            success: true,
            data: {
                id: task.id,
                title: task.title,
                description: task.description,
                dueDate: task.dueDate,
                priority: task.priority,
                status: task.status,
                assignedTo: task.assignedUser,
                project: {
                    id: task.project.id,
                    name: task.project.name,
                    status: task.project.status,
                },
                comments: task.comments,
                attachments: task.attachments,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            },
        };
    } catch (error) {
        console.error("Get task by ID error:", error);
        return { success: false, message: "Failed to fetch task" };
    }
};

const updateTask = async (
    taskId: string,
    userId: string,
    userRole: string,
    data: {
        title?: string;
        description?: string;
        assignedTo?: string | null;
        dueDate?: Date;
        priority?: string;
        status?: string;
    }
) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: true,
            },
        });

        if (!task) {
            return { success: false, message: "Task not found" };
        }

        // Check permissions
        const isAssigned = task.assignedTo === userId;
        const canEdit = userRole === "ADMIN" || userRole === "PROJECT_MANAGER" || isAssigned;

        if (!canEdit) {
            return { success: false, message: "You don't have permission to update this task" };
        }

        // Prevent assigning completed tasks
        if (data.assignedTo !== undefined && task.status === "COMPLETED") {
            return { success: false, message: "Completed tasks cannot be reassigned" };
        }

        // Check for duplicate title if title is being changed
        if (data.title && data.title !== task.title) {
            const existingTask = await prisma.task.findFirst({
                where: {
                    projectId: task.projectId,
                    title: data.title,
                    id: { not: taskId },
                },
            });
            if (existingTask) {
                return { success: false, message: `Task "${data.title}" already exists in this project` };
            }
        }

        // If assignedTo is being changed, verify user exists
        if (data.assignedTo && data.assignedTo !== task.assignedTo) {
            const assignedUser = await prisma.user.findUnique({
                where: { id: data.assignedTo },
            });
            if (!assignedUser) {
                return { success: false, message: "Assigned user not found" };
            }
        }

        const updateData: Prisma.TaskUpdateInput = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description || null;

        // Handle assignedTo using connect/disconnect
        if (data.assignedTo !== undefined) {
            if (data.assignedTo === null) {
                updateData.assignedUser = { disconnect: true };
            } else {
                updateData.assignedUser = { connect: { id: data.assignedTo } };
            }
        }

        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
        if (data.priority !== undefined) updateData.priority = data.priority as Priority;
        if (data.status !== undefined) updateData.status = data.status as TaskStatus;

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                assignedUser: {
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

        // Log activity
        await prisma.activity.create({
            data: {
                action: "TASK_UPDATED",
                message: `Task "${updatedTask.title}" was updated`,
                userId,
                projectId: task.projectId,
                taskId: task.id,
            },
        });

        // Create notification for newly assigned user
        if (data.assignedTo && data.assignedTo !== task.assignedTo && data.assignedTo !== userId) {
            await prisma.notification.create({
                data: {
                    userId: data.assignedTo,
                    type: "TASK_ASSIGNED",
                    message: `You have been assigned to task "${updatedTask.title}" in project "${updatedTask.project.name}"`,
                    metadata: {
                        taskId: updatedTask.id,
                        projectId: task.projectId,
                        assignedBy: userId,
                    },
                },
            });
        }

        return {
            success: true,
            data: updatedTask,
        };
    } catch (error) {
        console.error("Update task error:", error);
        return { success: false, message: "Failed to update task" };
    }
};

const deleteTask = async (taskId: string, userId: string, userRole: string) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: true,
            },
        });

        if (!task) {
            return { success: false, message: "Task not found" };
        }

        const canDelete = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!canDelete) {
            return { success: false, message: "Only Project Managers and Admins can delete tasks" };
        }

        await prisma.task.delete({
            where: { id: taskId },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "TASK_DELETED",
                message: `Task "${task.title}" was deleted from project "${task.project.name}"`,
                userId,
                projectId: task.projectId,
            },
        });

        return {
            success: true,
            message: `Task "${task.title}" deleted successfully`,
        };
    } catch (error) {
        console.error("Delete task error:", error);
        return { success: false, message: "Failed to delete task" };
    }
};

const updateTaskStatus = async (
    taskId: string,
    userId: string,
    userRole: string,
    status: string
) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: true,
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!task) {
            return { success: false, message: "Task not found" };
        }

        // Check permissions (assigned user, PM, or Admin can update status)
        const isAssigned = task.assignedTo === userId;
        const canUpdate = isAssigned || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

        if (!canUpdate) {
            return { success: false, message: "You don't have permission to update this task's status" };
        }

        const oldStatus = task.status;

        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: { status: status as TaskStatus },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "TASK_STATUS_CHANGED",
                message: `Task "${task.title}" status changed from ${oldStatus} to ${status}`,
                userId,
                projectId: task.projectId,
                taskId: task.id,
            },
        });

        // Create notification for project manager if task completed
        if (status === "COMPLETED" && oldStatus !== "COMPLETED") {
            const projectManager = await prisma.projectMember.findFirst({
                where: {
                    projectId: task.projectId,
                    user: { role: "PROJECT_MANAGER" },
                },
                include: { user: true },
            });

            if (projectManager && projectManager.userId !== userId) {
                await prisma.notification.create({
                    data: {
                        userId: projectManager.userId,
                        type: "TASK_STATUS_CHANGED",
                        message: `Task "${task.title}" has been completed by ${task.assignedUser?.name || "assigned user"}`,
                        metadata: {
                            taskId: task.id,
                            projectId: task.projectId,
                        },
                    },
                });
            }
        }

        return {
            success: true,
            data: {
                id: updatedTask.id,
                status: updatedTask.status,
                projectId: updatedTask.projectId,
            },
        };
    } catch (error) {
        console.error("Update task status error:", error);
        return { success: false, message: "Failed to update task status" };
    }
};

const getTasksByUser = async (
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        projectId?: string;
    }
) => {
    try {
        const { page, limit, search, status, projectId } = params;
        const skip = (page - 1) * limit;

        const where: Prisma.TaskWhereInput = { assignedTo: userId };

        if (search) { 
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        if (status && status !== "all") {
            where.status = status as TaskStatus;
        }

        if (projectId) {
            where.projectId = projectId;
        }

        const tasks = await prisma.task.findMany({
            where,
            skip,
            take: limit,
            orderBy: { dueDate: "asc" },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                    },
                },
                _count: {
                    select: {
                        comments: true,
                        attachments: true,
                    },
                },
            },
        });

        const totalItems = await prisma.task.count({ where });

        const stats = {
            total: await prisma.task.count({ where: { assignedTo: userId } }),
            todo: await prisma.task.count({ where: { assignedTo: userId, status: "TODO" } }),
            inProgress: await prisma.task.count({ where: { assignedTo: userId, status: "IN_PROGRESS" } }),
            completed: await prisma.task.count({ where: { assignedTo: userId, status: "COMPLETED" } }),
            overdue: await prisma.task.count({
                where: {
                    assignedTo: userId,
                    status: { not: "COMPLETED" },
                    dueDate: { lt: new Date() },
                },
            }),
        };

        return {
            success: true,
            data: {
                tasks: tasks.map(task => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    dueDate: task.dueDate,
                    priority: task.priority,
                    status: task.status,
                    project: task.project,
                    commentCount: task._count.comments,
                    attachmentCount: task._count.attachments,
                    createdAt: task.createdAt,
                    updatedAt: task.updatedAt,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                stats,
            },
        };
    } catch (error) {
        console.error("Get tasks by user error:", error);
        return { success: false, message: "Failed to fetch your tasks" };
    }
};

const getOverdueTasks = async (userId: string, userRole: string) => {
    try {
        const where: Prisma.TaskWhereInput = {
            status: { not: "COMPLETED" },
            dueDate: { lt: new Date() },
        };

        // If not admin or PM, only show their own tasks
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            where.assignedTo = userId;
        }

        const tasks = await prisma.task.findMany({
            where,
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
                        email: true,
                        image: true,
                    },
                },
            },
            take: 20,
        });

        return {
            success: true,
            data: tasks,
        };
    } catch (error) {
        console.error("Get overdue tasks error:", error);
        return { success: false, message: "Failed to fetch overdue tasks" };
    }
};

export const tasksService = {
    getAllTasks,
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    updateTaskStatus,
    getTasksByUser,
    getOverdueTasks,
};