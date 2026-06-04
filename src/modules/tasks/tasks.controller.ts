import { Request, Response, NextFunction } from "express";
import { tasksService } from "./tasks.service";

const createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;
        const { title, description, assignedTo, dueDate, priority, status } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required",
            });
        }

        if (!title || title.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Task title must be at least 3 characters",
            });
        }

        if (dueDate && new Date(dueDate) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Due date cannot be in the past",
            });
        }

        // Build data object only with defined values
        const data: { 
            title: string; 
            description?: string; 
            assignedTo?: string; 
            dueDate?: Date; 
            priority?: string; 
            status?: string;
        } = {
            title: title.trim(),
        };

        if (description !== undefined && description !== null) {
            data.description = description.trim();
        }
        if (assignedTo) {
            data.assignedTo = assignedTo;
        }
        if (dueDate) {
            data.dueDate = new Date(dueDate);
        }
        if (priority) {
            data.priority = priority;
        }
        if (status) {
            data.status = status;
        }

        const result = await tasksService.createTask(
            projectId as string,
            userId,
            userRole,
            data
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json({
            success: true,
            data: result.data,
            message: "Task created successfully",
        });
    } catch (error) {
        next(error);
    }
};

const getTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { projectId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        const status = req.query.status as string;
        const priority = req.query.priority as string;
        const assignedTo = req.query.assignedTo as string;
        const sortBy = req.query.sortBy as string || "latest";

        const result = await tasksService.getTasks(
            projectId as string,
            userId,
            userRole,
            {
                page,
                limit,
                search,
                status,
                priority,
                assignedTo,
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

const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { taskId } = req.params;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required",
            });
        }

        const result = await tasksService.getTaskById(taskId as string, userId, userRole);

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

const updateTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { taskId } = req.params;
        const { title, description, assignedTo, dueDate, priority, status } = req.body;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required",
            });
        }

        if (dueDate && new Date(dueDate) < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Due date cannot be in the past",
            });
        }

        // Build data object only with defined values
        const data: {
            title?: string;
            description?: string;
            assignedTo?: string;
            dueDate?: Date;
            priority?: string;
            status?: string;
        } = {};

        if (title !== undefined && title !== null) {
            if (title.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    message: "Task title must be at least 3 characters",
                });
            }
            data.title = title.trim();
        }
        if (description !== undefined && description !== null) {
            data.description = description.trim();
        }
        if (assignedTo !== undefined) {
            data.assignedTo = assignedTo || null;
        }
        if (dueDate) {
            data.dueDate = new Date(dueDate);
        }
        if (priority) {
            data.priority = priority;
        }
        if (status) {
            data.status = status;
        }

        const result = await tasksService.updateTask(
            taskId as string,
            userId,
            userRole,
            data
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: "Task updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { taskId } = req.params;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required",
            });
        }

        const result = await tasksService.deleteTask(taskId as string, userId, userRole);

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

const updateTaskStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { taskId } = req.params;
        const { status } = req.body;

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required",
            });
        }

        if (!status || !["TODO", "IN_PROGRESS", "COMPLETED"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Valid status (TODO, IN_PROGRESS, COMPLETED) is required",
            });
        }

        const result = await tasksService.updateTaskStatus(
            taskId as string,
            userId,
            userRole,
            status
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: "Task status updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

const getTasksByUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as string;
        const projectId = req.query.projectId as string;

        const result = await tasksService.getTasksByUser(
            userId,
            userRole,
            {
                page,
                limit,
                status,
                projectId,
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

const getOverdueTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await tasksService.getOverdueTasks(userId, userRole);

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

export const tasksController = {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    updateTaskStatus,
    getTasksByUser,
    getOverdueTasks,
};