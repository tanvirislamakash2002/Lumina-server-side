import { Request, Response, NextFunction } from "express";
import { settingsService } from "./settings.service";

// ============ General Settings ============
const getGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Only admins can view general settings
        if (userRole !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Only administrators can access general settings",
            });
        }

        const result = await settingsService.getGeneralSettings();

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

const updateGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const { siteName, siteDescription, contactEmail, timezone, dateFormat } = req.body;

        if (userRole !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Only administrators can update general settings",
            });
        }

        const settings: any = {};
        if (siteName !== undefined) settings.siteName = siteName;
        if (siteDescription !== undefined) settings.siteDescription = siteDescription;
        if (contactEmail !== undefined) settings.contactEmail = contactEmail;
        if (timezone !== undefined) settings.timezone = timezone;
        if (dateFormat !== undefined) settings.dateFormat = dateFormat;

        const result = await settingsService.updateGeneralSettings(settings, userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "General settings updated successfully",
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

// ============ Notification Settings ============
const getNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await settingsService.getNotificationSettings(userId);

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

const updateNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { 
            emailNotifications, 
            pushNotifications,
            taskAssigned,
            taskStatusChanged,
            taskDueSoon,
            taskOverdue,
            commentAdded,
            mentioned,
            projectInvite,
            weeklyDigest
        } = req.body;

        const settings: any = {};
        if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
        if (pushNotifications !== undefined) settings.pushNotifications = pushNotifications;
        if (taskAssigned !== undefined) settings.taskAssigned = taskAssigned;
        if (taskStatusChanged !== undefined) settings.taskStatusChanged = taskStatusChanged;
        if (taskDueSoon !== undefined) settings.taskDueSoon = taskDueSoon;
        if (taskOverdue !== undefined) settings.taskOverdue = taskOverdue;
        if (commentAdded !== undefined) settings.commentAdded = commentAdded;
        if (mentioned !== undefined) settings.mentioned = mentioned;
        if (projectInvite !== undefined) settings.projectInvite = projectInvite;
        if (weeklyDigest !== undefined) settings.weeklyDigest = weeklyDigest;

        const result = await settingsService.updateNotificationSettings(userId, settings);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Notification settings updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

// ============ Theme Settings ============
const getThemeSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await settingsService.getThemeSettings(userId);

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

const updateThemeSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { theme, sidebarCollapsed, fontSize, compactView } = req.body;

        const settings: any = {};
        if (theme !== undefined) settings.theme = theme;
        if (sidebarCollapsed !== undefined) settings.sidebarCollapsed = sidebarCollapsed;
        if (fontSize !== undefined) settings.fontSize = fontSize;
        if (compactView !== undefined) settings.compactView = compactView;

        const result = await settingsService.updateThemeSettings(userId, settings);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Theme settings updated successfully",
            data: result.data,
        });
    } catch (error) {
        next(error);
    }
};

// ============ Security Settings ============
const getSecuritySettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await settingsService.getSecuritySettings(userId);

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

const updateSecuritySettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { twoFactorEnabled, sessionTimeout, loginNotifications } = req.body;

        const settings: any = {};
        if (twoFactorEnabled !== undefined) settings.twoFactorEnabled = twoFactorEnabled;
        if (sessionTimeout !== undefined) settings.sessionTimeout = sessionTimeout;
        if (loginNotifications !== undefined) settings.loginNotifications = loginNotifications;

        const result = await settingsService.updateSecuritySettings(userId, settings);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Security settings updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

// ============ Session Management ============
const getSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const currentToken = req.headers.authorization?.replace("Bearer ", "") || "";

        const result = await settingsService.getSessions(userId, currentToken);

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

const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required",
            });
        }

        const result = await settingsService.revokeSession(userId, sessionId as string);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Session revoked successfully",
        });
    } catch (error) {
        next(error);
    }
};

const revokeAllSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const currentToken = req.headers.authorization?.replace("Bearer ", "") || "";

        const result = await settingsService.revokeAllSessions(userId, currentToken);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "All other sessions revoked successfully",
        });
    } catch (error) {
        next(error);
    }
};

// ============ System Settings (Admin Only) ============
const getSystemSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userRole = req.user!.role;

        if (userRole !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Only administrators can access system settings",
            });
        }

        const result = await settingsService.getSystemSettings();

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

const updateSystemSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        if (userRole !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Only administrators can update system settings",
            });
        }

        const { 
            maintenanceMode, 
            allowRegistration, 
            requireEmailVerification,
            defaultUserRole,
            maxProjectPerUser,
            maxFileSize,
            allowedFileTypes
        } = req.body;

        const settings: any = {};
        if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
        if (allowRegistration !== undefined) settings.allowRegistration = allowRegistration;
        if (requireEmailVerification !== undefined) settings.requireEmailVerification = requireEmailVerification;
        if (defaultUserRole !== undefined) settings.defaultUserRole = defaultUserRole;
        if (maxProjectPerUser !== undefined) settings.maxProjectPerUser = maxProjectPerUser;
        if (maxFileSize !== undefined) settings.maxFileSize = maxFileSize;
        if (allowedFileTypes !== undefined) settings.allowedFileTypes = allowedFileTypes;

        const result = await settingsService.updateSystemSettings(settings, userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "System settings updated successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const settingsController = {
    // General settings
    getGeneralSettings,
    updateGeneralSettings,
    // Notification settings
    getNotificationSettings,
    updateNotificationSettings,
    // Theme settings
    getThemeSettings,
    updateThemeSettings,
    // Security settings
    getSecuritySettings,
    updateSecuritySettings,
    // Session management
    getSessions,
    revokeSession,
    revokeAllSessions,
    // System settings
    getSystemSettings,
    updateSystemSettings,
};