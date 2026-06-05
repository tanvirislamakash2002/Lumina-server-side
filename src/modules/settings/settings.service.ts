import { prisma } from "../../lib/prisma";

// In-memory stores for settings (for demo)
// In production, you'd store these in database tables
interface UserSettings {
    userId: string;
    notificationSettings: any;
    themeSettings: any;
    securitySettings: any;
    updatedAt: Date;
}

const userSettingsStore: Record<string, UserSettings> = {};

// System-wide settings (in-memory for demo)
let systemSettings: any = {
    siteName: "Lumina",
    siteDescription: "Smart Project & Task Collaboration System",
    contactEmail: "support@lumina.com",
    timezone: "UTC",
    dateFormat: "MM/dd/yyyy",
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: false,
    defaultUserRole: "TEAM_MEMBER",
    maxProjectPerUser: 50,
    maxFileSize: 5, // MB
    allowedFileTypes: ["image/jpeg", "image/png", "application/pdf", "application/msword"],
};

// ============ General Settings ============
const getGeneralSettings = async () => {
    try {
        return {
            success: true,
            data: {
                siteName: systemSettings.siteName,
                siteDescription: systemSettings.siteDescription,
                contactEmail: systemSettings.contactEmail,
                timezone: systemSettings.timezone,
                dateFormat: systemSettings.dateFormat,
            },
        };
    } catch (error) {
        console.error("Get general settings error:", error);
        return { success: false, message: "Failed to fetch general settings" };
    }
};

const updateGeneralSettings = async (settings: any, updatedBy: string) => {
    try {
        systemSettings = { ...systemSettings, ...settings };

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ADMIN_ACTION",
                message: "General settings were updated",
                userId: updatedBy,
            },
        });

        return {
            success: true,
            data: {
                siteName: systemSettings.siteName,
                siteDescription: systemSettings.siteDescription,
                contactEmail: systemSettings.contactEmail,
                timezone: systemSettings.timezone,
                dateFormat: systemSettings.dateFormat,
            },
        };
    } catch (error) {
        console.error("Update general settings error:", error);
        return { success: false, message: "Failed to update general settings" };
    }
};

// ============ Notification Settings ============
const getNotificationSettings = async (userId: string) => {
    try {
        const userSettings = userSettingsStore[userId];
        const defaultSettings = {
            emailNotifications: true,
            pushNotifications: true,
            taskAssigned: true,
            taskStatusChanged: true,
            taskDueSoon: true,
            taskOverdue: true,
            commentAdded: true,
            mentioned: true,
            projectInvite: true,
            weeklyDigest: false,
        };

        return {
            success: true,
            data: userSettings?.notificationSettings || defaultSettings,
        };
    } catch (error) {
        console.error("Get notification settings error:", error);
        return { success: false, message: "Failed to fetch notification settings" };
    }
};

const updateNotificationSettings = async (userId: string, settings: any) => {
    try {
        if (!userSettingsStore[userId]) {
            userSettingsStore[userId] = {
                userId,
                notificationSettings: {},
                themeSettings: {},
                securitySettings: {},
                updatedAt: new Date(),
            };
        }

        userSettingsStore[userId].notificationSettings = {
            ...userSettingsStore[userId].notificationSettings,
            ...settings,
        };
        userSettingsStore[userId].updatedAt = new Date();

        return { success: true };
    } catch (error) {
        console.error("Update notification settings error:", error);
        return { success: false, message: "Failed to update notification settings" };
    }
};

// ============ Theme Settings ============
const getThemeSettings = async (userId: string) => {
    try {
        const userSettings = userSettingsStore[userId];
        const defaultSettings = {
            theme: "light", // light, dark, system
            sidebarCollapsed: false,
            fontSize: "medium", // small, medium, large
            compactView: false,
        };

        return {
            success: true,
            data: userSettings?.themeSettings || defaultSettings,
        };
    } catch (error) {
        console.error("Get theme settings error:", error);
        return { success: false, message: "Failed to fetch theme settings" };
    }
};

