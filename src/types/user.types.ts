export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserWithStats extends User {
    orderCount: number;
    totalSpent: number;
}

export interface GetAllUsersParams {
    role?: string;
    status?: string;
    verified?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
}