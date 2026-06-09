import { prisma } from "../../lib/prisma";

const addMember = async (
    projectId: string,
    memberId: string,
    userId: string,
    userRole: string
) => {
    try {
        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        // Check permissions (PM or Admin can add members)
        const canAdd = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";
        if (!canAdd) {
            return { success: false, message: "Only Project Managers and Admins can add members" };
        }

        // Check if user exists
        const userToAdd = await prisma.user.findUnique({
            where: { id: memberId },
        });

        if (!userToAdd) {
            return { success: false, message: "User not found" };
        }

        // Check if already a member
        const existingMember = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: memberId,
                    projectId,
                },
            },
        });

        if (existingMember) {
            return { success: false, message: "User is already a member of this project" };
        }

        // Add member to project
        const projectMember = await prisma.projectMember.create({
            data: {
                userId: memberId,
                projectId,
                joinedAt: new Date(),
            },
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
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "MEMBER_ADDED",
                message: `${userToAdd.name} was added to project "${project.name}"`,
                userId,
                projectId,
            },
        });

        // Create notification for the new member
        if (memberId !== userId) {
            await prisma.notification.create({
                data: {
                    userId: memberId,
                    type: "PROJECT_INVITE",
                    message: `You have been added to project "${project.name}"`,
                    metadata: {
                        projectId,
                        addedBy: userId,
                    },
                },
            });
        }

        return {
            success: true,
            data: projectMember.user,
        };
    } catch (error) {
        console.error("Add member error:", error);
        return { success: false, message: "Failed to add member to project" };
    }
};

const removeMember = async (
    projectId: string,
    memberId: string,
    userId: string,
    userRole: string
) => {
    try {
        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return { success: false, message: "Project not found" };
        }

        // Check permissions (PM or Admin can remove members)
        const canRemove = userRole === "ADMIN" || userRole === "PROJECT_MANAGER";
        if (!canRemove) {
            return { success: false, message: "Only Project Managers and Admins can remove members" };
        }

        // Cannot remove yourself if you're the only PM? (Optional check)
        if (memberId === userId && userRole === "PROJECT_MANAGER") {
            const pmCount = await prisma.projectMember.count({
                where: {
                    projectId,
                    user: { role: "PROJECT_MANAGER" },
                },
            });
            if (pmCount === 1) {
                return { success: false, message: "Cannot remove yourself as the only Project Manager" };
            }
        }

        // Check if member exists in project
        const member = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: memberId,
                    projectId,
                },
            },
            include: {
                user: true,
            },
        });

        if (!member) {
            return { success: false, message: "User is not a member of this project" };
        }

        // Remove member
        await prisma.projectMember.delete({
            where: {
                userId_projectId: {
                    userId: memberId,
                    projectId,
                },
            },
        });

        // Unassign all tasks assigned to this member in this project
        await prisma.task.updateMany({
            where: {
                projectId,
                assignedTo: memberId,
            },
            data: {
                assignedTo: null,
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "MEMBER_REMOVED",
                message: `${member.user.name} was removed from project "${project.name}"`,
                userId,
                projectId,
            },
        });

        return {
            success: true,
            message: `Member removed from project "${project.name}" successfully`,
        };
    } catch (error) {
        console.error("Remove member error:", error);
        return { success: false, message: "Failed to remove member from project" };
    }
};

const getProjectMembers = async (
    projectId: string,
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
        search?: string;
    }
) => {
    try {
        const { page, limit, search } = params;
        const skip = (page - 1) * limit;

        // Check if user has access to this project
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

        // Build where clause
        const where: any = {
            projectId,
        };

        if (search) {
            where.user = {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            };
        }

        const members = await prisma.projectMember.findMany({
            where,
            skip,
            take: limit,
            orderBy: { joinedAt: "desc" },
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
        });

        const totalItems = await prisma.projectMember.count({ where });

        // Get member task counts
        const membersWithTaskCounts = await Promise.all(
            members.map(async (member) => {
                const taskCounts = await prisma.task.aggregate({
                    where: {
                        projectId,
                        assignedTo: member.user.id,
                    },
                    _count: true
                });

                const completedTasks = await prisma.task.count({
                    where: {
                        projectId,
                        assignedTo: member.user.id,
                        status: "COMPLETED",
                    },
                });

                return {
                    ...member.user,
                    joinedAt: member.joinedAt,
                    taskCount: taskCounts._count,
                    completedTasks,
                };
            })
        );

        return {
            success: true,
            data: {
                members: membersWithTaskCounts,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
            },
        };
    } catch (error) {
        console.error("Get project members error:", error);
        return { success: false, message: "Failed to fetch project members" };
    }
};

