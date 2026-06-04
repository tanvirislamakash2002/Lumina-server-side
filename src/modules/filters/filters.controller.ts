import { Request, Response, NextFunction } from "express";
import { filtersService } from "./filters.service";

const getFilterOptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await filtersService.getFilterOptions(userId, userRole);

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

const getTaskFilters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const projectId = req.query.projectId as string;

        const result = await filtersService.getTaskFilters(userId, userRole, projectId);

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

const getProjectFilters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const result = await filtersService.getProjectFilters(userId, userRole);

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

const getMemberFilters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const projectId = req.query.projectId as string;

        const result = await filtersService.getMemberFilters(userId, userRole, projectId);

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

const getSavedFilters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const type = req.query.type as string;

        const result = await filtersService.getSavedFilters(userId, type);

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

const saveFilter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { name, type, filters } = req.body;

        if (!name || name.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Filter name must be at least 3 characters",
            });
        }

        if (!type || !["task", "project", "member"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Valid filter type (task, project, or member) is required",
            });
        }

        if (!filters || typeof filters !== "object") {
            return res.status(400).json({
                success: false,
                message: "Filters object is required",
            });
        }

        const result = await filtersService.saveFilter(
            userId,
            name.trim(),
            type,
            filters
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json({
            success: true,
            data: result.data,
            message: "Filter saved successfully",
        });
    } catch (error) {
        next(error);
    }
};

const updateSavedFilter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { filterId } = req.params;
        const { name, filters } = req.body;

        if (!filterId) {
            return res.status(400).json({
                success: false,
                message: "Filter ID is required",
            });
        }

        const result = await filtersService.updateSavedFilter(
            filterId as string,
            userId,
            { name: name?.trim(), filters }
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: "Filter updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

const deleteSavedFilter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { filterId } = req.params;

        if (!filterId) {
            return res.status(400).json({
                success: false,
                message: "Filter ID is required",
            });
        }

        const result = await filtersService.deleteSavedFilter(filterId as string, userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Filter deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const filtersController = {
    getFilterOptions,
    getTaskFilters,
    getProjectFilters,
    getMemberFilters,
    getSavedFilters,
    saveFilter,
    updateSavedFilter,
    deleteSavedFilter,
};