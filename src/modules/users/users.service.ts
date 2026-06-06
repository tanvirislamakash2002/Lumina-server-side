import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";

const getProfile = async (userId: string) => {
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
            },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        return { success: true, data: user };
    } catch (error) {
        console.error("Get profile error:", error);
        return { success: false, message: "Failed to fetch profile" };
    }
};

const updateProfile = async (
    userId: string,
    data: { name?: string; image?: string }
) => {
    try {
        const updateData: Prisma.UserUpdateInput = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.image !== undefined) updateData.image = data.image;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
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
            },
        });

        return { success: true, data: updatedUser };
    } catch (error) {
        console.error("Update profile error:", error);
        return { success: false, message: "Failed to update profile" };
    }
};

const changePassword = async (
    userId: string,
    data: { currentPassword: string; newPassword: string }
) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                accounts: {
                    where: { providerId: "email" },
                    take: 1,
                },
            },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        const account = user.accounts[0];
        if (!account || !account.password) {
            return { success: false, message: "No password set for this account" };
        }

        const isValidPassword = await bcrypt.compare(data.currentPassword, account.password);
        if (!isValidPassword) {
            return { success: false, message: "Current password is incorrect" };
        }

        const hashedPassword = await bcrypt.hash(data.newPassword, 10);

        await prisma.account.update({
            where: { id: account.id },
            data: { password: hashedPassword },
        });

        return { success: true };
    } catch (error) {
        console.error("Change password error:", error);
        return { success: false, message: "Failed to change password" };
    }
};

const deleteAccount = async (userId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        // Delete user (cascade will handle related records)
        await prisma.user.delete({
            where: { id: userId },
        });

        return { success: true };
    } catch (error) {
        console.error("Delete account error:", error);
        return { success: false, message: "Failed to delete account" };
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
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role && role !== "all") {
            where.role = role as any;
        }

        // Add status filter
        if (status && status !== "all") {
            where.accountStatus = status as any;
        }

        // Add verified filter
        if (verified === "verified") {
            where.emailVerified = true;
        } else if (verified === "unverified") {
            where.emailVerified = false;
        }

        // Add sort options
        let orderBy: any = { createdAt: "desc" };
        if (sort === "oldest") {
            orderBy = { createdAt: "asc" };
        } else if (sort === "name_asc") {
            orderBy = { name: "asc" };
        } else if (sort === "name_desc") {
            orderBy = { name: "desc" };
        }

        const users = await prisma.user.findMany({
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
                    },
                },
            },
        });

        const totalItems = await prisma.user.count({ where });

        const stats = await prisma.$transaction([
            prisma.user.count(),
            prisma.user.count({ where: { role: "ADMIN" } }),
            prisma.user.count({ where: { role: "PROJECT_MANAGER" } }),
            prisma.user.count({ where: { role: "TEAM_MEMBER" } }),
            prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
        ]);

        return {
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                stats: {
                    totalUsers: stats[0],
                    adminCount: stats[1],
                    projectManagerCount: stats[2],
                    teamMemberCount: stats[3],
                    activeUsers: stats[4],
                },
            },
        };
    } catch (error) {
        console.error("Get all users error:", error);
        return { success: false, message: "Failed to fetch users" };
    }
};

const getUserById = async (userId: string) => {
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
                    },
                },
            },
        });

        if (!user) {
            return { success: false, message: "User not found" };
        }

        // Get projects user is part of
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

        return {
            success: true,
            data: {
                ...user,
                projects: projects.map(p => p.project),
            },
        };
    } catch (error) {
        console.error("Get user by ID error:", error);
        return { success: false, message: "Failed to fetch user" };
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

        return { success: true };
    } catch (error) {
        console.error("Update user role error:", error);
        return { success: false, message: "Failed to update user role" };
    }
};

