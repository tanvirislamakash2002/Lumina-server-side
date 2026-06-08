import { Request, Response, NextFunction } from "express";
import { adminService } from "./admin.service";

const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user!.id;

        const result = await adminService.getDashboard(adminId);

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

const getSystemStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await adminService.getSystemStats();

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

const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 15;
        const search = req.query.search as string;
        const role = req.query.role as string;
        const status = req.query.status as string;
        const verified = req.query.verified as string;
        const sort = req.query.sort as string;

        const result = await adminService.getAllUsers({
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

const getUserDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const result = await adminService.getUserDetails(userId as string);

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
        const adminId = req.user!.id;
        const { userId } = req.params;
        const { role } = req.body;

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

        const result = await adminService.updateUserRole(userId as string, role);

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

const suspendUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user!.id;
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                message: "You cannot suspend your own account",
            });
        }

        const result = await adminService.suspendUser(userId as string, adminId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "User suspended successfully",
        });
    } catch (error) {
        next(error);
    }
};

const activateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user!.id;
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const result = await adminService.activateUser(userId as string, adminId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "User activated successfully",
        });
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user!.id;
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        if (userId === adminId) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account",
            });
        }

        const result = await adminService.deleteUser(userId as string, adminId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

const bulkUserAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user!.id;
        const { action, userIds } = req.body;

        if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Action and userIds array are required",
            });
        }

        const validActions = ["suspend", "activate", "delete"];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                message: `Invalid action. Valid actions: ${validActions.join(", ")}`,
            });
        }

        // Prevent admin from deleting themselves in bulk action
        if (action === "delete" && userIds.includes(adminId)) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account",
            });
        }

        const result = await adminService.bulkUserAction(action, userIds, adminId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

const getAllProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 15;
        const search = req.query.search as string;
        const status = req.query.status as string;
        const sort = req.query.sort as string;

        const result = await adminService.getAllProjects({
            page,
            limit,
            search,
            status,
            sort
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

const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.user!.id;
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await adminService.deleteProject(projectId as string, adminId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

const getSystemLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const level = req.query.level as string;
        const days = parseInt(req.query.days as string) || 7;

        const result = await adminService.getSystemLogs({
            page,
            limit,
            level,
            days,
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

const getAuditTrail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const userId = req.query.userId as string;
        const action = req.query.action as string;
        const days = parseInt(req.query.days as string) || 30;

        const result = await adminService.getAuditTrail({
            page,
            limit,
            userId,
            action,
            days,
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

const getAuditStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const days = parseInt(req.query.days as string) || 90;
        const result = await adminService.getAuditStats(days);
        if (!result.success) return res.status(400).json(result);
        return res.status(200).json({ success: true, data: result.data });
    } catch (error) { next(error); }
};

const clearCache = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await adminService.clearCache();

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Cache cleared successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const adminController = {
    getDashboard,
    getSystemStats,
    getAllUsers,
    getUserDetails,
    updateUserRole,
    suspendUser,
    activateUser,
    deleteUser,
    bulkUserAction,
    getAllProjects,
    deleteProject,
    getSystemLogs,
    getAuditTrail,
    getAuditStats,
    clearCache,
};