const updateThemeSettings = async (userId: string, settings: any) => {
    try {
        if (!userSettingsStore[userId]) {
            userSettingsStore[userId] = {
                userId,
                notificationSettings: {},
                themeSettings: {},
                securitySettings: {},
                updatedAt: new Date(),
            };
        }

        userSettingsStore[userId].themeSettings = {
            ...userSettingsStore[userId].themeSettings,
            ...settings,
        };
        userSettingsStore[userId].updatedAt = new Date();

        return {
            success: true,
            data: userSettingsStore[userId].themeSettings,
        };
    } catch (error) {
        console.error("Update theme settings error:", error);
        return { success: false, message: "Failed to update theme settings" };
    }
};

// ============ Security Settings ============
const getSecuritySettings = async (userId: string) => {
    try {
        const userSettings = userSettingsStore[userId];
        const defaultSettings = {
            twoFactorEnabled: false,
            sessionTimeout: 60, // minutes
            loginNotifications: true,
        };

        return {
            success: true,
            data: userSettings?.securitySettings || defaultSettings,
        };
    } catch (error) {
        console.error("Get security settings error:", error);
        return { success: false, message: "Failed to fetch security settings" };
    }
};

const updateSecuritySettings = async (userId: string, settings: any) => {
    try {
        if (!userSettingsStore[userId]) {
            userSettingsStore[userId] = {
                userId,
                notificationSettings: {},
                themeSettings: {},
                securitySettings: {},
                updatedAt: new Date(),
            };
        }

        userSettingsStore[userId].securitySettings = {
            ...userSettingsStore[userId].securitySettings,
            ...settings,
        };
        userSettingsStore[userId].updatedAt = new Date();

        return { success: true };
    } catch (error) {
        console.error("Update security settings error:", error);
        return { success: false, message: "Failed to update security settings" };
    }
};

// ============ Session Management ============
const getSessions = async (userId: string, currentToken: string) => {
    try {
        const sessions = await prisma.session.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        const formattedSessions = sessions.map(session => ({
            id: session.id,
            userAgent: session.userAgent || "Unknown Device",
            ipAddress: session.ipAddress || "Unknown IP",
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            isCurrent: session.token === currentToken,
        }));

        return {
            success: true,
            data: formattedSessions,
        };
    } catch (error) {
        console.error("Get sessions error:", error);
        return { success: false, message: "Failed to fetch sessions" };
    }
};

const revokeSession = async (userId: string, sessionId: string) => {
    try {
        const session = await prisma.session.findFirst({
            where: { id: sessionId, userId },
        });

        if (!session) {
            return { success: false, message: "Session not found" };
        }

        await prisma.session.delete({
            where: { id: sessionId },
        });

        return { success: true };
    } catch (error) {
        console.error("Revoke session error:", error);
        return { success: false, message: "Failed to revoke session" };
    }
};

const revokeAllSessions = async (userId: string, currentToken: string) => {
    try {
        await prisma.session.deleteMany({
            where: {
                userId,
                token: { not: currentToken },
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Revoke all sessions error:", error);
        return { success: false, message: "Failed to revoke sessions" };
    }
};

// ============ System Settings (Admin Only) ============
const getSystemSettings = async () => {
    try {
        return {
            success: true,
            data: {
                maintenanceMode: systemSettings.maintenanceMode,
                allowRegistration: systemSettings.allowRegistration,
                requireEmailVerification: systemSettings.requireEmailVerification,
                defaultUserRole: systemSettings.defaultUserRole,
                maxProjectPerUser: systemSettings.maxProjectPerUser,
                maxFileSize: systemSettings.maxFileSize,
                allowedFileTypes: systemSettings.allowedFileTypes,
            },
        };
    } catch (error) {
        console.error("Get system settings error:", error);
        return { success: false, message: "Failed to fetch system settings" };
    }
};

const updateSystemSettings = async (settings: any, updatedBy: string) => {
    try {
        systemSettings = { ...systemSettings, ...settings };

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ADMIN_ACTION",
                message: "System settings were updated",
                userId: updatedBy,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Update system settings error:", error);
        return { success: false, message: "Failed to update system settings" };
    }
};

export const settingsService = {
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