export const validationMessages = {
    DUPLICATE_TASK: (title: string) => `Task "${title}" already exists in this project.`,
    PAST_DEADLINE: "Please select a valid deadline (future date).",
    COMPLETED_TASK_REASSIGN: "Completed tasks cannot be reassigned.",
    INVALID_STATUS_CHANGE: "Invalid status transition.",
    PROJECT_NOT_FOUND: "Project not found.",
    TASK_NOT_FOUND: "Task not found.",
    USER_NOT_FOUND: "User not found.",
    UNAUTHORIZED: "You don't have permission to perform this action.",
    MEMBER_ALREADY_EXISTS: "User is already a member of this project.",
    MEMBER_NOT_FOUND: "User is not a member of this project."
};

export const validateTaskAssignment = (taskStatus: string): boolean => {
    // Cannot reassign completed tasks
    if (taskStatus === 'COMPLETED') {
        return false;
    }
    return true;
};

export const validateStatusTransition = (currentStatus: string, newStatus: string): boolean => {
    // Define allowed transitions
    const allowedTransitions: Record<string, string[]> = {
        'TODO': ['IN_PROGRESS', 'COMPLETED'],
        'IN_PROGRESS': ['TODO', 'COMPLETED'],
        'COMPLETED': []  // No transitions from completed
    };
    
    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
};