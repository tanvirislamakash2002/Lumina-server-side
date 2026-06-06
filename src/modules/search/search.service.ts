
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

// In-memory store for recent searches (for demo)
// In production, you'd store this in a database table
const recentSearchesStore: Record<string, { query: string; timestamp: Date }[]> = {};

const globalSearch = async (
    userId: string,
    userRole: string,
    query: string,
    type: string | undefined,
    params: { page: number; limit: number }
) => {
    try {
        const { page, limit } = params;
        const results: any = {};

        // Save to recent searches
        saveRecentSearch(userId, query);

        if (!type || type === "all" || type === "projects") {
            const projects = await searchProjectsInternal(userId, userRole, query, undefined, { page, limit });
            results.projects = projects.data;
        }

        if (!type || type === "all" || type === "tasks") {
            const tasks = await searchTasksInternal(userId, userRole, query, {}, { page, limit });
            results.tasks = tasks.data;
        }

        if (!type || type === "all" || type === "members") {
            const members = await searchMembersInternal(userId, userRole, query, { page, limit });
            results.members = members.data;
        }

        return {
            success: true,
            data: results,
        };
    } catch (error) {
        console.error("Global search error:", error);
        return { success: false, message: "Failed to perform search" };
    }
};

const searchProjects = async (
    userId: string,
    userRole: string,
    query: string,
    status: string | undefined,
    params: { page: number; limit: number }
) => {
    try {
        saveRecentSearch(userId, query);
        return await searchProjectsInternal(userId, userRole, query, status, params);
    } catch (error) {
        console.error("Search projects error:", error);
        return { success: false, message: "Failed to search projects" };
    }
};

const searchProjectsInternal = async (
    userId: string,
    userRole: string,
    query: string,
    status: string | undefined,
    params: { page: number; limit: number }
) => {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    let where: Prisma.ProjectWhereInput = {
        name: { contains: query, mode: "insensitive" },
    };

    // Role-based access
    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
        where.members = { some: { userId } };
    }

    if (status && status !== "all") {
        where.status = status as any;
    }

    const [projects, totalItems] = await Promise.all([
        prisma.project.findMany({
            where,
            skip,
            take: limit,
            orderBy: { updatedAt: "desc" },
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

    return {
        success: true,
        data: {
            items: projectsWithProgress,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
        },
    };
};

const searchTasks = async (
    userId: string,
    userRole: string,
    query: string,
    filters: {
        status?: string;
        priority?: string;
        projectId?: string;
        page: number;
        limit: number;
    }
) => {
    try {
        saveRecentSearch(userId, query);
        return await searchTasksInternal(userId, userRole, query, filters, filters);
    } catch (error) {
        console.error("Search tasks error:", error);
        return { success: false, message: "Failed to search tasks" };
    }
};

const searchTasksInternal = async (
    userId: string,
    userRole: string,
    query: string,
    filters: {
        status?: string;
        priority?: string;
        projectId?: string;
    },
    params: { page: number; limit: number }
) => {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    let where: Prisma.TaskWhereInput = {
        OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
        ],
    };

    // Role-based access
    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
        where = {
            ...where,
            OR: [
                { assignedTo: userId },
                { project: { members: { some: { userId } } } },
            ],
        };
    }

    if (filters.status && filters.status !== "all") {
        where.status = filters.status as any;
    }

    if (filters.priority && filters.priority !== "all") {
        where.priority = filters.priority as any;
    }

    if (filters.projectId) {
        where.projectId = filters.projectId;
    }

    const [tasks, totalItems] = await Promise.all([
        prisma.task.findMany({
            where,
            skip,
            take: limit,
            orderBy: { updatedAt: "desc" },
            include: {
                project: {
                    select: { id: true, name: true },
                },
                assignedUser: {
                    select: { id: true, name: true, email: true, image: true },
                },
                _count: {
                    select: { comments: true, attachments: true },
                },
            },
        }),
        prisma.task.count({ where }),
    ]);

    return {
        success: true,
        data: {
            items: tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                project: task.project,
                assignedTo: task.assignedUser,
                commentCount: task._count.comments,
                attachmentCount: task._count.attachments,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            })),
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
        },
    };
};