const getTeamMembers = async (search?: string, limit: number = 50) => {
    try {
        const where: Prisma.UserWhereInput = {
            accountStatus: "ACTIVE",
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const users = await prisma.user.findMany({
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
            data: users,
        };
    } catch (error) {
        console.error("Get team members error:", error);
        return { success: false, message: "Failed to fetch team members" };
    }
};

const getUserWorkload = async (userId: string) => {
    try {
        const [total, completed, inProgress, todo] = await Promise.all([
            prisma.task.count({ where: { assignedTo: userId } }),
            prisma.task.count({ where: { assignedTo: userId, status: "COMPLETED" } }),
            prisma.task.count({ where: { assignedTo: userId, status: "IN_PROGRESS" } }),
            prisma.task.count({ where: { assignedTo: userId, status: "TODO" } }),
        ]);

        const overdue = await prisma.task.count({
            where: {
                assignedTo: userId,
                status: { not: "COMPLETED" },
                dueDate: { lt: new Date() },
            },
        });

        return {
            success: true,
            data: {
                total,
                completed,
                inProgress,
                todo,
                overdue,
                completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
            },
        };
    } catch (error) {
        console.error("Get user workload error:", error);
        return { success: false, message: "Failed to fetch workload" };
    }
};

const getTeamMembersWithProjects = async (
    currentUserId: string,
    currentUserRole: string,
    params: {
        projectId?: string;
        search?: string;
    }
) => {
    try {
        const { projectId, search } = params;

        // Determine which users to show based on role
        let userIds: string[] | null = null;

        if (currentUserRole === "ADMIN" || currentUserRole === "PROJECT_MANAGER") {
            // Admins and PMs see all users who are in at least one project
            const usersWithProjects = await prisma.projectMember.findMany({
                select: { userId: true },
                distinct: ["userId"],
            });
            userIds = usersWithProjects.map(u => u.userId);
        } else {
            // Team members only see users in their projects
            const userProjects = await prisma.projectMember.findMany({
                where: { userId: currentUserId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);

            const projectMembers = await prisma.projectMember.findMany({
                where: { projectId: { in: projectIds } },
                select: { userId: true },
                distinct: ["userId"],
            });
            userIds = [...new Set(projectMembers.map(m => m.userId))];
        }

        // Build where clause
        const where: Prisma.UserWhereInput = {
            id: { in: userIds },
            accountStatus: "ACTIVE",
        };

        // Filter by specific project
        if (projectId) {
            const projectMembers = await prisma.projectMember.findMany({
                where: { projectId },
                select: { userId: true },
            });
            const projectUserIds = projectMembers.map(m => m.userId);
            where.id = { in: projectUserIds };
        }

        // Search filter
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        // Fetch users
        const users = await prisma.user.findMany({
            where,
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                accountStatus: true,
                createdAt: true,
                _count: {
                    select: {
                        assignedTasks: true,
                        projectMembers: true,
                    },
                },
            },
        });

        // Get project IDs for each user (for filtering UI)
        const usersWithProjectIds = await Promise.all(
            users.map(async (user) => {
                const projectMemberships = await prisma.projectMember.findMany({
                    where: { userId: user.id },
                    select: { projectId: true },
                });
                return {
                    ...user,
                    projectIds: projectMemberships.map(p => p.projectId),
                };
            })
        );

        return {
            success: true,
            data: {
                members: usersWithProjectIds,
                total: usersWithProjectIds.length,
            },
        };
    } catch (error) {
        console.error("Get team members with projects error:", error);
        return { success: false, message: "Failed to fetch team members" };
    }
};

const getUserProjects = async (userId: string) => {
    try {
        const memberships = await prisma.projectMember.findMany({
            where: { userId },
            include: {
                project: {
                    include: {
                        _count: {
                            select: { tasks: true, members: true },
                        },
                        tasks: {
                            where: { status: "COMPLETED" },
                            select: { id: true },
                        },
                    },
                },
            },
        });

        const projects = memberships.map(m => ({
            ...m.project,
            joinedAt: m.joinedAt,
            stats: {
                totalTasks: m.project._count.tasks,
                completedTasks: m.project.tasks.length,
                memberCount: m.project._count.members,
                progress: m.project._count.tasks === 0 ? 0 : Math.round((m.project.tasks.length / m.project._count.tasks) * 100),
            },
        }));

        return { success: true, data: { projects } };
    } catch (error) {
        return { success: false, message: "Failed to fetch user projects" };
    }
};

export const usersService = {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    getAllUsers,
    getUserById,
    updateUserRole,
    getTeamMembers,
    getUserWorkload,
    getTeamMembersWithProjects,
    getUserProjects
};