import { prisma } from "../../lib/prisma";

// In-memory store for saved filters (for demo)
// In production, you'd store this in a database table
interface SavedFilter {
    id: string;
    userId: string;
    name: string;
    type: "task" | "project" | "member";
    filters: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const savedFiltersStore: Record<string, SavedFilter> = {};

const getFilterOptions = async (userId: string, userRole: string) => {
    try {
        // Get all unique statuses from accessible projects/tasks
        let projectWhere: any = {};
        let taskWhere: any = {};

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);
            projectWhere.id = { in: projectIds };
            taskWhere.projectId = { in: projectIds };
        }

        const [
            projectStatuses,
            taskStatuses,
            priorities,
            activeProjects,
            teamMembers,
        ] = await Promise.all([
            prisma.project.groupBy({
                by: ["status"],
                where: projectWhere,
                _count: true,
            }),
            prisma.task.groupBy({
                by: ["status"],
                where: taskWhere,
                _count: true,
            }),
            prisma.task.groupBy({
                by: ["priority"],
                where: taskWhere,
                _count: true,
            }),
            prisma.project.findMany({
                where: { ...projectWhere, status: "ACTIVE" },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
                take: 50,
            }),
            getAccessibleMembers(userId, userRole),
        ]);

        return {
            success: true,
            data: {
                projectStatuses: projectStatuses.map(s => ({
                    value: s.status,
                    label: s.status,
                    count: s._count,
                })),
                taskStatuses: taskStatuses.map(s => ({
                    value: s.status,
                    label: s.status,
                    count: s._count,
                })),
                priorities: priorities.map(p => ({
                    value: p.priority,
                    label: p.priority,
                    count: p._count,
                })),
                activeProjects: activeProjects.map(p => ({
                    id: p.id,
                    name: p.name,
                })),
                teamMembers,
            },
        };
    } catch (error) {
        console.error("Get filter options error:", error);
        return { success: false, message: "Failed to fetch filter options" };
    }
};

const getTaskFilters = async (userId: string, userRole: string, projectId?: string) => {
    try {
        let taskWhere: any = {};

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            if (projectId) {
                // Check access to specific project
                const project = await prisma.project.findFirst({
                    where: {
                        id: projectId,
                        members: { some: { userId } },
                    },
                });
                if (!project) {
                    return { success: false, message: "You don't have access to this project" };
                }
                taskWhere.projectId = projectId;
            } else {
                const userProjects = await prisma.projectMember.findMany({
                    where: { userId },
                    select: { projectId: true },
                });
                const projectIds = userProjects.map(p => p.projectId);
                taskWhere.projectId = { in: projectIds };
            }
        } else if (projectId) {
            taskWhere.projectId = projectId;
        }

        // Get statuses - removed orderBy
        const statusesRaw = await prisma.task.groupBy({
            by: ["status"],
            where: taskWhere,
            _count: true,
        });
        const statuses = statusesRaw.sort((a, b) => b._count - a._count);

        // Get priorities - removed orderBy
        const prioritiesRaw = await prisma.task.groupBy({
            by: ["priority"],
            where: taskWhere,
            _count: true,
        });
        const priorities = prioritiesRaw.sort((a, b) => b._count - a._count);

        const [assignees, projects] = await Promise.all([
            prisma.user.findMany({
                where: {
                    assignedTasks: { some: taskWhere },
                    accountStatus: "ACTIVE",
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                },
                distinct: ["id"],
                take: 50,
            }),
            !projectId
                ? prisma.project.findMany({
                      where: taskWhere.projectId ? { id: { in: taskWhere.projectId.in as string[] } } : {},
                      select: { id: true, name: true },
                      orderBy: { name: "asc" },
                  })
                : Promise.resolve([]),
        ]);

        return {
            success: true,
            data: {
                statuses: statuses.map(s => ({
                    value: s.status,
                    label: s.status,
                    count: s._count,
                })),
                priorities: priorities.map(p => ({
                    value: p.priority,
                    label: p.priority,
                    count: p._count,
                })),
                assignees: assignees.map(a => ({
                    id: a.id,
                    name: a.name,
                    email: a.email,
                    image: a.image,
                })),
                projects: projects.map(p => ({
                    id: p.id,
                    name: p.name,
                })),
                deadlineOptions: [
                    { value: "overdue", label: "Overdue" },
                    { value: "today", label: "Due Today" },
                    { value: "tomorrow", label: "Due Tomorrow" },
                    { value: "thisWeek", label: "This Week" },
                    { value: "nextWeek", label: "Next Week" },
                    { value: "thisMonth", label: "This Month" },
                    { value: "noDeadline", label: "No Deadline" },
                ],
            },
        };
    } catch (error) {
        console.error("Get task filters error:", error);
        return { success: false, message: "Failed to fetch task filters" };
    }
};

const getProjectFilters = async (userId: string, userRole: string) => {
    try {
        let projectWhere: any = {};

        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            projectWhere.members = { some: { userId } };
        }

        const [statuses, projectManagers] = await Promise.all([
            prisma.project.groupBy({
                by: ["status"],
                where: projectWhere,
                _count: true,
            }),
            prisma.user.findMany({
                where: {
                    role: "PROJECT_MANAGER",
                    accountStatus: "ACTIVE",
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                },
                take: 50,
            }),
        ]);

        // Get date range options
        const dateRangeOptions = [
            { value: "all", label: "All Projects" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "onHold", label: "On Hold" },
            { value: "deadlineThisWeek", label: "Deadline This Week" },
            { value: "deadlineThisMonth", label: "Deadline This Month" },
            { value: "deadlineOverdue", label: "Overdue Deadline" },
        ];

        return {
            success: true,
            data: {
                statuses: statuses.map(s => ({
                    value: s.status,
                    label: s.status,
                    count: s._count,
                })),
                projectManagers,
                dateRangeOptions,
            },
        };
    } catch (error) {
        console.error("Get project filters error:", error);
        return { success: false, message: "Failed to fetch project filters" };
    }
};

