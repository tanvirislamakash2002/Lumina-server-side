import { Request, Response, NextFunction } from "express";
import { searchService } from "./search.service";

const searchProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const query = req.query.q as string;
        const status = req.query.status as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters",
            });
        }

        const result = await searchService.searchProjects(
            userId,
            userRole,
            query.trim(),
            status,
            { page, limit }
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: (result as any).message || "Failed to search projects",
            });
        }

        return res.status(200).json({
            success: true,
            data: (result as any).data,
        });
    } catch (error) {
        next(error);
    }
};

const searchTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const query = req.query.q as string;
        const status = req.query.status as string;
        const priority = req.query.priority as string;
        const projectId = req.query.projectId as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters",
            });
        }

        const result = await searchService.searchTasks(
            userId,
            userRole,
            query.trim(),
            { status, priority, projectId, page, limit }
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: (result as any).message || "Failed to search tasks",
            });
        }

        return res.status(200).json({
            success: true,
            data: (result as any).data,
        });
    } catch (error) {
        next(error);
    }
};

const searchMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const query = req.query.q as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters",
            });
        }

        const result = await searchService.searchMembers(
            userId,
            userRole,
            query.trim(),
            { page, limit }
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: (result as any).message || "Failed to search members",
            });
        }

        return res.status(200).json({
            success: true,
            data: (result as any).data,
        });
    } catch (error) {
        next(error);
    }
};

const globalSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const query = req.query.q as string;
        const type = req.query.type as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters",
            });
        }

        const result = await searchService.globalSearch(
            userId,
            userRole,
            query.trim(),
            type,
            { page, limit }
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || "Failed to perform search",
            });
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const getSearchSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const query = req.query.q as string;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters",
            });
        }

        const result = await searchService.getSearchSuggestions(
            userId,
            userRole,
            query.trim()
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || "Failed to get search suggestions",
            });
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const getRecentSearches = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await searchService.getRecentSearches(userId, limit);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || "Failed to get recent searches",
            });
        }

        return res.status(200).json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

const clearRecentSearches = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await searchService.clearRecentSearches(userId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || "Failed to clear recent searches",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Recent searches cleared successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const searchController = {
    globalSearch,
    searchProjects,
    searchTasks,
    searchMembers,
    getSearchSuggestions,
    getRecentSearches,
    clearRecentSearches,
};