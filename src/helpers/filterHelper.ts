type TaskFilters = {
    status?: string;
    priority?: string;
    assignedTo?: string;
    projectId?: string;
    deadlineStatus?: 'upcoming' | 'overdue';
    search?: string;
}

type ProjectFilters = {
    status?: string;
    search?: string;
}

export const buildTaskFilter = (filters: TaskFilters) => {
    const where: any = {};
    
    if (filters.status) {
        where.status = filters.status;
    }
    
    if (filters.priority) {
        where.priority = filters.priority;
    }
    
    if (filters.assignedTo) {
        where.assignedTo = filters.assignedTo;
    }
    
    if (filters.projectId) {
        where.projectId = filters.projectId;
    }
    
    if (filters.deadlineStatus === 'upcoming') {
        where.dueDate = { gt: new Date() };
    }
    
    if (filters.deadlineStatus === 'overdue') {
        where.dueDate = { lt: new Date() };
        where.status = { not: 'COMPLETED' };
    }
    
    if (filters.search) {
        where.OR = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
        ];
    }
    
    return where;
};

export const buildProjectFilter = (filters: ProjectFilters) => {
    const where: any = {};
    
    if (filters.status) {
        where.status = filters.status;
    }
    
    if (filters.search) {
        where.name = { contains: filters.search, mode: 'insensitive' };
    }
    
    return where;
};