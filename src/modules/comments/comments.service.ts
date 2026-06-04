import { prisma } from "../../lib/prisma";

const createComment = async (
    taskId: string,
    userId: string,
    content: string,
    parentId: string | null
) => {
    try {
        // Check if task exists and user has access
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

        // Check access
        const isProjectMember = task.project.members.length > 0;
        const userRole = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        const hasAccess = isProjectMember || 
                          userRole?.role === "ADMIN" || 
                          userRole?.role === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this task" };
        }

        // If replying, check parent comment exists and belongs to same task
        if (parentId) {
            const parentComment = await prisma.comment.findFirst({
                where: {
                    id: parentId,
                    taskId,
                },
            });

            if (!parentComment) {
                return { success: false, message: "Parent comment not found" };
            }
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                userId,
                taskId,
                parentId: parentId || null,
            },
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
                        projectId: true,
                    },
                },
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "COMMENT_ADDED",
                message: `Comment added to task "${comment.task.title}"`,
                userId,
                projectId: comment.task.projectId,
                taskId,
            },
        });

        // Create notification for task assignee (if not the commenter)
        if (task.assignedTo && task.assignedTo !== userId) {
            await prisma.notification.create({
                data: {
                    userId: task.assignedTo,
                    type: "COMMENT_ADDED",
                    message: `New comment on task "${task.title}" by ${comment.user.name}`,
                    metadata: {
                        taskId,
                        commentId: comment.id,
                        projectId: comment.task.projectId,
                    },
                },
            });
        }

        // If replying, notify parent comment author
        if (parentId && parentId !== userId) {
            const parentComment = await prisma.comment.findUnique({
                where: { id: parentId },
                select: { userId: true },
            });

            if (parentComment && parentComment.userId !== userId) {
                await prisma.notification.create({
                    data: {
                        userId: parentComment.userId,
                        type: "COMMENT_ADDED",
                        message: `${comment.user.name} replied to your comment on task "${task.title}"`,
                        metadata: {
                            taskId,
                            commentId: comment.id,
                            projectId: comment.task.projectId,
                        },
                    },
                });
            }
        }

        return {
            success: true,
            data: {
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                updatedAt: comment.updatedAt,
                user: comment.user,
                parentId: comment.parentId,
                taskId: comment.taskId,
            },
        };
    } catch (error) {
        console.error("Create comment error:", error);
        return { success: false, message: "Failed to create comment" };
    }
};

const updateComment = async (
    commentId: string,
    userId: string,
    userRole: string,
    content: string
) => {
    try {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        projectId: true,
                    },
                },
            },
        });

        if (!comment) {
            return { success: false, message: "Comment not found" };
        }

        // Check permissions (owner or admin)
        const canEdit = comment.userId === userId || userRole === "ADMIN";

        if (!canEdit) {
            return { success: false, message: "You don't have permission to edit this comment" };
        }

        const updatedComment = await prisma.comment.update({
            where: { id: commentId },
            data: {
                content,
                isEdited: true,
                updatedAt: new Date(),
            },
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
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "COMMENT_ADDED",
                message: `Comment on task "${comment.task.title}" was edited`,
                userId,
                projectId: comment.task.projectId,
                taskId: comment.taskId,
            },
        });

        return {
            success: true,
            data: {
                id: updatedComment.id,
                content: updatedComment.content,
                isEdited: updatedComment.isEdited,
                updatedAt: updatedComment.updatedAt,
                user: updatedComment.user,
            },
        };
    } catch (error) {
        console.error("Update comment error:", error);
        return { success: false, message: "Failed to update comment" };
    }
};

const deleteComment = async (
    commentId: string,
    userId: string,
    userRole: string
) => {
    try {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        projectId: true,
                    },
                },
                replies: {
                    select: { id: true },
                },
            },
        });

        if (!comment) {
            return { success: false, message: "Comment not found" };
        }

        // Check permissions (owner or admin)
        const canDelete = comment.userId === userId || userRole === "ADMIN";

        if (!canDelete) {
            return { success: false, message: "You don't have permission to delete this comment" };
        }

        // Delete all replies first (cascade might handle this, but being explicit)
        if (comment.replies.length > 0) {
            await prisma.comment.deleteMany({
                where: { parentId: commentId },
            });
        }

        await prisma.comment.delete({
            where: { id: commentId },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "COMMENT_DELETED",
                message: `Comment on task "${comment.task.title}" was deleted`,
                userId,
                projectId: comment.task.projectId,
                taskId: comment.taskId,
            },
        });

        return {
            success: true,
            message: "Comment deleted successfully",
        };
    } catch (error) {
        console.error("Delete comment error:", error);
        return { success: false, message: "Failed to delete comment" };
    }
};

const getTaskComments = async (
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

        // Get top-level comments (parentId = null)
        const where: any = {
            taskId,
            parentId: null,
        };

        const comments = await prisma.comment.findMany({
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
                replies: {
                    orderBy: { createdAt: "asc" },
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
        });

        const totalItems = await prisma.comment.count({ where });

        return {
            success: true,
            data: {
                comments,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
            },
        };
    } catch (error) {
        console.error("Get task comments error:", error);
        return { success: false, message: "Failed to fetch comments" };
    }
};

const getUserComments = async (
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

        const where: any = { userId };

        const comments = await prisma.comment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                task: {
                    select: {
                        id: true,
                        title: true,
                        projectId: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                replies: {
                    select: { id: true },
                },
            },
        });

        const totalItems = await prisma.comment.count({ where });

        const stats = {
            total: await prisma.comment.count({ where: { userId } }),
        };

        return {
            success: true,
            data: {
                comments: comments.map(comment => ({
                    id: comment.id,
                    content: comment.content,
                    isEdited: comment.isEdited,
                    createdAt: comment.createdAt,
                    updatedAt: comment.updatedAt,
                    task: comment.task,
                    replyCount: comment.replies.length,
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
        console.error("Get user comments error:", error);
        return { success: false, message: "Failed to fetch your comments" };
    }
};

const getCommentById = async (
    commentId: string,
    userId: string,
    userRole: string
) => {
    try {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
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
                        projectId: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                replies: {
                    orderBy: { createdAt: "asc" },
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
                parent: {
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
        });

        if (!comment) {
            return { success: false, message: "Comment not found" };
        }

        // Check access
        const task = await prisma.task.findFirst({
            where: { id: comment.taskId },
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
            return { success: false, message: "Associated task not found" };
        }

        const isProjectMember = task.project.members.length > 0;
        const hasAccess = isProjectMember || 
                          userRole === "ADMIN" || 
                          userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this comment" };
        }

        return {
            success: true,
            data: comment,
        };
    } catch (error) {
        console.error("Get comment by ID error:", error);
        return { success: false, message: "Failed to fetch comment" };
    }
};

export const commentsService = {
    createComment,
    updateComment,
    deleteComment,
    getTaskComments,
    getUserComments,
    getCommentById,
};