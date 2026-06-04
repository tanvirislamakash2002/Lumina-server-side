export const isValidDeadline = (date: Date | string): boolean => {
    const deadline = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline >= today;
};

export const isOverdue = (dueDate: Date | string, status: string): boolean => {
    if (status === 'COMPLETED') return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
};

export const getDaysRemaining = (dueDate: Date | string): number => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

export const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};