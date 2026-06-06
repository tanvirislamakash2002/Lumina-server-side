import { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service";

const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const result = await usersService.getProfile(userId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { name, image } = req.body;

        const result = await usersService.updateProfile(userId, { name, image });

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: "Profile updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All password fields are required",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords do not match",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        const result = await usersService.changePassword(userId, {
            currentPassword,
            newPassword,
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        next(error);
    }
};

const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const result = await usersService.deleteAccount(userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Clear session cookie
        res.clearCookie("lumina-auth");

        return res.status(200).json({
            success: true,
            message: "Account deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 15;
        const search = req.query.search as string;
        const role = req.query.role as string;
        const status = req.query.status as string;      
        const verified = req.query.verified as string;  
        const sort = req.query.sort as string;          

        const result = await usersService.getAllUsers({
            page,
            limit,
            search,
            role,
            status,
            verified,
            sort,
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const result = await usersService.getUserById(userId as string);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const adminId = req.user!.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        if (!role || !["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Valid role (ADMIN, PROJECT_MANAGER, or TEAM_MEMBER) is required",
            });
        }

        // Prevent admin from changing their own role
        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own role",
            });
        }

        const result = await usersService.updateUserRole(userId as string, role);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: `User role changed to ${role} successfully`,
        });
    } catch (error) {
        next(error);
    }
};

const getTeamMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const search = req.query.search as string;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await usersService.getTeamMembers(search, limit);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const getUserWorkload = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const result = await usersService.getUserWorkload(userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const getTeamMembersWithProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUserId = req.query.currentUserId as string || req.user!.id;
        const currentUserRole = req.query.userRole as string || req.user!.role;
        const projectId = req.query.projectId as string;
        const search = req.query.search as string;

        const result = await usersService.getTeamMembersWithProjects(
            currentUserId,
            currentUserRole,
            { projectId, search }
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const getUserProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
        const result = await usersService.getUserProjects(userId as string);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};
export const usersController = {
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