const searchMembers = async (
    userId: string,
    userRole: string,
    query: string,
    params: { page: number; limit: number }
) => {
    try {
        saveRecentSearch(userId, query);
        return await searchMembersInternal(userId, userRole, query, params);
    } catch (error) {
        console.error("Search members error:", error);
        return { success: false, message: "Failed to search members" };
    }
};

const searchMembersInternal = async (
    userId: string,
    userRole: string,
    query: string,
    params: { page: number; limit: number }
) => {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    let where: Prisma.UserWhereInput = {
        OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
        ],
        accountStatus: "ACTIVE",
    };

    // Non-admins can only see members in their projects
    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
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

        where.id = { in: memberIds };
    }

    const [members, totalItems] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
            },
        }),
        prisma.user.count({ where }),
    ]);

    return {
        success: true,
        data: {
            items: members,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
        },
    };
};

const getSearchSuggestions = async (
    userId: string,
    userRole: string,
    query: string
) => {
    try {
        const suggestions: {
            projects: { id: string; name: string; status: string }[];
            tasks: { id: string; title: string; status: string; priority: string }[];
            members: { id: string; name: string; email: string; image: string | null; role: string }[];
        } = {
            projects: [],
            tasks: [],
            members: [],
        };

        // Get project suggestions (limit 3)
        const projects = await prisma.project.findMany({
            where: {
                name: { contains: query, mode: "insensitive" },
                ...(userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER"
                    ? { members: { some: { userId } } }
                    : {}),
            },
            take: 3,
            select: { id: true, name: true, status: true },
        });
        suggestions.projects = projects;

        // Get task suggestions (limit 3)
        let taskWhere: any = {
            OR: [
                { title: { contains: query, mode: "insensitive" } },
            ],
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
            take: 3,
            select: { id: true, title: true, status: true, priority: true },
        });
        suggestions.tasks = tasks;

        // Get member suggestions (limit 3)
        let memberWhere: any = {
            OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
            ],
            accountStatus: "ACTIVE",
        };
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
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
        const members = await prisma.user.findMany({
            where: memberWhere,
            take: 3,
            select: { id: true, name: true, email: true, image: true, role: true },
        });
        suggestions.members = members;

        return {
            success: true,
            data: suggestions,
        };
    } catch (error) {
        console.error("Get search suggestions error:", error);
        return { success: false, message: "Failed to get search suggestions" };
    }
};

const saveRecentSearch = (userId: string, query: string) => {
    if (!recentSearchesStore[userId]) {
        recentSearchesStore[userId] = [];
    }

    // Remove duplicate if exists
    recentSearchesStore[userId] = recentSearchesStore[userId].filter(
        item => item.query !== query
    );

    // Add to beginning
    recentSearchesStore[userId].unshift({
        query,
        timestamp: new Date(),
    });

    // Keep only last 20
    recentSearchesStore[userId] = recentSearchesStore[userId].slice(0, 20);
};

const getRecentSearches = async (userId: string, limit: number) => {
    try {
        const searches = recentSearchesStore[userId] || [];
        return {
            success: true,
            data: searches.slice(0, limit),
        };
    } catch (error) {
        console.error("Get recent searches error:", error);
        return { success: false, message: "Failed to get recent searches" };
    }
};

const clearRecentSearches = async (userId: string) => {
    try {
        recentSearchesStore[userId] = [];
        return { success: true };
    } catch (error) {
        console.error("Clear recent searches error:", error);
        return { success: false, message: "Failed to clear recent searches" };
    }
};

export const searchService = {
    globalSearch,
    searchProjects,
    searchTasks,
    searchMembers,
    getSearchSuggestions,
    getRecentSearches,
    clearRecentSearches,
};