import { prisma } from "../../lib/prisma";
import FormData from "form-data";
import axios from "axios";

// Helper function to upload to ImgBB (or your preferred service)
const uploadToImgbb = async (fileBuffer: Buffer, fileName: string): Promise<string> => {
    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("No file provided");
    }

    const formData = new FormData();
    const base64Image = fileBuffer.toString('base64');
    formData.append('image', base64Image);

    const name = fileName.split('.')[0];
    formData.append('name', `lumina_${Date.now()}_${name}`);

    try {
        const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
            formData,
            {
                headers: { ...formData.getHeaders() },
                timeout: 30000
            }
        );

        if (response.data.success) {
            return response.data.data.url;
        } else {
            throw new Error(response.data.error?.message || 'Upload failed');
        }
    } catch (error) {
        console.error("ImgBB upload error:", error);
        throw new Error(error instanceof Error ? error.message : "Upload service unavailable");
    }
};

// For non-image files, you may want to use a different service
// This is a placeholder - implement with AWS S3, Cloudinary, etc.
const uploadFile = async (fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
    // For now, using ImgBB only supports images
    // For production, implement AWS S3, Cloudinary, or another file storage service
    if (mimeType.startsWith('image/')) {
        return await uploadToImgbb(fileBuffer, fileName);
    }
    
    // Placeholder for non-image files
    // TODO: Implement actual file storage for non-images
    throw new Error("File storage for non-images not configured. Please use image files or configure AWS S3.");
};

const uploadAttachment = async (
    taskId: string,
    userId: string,
    userRole: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    fileSize: number
) => {
    try {
        // Check if task exists and user has access
        const task = await prisma.task.findFirst({
            where: { id: taskId },
            include: {
                project: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
            },
        });

        if (!task) {
            return { success: false, message: "Task not found" };
        }

        // Check access
        const isProjectMember = task.project.members.length > 0;
        const hasAccess = isProjectMember || 
                          userRole === "ADMIN" || 
                          userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this task" };
        }

        // Upload file
        let fileUrl: string;
        try {
            if (mimeType.startsWith('image/')) {
                fileUrl = await uploadToImgbb(fileBuffer, fileName);
            } else {
                fileUrl = await uploadFile(fileBuffer, fileName, mimeType);
            }
        } catch (uploadError) {
            return {
                success: false,
                message: uploadError instanceof Error ? uploadError.message : "Failed to upload file",
            };
        }

        // Save attachment to database
        const attachment = await prisma.attachment.create({
            data: {
                filename: `lumina_${Date.now()}_${fileName}`,
                originalName: fileName,
                mimeType,
                size: fileSize,
                url: fileUrl,
                taskId,
                uploadedBy: userId,
            },
            include: {
                uploader: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                        projectId: true,
                    },
                },
            },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ATTACHMENT_ADDED",
                message: `File "${fileName}" attached to task "${attachment.task.title}"`,
                userId,
                projectId: attachment.task.projectId,
                taskId,
            },
        });

        // Create notification for task assignee
        if (task.assignedTo && task.assignedTo !== userId) {
            await prisma.notification.create({
                data: {
                    userId: task.assignedTo,
                    type: "COMMENT_ADDED",
                    message: `New file "${fileName}" attached to task "${task.title}"`,
                    metadata: {
                        taskId,
                        attachmentId: attachment.id,
                        projectId: attachment.task.projectId,
                    },
                },
            });
        }

        return {
            success: true,
            data: {
                id: attachment.id,
                filename: attachment.originalName,
                size: attachment.size,
                mimeType: attachment.mimeType,
                url: attachment.url,
                uploadedBy: attachment.uploader,
                createdAt: attachment.createdAt,
            },
        };
    } catch (error) {
        console.error("Upload attachment error:", error);
        return { success: false, message: "Failed to upload attachment" };
    }
};