const checkMembership = async (projectId: string, userId: string) => {
    try {
        const member = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        });

        return {
            success: true,
            data: {
                isMember: !!member,
            },
        };
    } catch (error) {
        console.error("Check membership error:", error);
        return { success: false, message: "Failed to check membership" };
    }
};

const getUserProjects = async (
    userId: string,
    params: {
        page: number;
        limit: number;
    }
) => {
    try {
        const { page, limit } = params;
        const skip = (page - 1) * limit;

        const memberships = await prisma.projectMember.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { joinedAt: "desc" },
            include: {
                project: {
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
                },
            },
        });

        const totalItems = await prisma.projectMember.count({ where: { userId } });

        // Calculate progress for each project
        const projectsWithProgress = memberships.map(membership => {
            const totalTasks = membership.project._count.tasks;
            const completedTasks = membership.project.tasks.length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return {
                id: membership.project.id,
                name: membership.project.name,
                description: membership.project.description,
                deadline: membership.project.deadline,
                status: membership.project.status,
                joinedAt: membership.joinedAt,
                stats: {
                    totalTasks,
                    completedTasks,
                    memberCount: membership.project._count.members,
                    progress,
                },
            };
        });

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
            },
        };
    } catch (error) {
        console.error("Get user projects error:", error);
        return { success: false, message: "Failed to fetch user projects" };
    }
};

const getAvailableMembers = async (
    projectId: string,
    search?: string,
    limit: number = 20
) => {
    try {
        // Get existing member IDs
        const existingMembers = await prisma.projectMember.findMany({
            where: { projectId },
            select: { userId: true },
        });

        const existingMemberIds = existingMembers.map(m => m.userId);

        // Build where clause for available users
        const where: any = {
            id: { notIn: existingMemberIds },
            accountStatus: "ACTIVE",
            role: { in: ["PROJECT_MANAGER", "TEAM_MEMBER"] },
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        const availableUsers = await prisma.user.findMany({
            where,
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

        return {
            success: true,
            data: availableUsers,
        };
    } catch (error) {
        console.error("Get available members error:", error);
        return { success: false, message: "Failed to fetch available members" };
    }
};

const getUserProjectsById = async (
    userId: string,
    params: {
        page: number;
        limit: number;
    }
) => {
    try {
        const { page, limit } = params;
        const skip = (page - 1) * limit;

        // Get all project memberships for the user
        const memberships = await prisma.projectMember.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { joinedAt: "desc" },
            include: {
                project: {
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
                },
            },
        });

        const totalItems = await prisma.projectMember.count({
            where: { userId },
        });

        // Calculate progress for each project
        const projectsWithProgress = memberships.map(membership => {
            const totalTasks = membership.project._count.tasks;
            const completedTasks = membership.project.tasks.length;
            const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

            return {
                id: membership.project.id,
                name: membership.project.name,
                description: membership.project.description,
                status: membership.project.status,
                deadline: membership.project.deadline,
                joinedAt: membership.joinedAt,
                stats: {
                    totalTasks,
                    completedTasks,
                    memberCount: membership.project._count.members,
                    progress,
                },
            };
        });

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
            },
        };
    } catch (error) {
        console.error("Get user projects by ID error:", error);
        return { success: false, message: "Failed to fetch user projects" };
    }
};

export const projectMembersService = {
    addMember,
    removeMember,
    getProjectMembers,
    checkMembership,
    getUserProjects,
    getAvailableMembers,
    getUserProjectsById
};