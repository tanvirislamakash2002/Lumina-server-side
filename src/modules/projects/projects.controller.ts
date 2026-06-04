import { Request, Response, NextFunction } from "express";
import { projectsService } from "./projects.service";

const createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { name, description, deadline, status } = req.body;

        // Validation
        if (!name || name.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Project name must be at least 3 characters",
            });
        }

        if (deadline && new Date(deadline) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Deadline cannot be in the past",
            });
        }

        // Build data object only with defined values
        const data: { name: string; description?: string; deadline?: Date; status?: any } = {
            name: name.trim(),
        };

        if (description !== undefined && description !== null) {
            data.description = description.trim();
        }

        if (deadline) {
            data.deadline = new Date(deadline);
        }

        if (status) {
            data.status = status;
        }

        const result = await projectsService.createProject(userId, userRole, data);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json({
            success: true,
            data: result.data,
            message: "Project created successfully",
        });
    } catch (error) {
        next(error);
    }
};

const getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const status = req.query.status as string;
        const sortBy = req.query.sortBy as string || "latest";

        const result = await projectsService.getProjects(
            userId,
            userRole,
            {
                page,
                limit,
                search,
                status,
                sortBy,
            }
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

const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await projectsService.getProjectById(projectId as string, userId, userRole);

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

const updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;
        const { name, description, deadline, status } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        if (deadline && new Date(deadline) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Deadline cannot be in the past",
            });
        }

        // Build data object only with defined values
        const data: { name?: string; description?: string; deadline?: Date; status?: any } = {};

        if (name !== undefined && name !== null && name.trim() !== "") {
            data.name = name.trim();
        }

        if (description !== undefined && description !== null) {
            data.description = description.trim();
        }

        if (deadline) {
            data.deadline = new Date(deadline);
        }

        if (status !== undefined && status !== null) {
            data.status = status;
        }

        const result = await projectsService.updateProject(
            projectId as string,
            userId,
            userRole,
            data  // ← Only contains properties that actually have values
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: "Project updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await projectsService.deleteProject(projectId as string, userId, userRole);

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

const getProjectStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await projectsService.getProjectStats(projectId as string, userId, userRole);

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

const getProjectProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        const result = await projectsService.getProjectProgress(projectId as string, userId, userRole);

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

export const projectsController = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectStats,
    getProjectProgress,
};