const deleteAttachment = async (
    attachmentId: string,
    userId: string,
    userRole: string
) => {
    try {
        const attachment = await prisma.attachment.findUnique({
            where: { id: attachmentId },
            include: {
                task: {
                    include: {
                        project: true,
                    },
                },
                uploader: true,
            },
        });

        if (!attachment) {
            return { success: false, message: "Attachment not found" };
        }

        // Check permissions
        const isUploader = attachment.uploadedBy === userId;
        const canDelete = isUploader || 
                          userRole === "ADMIN" || 
                          userRole === "PROJECT_MANAGER";

        if (!canDelete) {
            return { success: false, message: "You don't have permission to delete this attachment" };
        }

        // Delete from database (file will remain in cloud storage)
        await prisma.attachment.delete({
            where: { id: attachmentId },
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ATTACHMENT_ADDED",
                message: `File "${attachment.originalName}" removed from task "${attachment.task.title}"`,
                userId,
                projectId: attachment.task.projectId,
                taskId: attachment.taskId,
            },
        });

        return {
            success: true,
            message: `Attachment "${attachment.originalName}" deleted successfully`,
        };
    } catch (error) {
        console.error("Delete attachment error:", error);
        return { success: false, message: "Failed to delete attachment" };
    }
};

const getTaskAttachments = async (
    taskId: string,
    userId: string,
    userRole: string,
    params: {
        page: number;
        limit: number;
    }
) => {
    try {
        const { page, limit } = params;
        const skip = (page - 1) * limit;

        // Check if user has access to the task
        const task = await prisma.task.findFirst({
            where: { id: taskId },
            include: {
                project: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
            },
        });

        if (!task) {
            return { success: false, message: "Task not found" };
        }

        const isProjectMember = task.project.members.length > 0;
        const hasAccess = isProjectMember || 
                          userRole === "ADMIN" || 
                          userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this task" };
        }

        const attachments = await prisma.attachment.findMany({
            where: { taskId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                uploader: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });

        const totalItems = await prisma.attachment.count({ where: { taskId } });

        const stats = {
            total: totalItems,
            totalSize: attachments.reduce((sum, a) => sum + a.size, 0),
        };

        return {
            success: true,
            data: {
                attachments: attachments.map(att => ({
                    id: att.id,
                    filename: att.originalName,
                    size: att.size,
                    mimeType: att.mimeType,
                    url: att.url,
                    uploadedBy: att.uploader,
                    createdAt: att.createdAt,
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalItems / limit),
                    totalItems,
                    itemsPerPage: limit,
                },
                stats,
            },
        };
    } catch (error) {
        console.error("Get task attachments error:", error);
        return { success: false, message: "Failed to fetch attachments" };
    }
};

const getAttachmentById = async (
    attachmentId: string,
    userId: string,
    userRole: string
) => {
    try {
        const attachment = await prisma.attachment.findUnique({
            where: { id: attachmentId },
            include: {
                uploader: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                task: {
                    include: {
                        project: {
                            include: {
                                members: {
                                    where: { userId },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!attachment) {
            return { success: false, message: "Attachment not found" };
        }

        // Check access
        const isProjectMember = attachment.task.project.members.length > 0;
        const hasAccess = isProjectMember || 
                          userRole === "ADMIN" || 
                          userRole === "PROJECT_MANAGER";

        if (!hasAccess) {
            return { success: false, message: "You don't have access to this attachment" };
        }

        return {
            success: true,
            data: {
                id: attachment.id,
                filename: attachment.originalName,
                size: attachment.size,
                mimeType: attachment.mimeType,
                url: attachment.url,
                uploadedBy: attachment.uploader,
                createdAt: attachment.createdAt,
                taskId: attachment.taskId,
                taskTitle: attachment.task.title,
            },
        };
    } catch (error) {
        console.error("Get attachment by ID error:", error);
        return { success: false, message: "Failed to fetch attachment" };
    }
};

const downloadAttachment = async (
    attachmentId: string,
    userId: string,
    userRole: string
) => {
    try {
        // Reuse getAttachmentById for access control
        const attachmentResult = await getAttachmentById(attachmentId, userId, userRole);

        if (!attachmentResult.success || !attachmentResult.data) {
            return { 
                success: false, 
                message: attachmentResult.message || "Attachment not found" 
            };
        }

        return {
            success: true,
            data: {
                url: attachmentResult.data.url,
                filename: attachmentResult.data.filename,
                mimeType: attachmentResult.data.mimeType,
            },
        };
    } catch (error) {
        console.error("Download attachment error:", error);
        return { success: false, message: "Failed to download attachment" };
    }
};

export const attachmentsService = {
    uploadAttachment,
    deleteAttachment,
    getTaskAttachments,
    getAttachmentById,
    downloadAttachment,
};