const getMemberFilters = async (userId: string, userRole: string, projectId?: string) => {
    try {
        let memberIds: string[] = [];

        if (userRole === "ADMIN" || userRole === "PROJECT_MANAGER") {
            // Admins and PMs can see all active members
            const members = await prisma.user.findMany({
                where: { accountStatus: "ACTIVE" },
                select: { id: true },
                take: 200,
            });
            memberIds = members.map(m => m.id);
        } else if (projectId) {
            // Team members can only see members in specific project
            const projectMembers = await prisma.projectMember.findMany({
                where: { projectId },
                select: { userId: true },
            });
            memberIds = projectMembers.map(m => m.userId);
        } else {
            // Team members can see members in their projects
            const userProjects = await prisma.projectMember.findMany({
                where: { userId },
                select: { projectId: true },
            });
            const projectIds = userProjects.map(p => p.projectId);
            const projectMembers = await prisma.projectMember.findMany({
                where: { projectId: { in: projectIds } },
                select: { userId: true },
            });
            memberIds = [...new Set(projectMembers.map(m => m.userId))];
        }

        const [members, roles] = await Promise.all([
            prisma.user.findMany({
                where: { id: { in: memberIds }, accountStatus: "ACTIVE" },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                },
                orderBy: { name: "asc" },
                take: 100,
            }),
            prisma.user.groupBy({
                by: ["role"],
                where: { id: { in: memberIds }, accountStatus: "ACTIVE" },
                _count: true,
            }),
        ]);

        return {
            success: true,
            data: {
                members,
                roles: roles.map(r => ({
                    value: r.role,
                    label: r.role,
                    count: r._count,
                })),
                workloadOptions: [
                    { value: "low", label: "Low (0-5 tasks)", min: 0, max: 5 },
                    { value: "medium", label: "Medium (6-15 tasks)", min: 6, max: 15 },
                    { value: "high", label: "High (16+ tasks)", min: 16, max: Infinity },
                ],
            },
        };
    } catch (error) {
        console.error("Get member filters error:", error);
        return { success: false, message: "Failed to fetch member filters" };
    }
};

const getAccessibleMembers = async (userId: string, userRole: string) => {
    let memberIds: string[] = [];

    if (userRole === "ADMIN" || userRole === "PROJECT_MANAGER") {
        const members = await prisma.user.findMany({
            where: { accountStatus: "ACTIVE" },
            select: { id: true },
            take: 200,
        });
        memberIds = members.map(m => m.id);
    } else {
        const userProjects = await prisma.projectMember.findMany({
            where: { userId },
            select: { projectId: true },
        });
        const projectIds = userProjects.map(p => p.projectId);
        const projectMembers = await prisma.projectMember.findMany({
            where: { projectId: { in: projectIds } },
            select: { userId: true },
        });
        memberIds = [...new Set(projectMembers.map(m => m.userId))];
    }

    const members = await prisma.user.findMany({
        where: { id: { in: memberIds }, accountStatus: "ACTIVE" },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
        },
        orderBy: { name: "asc" },
        take: 100,
    });

    return members;
};

const getSavedFilters = async (userId: string, type?: string) => {
    try {
        const filters = Object.values(savedFiltersStore).filter(
            filter => filter.userId === userId && (!type || filter.type === type)
        );

        return {
            success: true,
            data: filters.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        };
    } catch (error) {
        console.error("Get saved filters error:", error);
        return { success: false, message: "Failed to fetch saved filters" };
    }
};

const saveFilter = async (
    userId: string,
    name: string,
    type: "task" | "project" | "member",
    filters: Record<string, any>
) => {
    try {
        const id = `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();

        const savedFilter: SavedFilter = {
            id,
            userId,
            name,
            type,
            filters,
            createdAt: now,
            updatedAt: now,
        };

        savedFiltersStore[id] = savedFilter;

        return {
            success: true,
            data: savedFilter,
        };
    } catch (error) {
        console.error("Save filter error:", error);
        return { success: false, message: "Failed to save filter" };
    }
};

const updateSavedFilter = async (
    filterId: string,
    userId: string,
    data: { name?: string; filters?: Record<string, any> }
) => {
    try {
        const filter = savedFiltersStore[filterId];

        if (!filter) {
            return { success: false, message: "Filter not found" };
        }

        if (filter.userId !== userId) {
            return { success: false, message: "You don't have permission to update this filter" };
        }

        if (data.name) {
            filter.name = data.name;
        }
        if (data.filters) {
            filter.filters = data.filters;
        }
        filter.updatedAt = new Date();

        savedFiltersStore[filterId] = filter;

        return {
            success: true,
            data: filter,
        };
    } catch (error) {
        console.error("Update saved filter error:", error);
        return { success: false, message: "Failed to update filter" };
    }
};

const deleteSavedFilter = async (filterId: string, userId: string) => {
    try {
        const filter = savedFiltersStore[filterId];

        if (!filter) {
            return { success: false, message: "Filter not found" };
        }

        if (filter.userId !== userId) {
            return { success: false, message: "You don't have permission to delete this filter" };
        }

        delete savedFiltersStore[filterId];

        return { success: true };
    } catch (error) {
        console.error("Delete saved filter error:", error);
        return { success: false, message: "Failed to delete filter" };
    }
};

export const filtersService = {
    getFilterOptions,
    getTaskFilters,
    getProjectFilters,
    getMemberFilters,
    getSavedFilters,
    saveFilter,
    updateSavedFilter,
    deleteSavedFilter,
};