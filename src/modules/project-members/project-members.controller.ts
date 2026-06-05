import { Request, Response, NextFunction } from "express";
import { projectMembersService } from "./project-members.service";

const addMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;
        const { memberId } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        if (!memberId) {
            return res.status(400).json({
                success: false,
                message: "Member ID is required",
            });
        }

        const result = await projectMembersService.addMember(
            projectId as string,
            memberId,
            userId,
            userRole
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Member added to project successfully",
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId, memberId } = req.params;

        if (!projectId || !memberId) {
            return res.status(400).json({
                success: false,
                message: "Project ID and Member ID are required",
            });
        }

        const result = await projectMembersService.removeMember(
            projectId as string,
            memberId as string,
            userId,
            userRole
        );

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

const getProjectMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await projectMembersService.getProjectMembers(
            projectId as string,
            userId,
            userRole,
            { page, limit, search }
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

const checkMembership = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await projectMembersService.checkMembership(
            projectId as string,
            userId
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
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const targetUserId = req.query.userId as string || userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        // Only admins can view other users' projects
        if (targetUserId !== userId && userRole !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to view other users' projects",
            });
        }

        const result = await projectMembersService.getUserProjects(
            targetUserId,
            { page, limit }
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

const getAvailableMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userRole = req.user!.role;
        const { projectId } = req.params;
        const search = req.query.search as string;
        const limit = parseInt(req.query.limit as string) || 20;

        // Only PM and Admin can add members
        if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
            return res.status(403).json({
                success: false,
                message: "Only Project Managers and Admins can add members",
            });
        }

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await projectMembersService.getAvailableMembers(
            projectId as string,
            search,
            limit
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

const getUserProjectsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const result = await projectMembersService.getUserProjectsById(
            userId as string,
            { page, limit }
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


export const projectMembersController = {
    addMember,
    removeMember,
    getProjectMembers,
    checkMembership,
    getUserProjects,
    getAvailableMembers,
    getUserProjectsById
};