import FormData from "form-data";
import axios from "axios";
import { prisma } from "../../lib/prisma";

// Core upload function to ImgBB (or your preferred service)
const uploadToImgbb = async (fileBuffer: Buffer, fileName?: string): Promise<string> => {
    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("No file provided");
    }

    const formData = new FormData();
    const base64Image = fileBuffer.toString('base64');
    formData.append('image', base64Image);

    if (fileName) {
        const name = fileName.split('.')[0];
        formData.append('name', `lumina_${Date.now()}_${name}`);
    }

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

// For file attachments (non-image), use a different service or store locally
// For now, using ImgBB but ideally you'd use cloud storage like AWS S3, Cloudinary, etc.
const uploadFile = async (fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
    // Option 1: Use ImgBB for images only, reject others
    if (mimeType.startsWith('image/')) {
        return await uploadToImgbb(fileBuffer, fileName);
    }
    
    // Option 2: For non-images, you need a different service
    // This is a placeholder - implement with AWS S3, Cloudinary, etc.
    throw new Error("File storage for non-images not configured. Please use image files only.");
};

// Upload avatar with user update
const uploadAvatar = async (userId: string, fileBuffer: Buffer, fileName?: string) => {
    try {
        const imageUrl = await uploadToImgbb(fileBuffer, fileName);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { image: imageUrl },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true
            }
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "USER_LOGIN",
                message: `User ${updatedUser.name} updated their avatar`,
                userId: userId,
            }
        });

        return {
            success: true,
            message: "Avatar uploaded successfully",
            data: {
                url: updatedUser.image,
                user: updatedUser
            }
        };
    } catch (error) {
        console.error("Avatar upload error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to upload avatar"
        };
    }
};

// Remove avatar
const removeAvatar = async (userId: string) => {
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { image: null },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true
            }
        });

        return {
            success: true,
            message: "Avatar removed successfully",
            data: {
                user: updatedUser
            }
        };
    } catch (error) {
        console.error("Avatar removal error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to remove avatar"
        };
    }
};

// Upload task attachment
const uploadTaskAttachment = async (
    taskId: string, 
    userId: string, 
    fileBuffer: Buffer, 
    fileName: string,
    mimeType: string,
    fileSize: number
) => {
    try {
        // Verify task exists and user has access
        const task = await prisma.task.findFirst({
            where: { id: taskId },
            include: {
                project: {
                    include: {
                        members: {
                            where: { userId }
                        }
                    }
                }
            }
        });

        if (!task) {
            return {
                success: false,
                message: "Task not found"
            };
        }

        // Check if user is assigned to task, project member, project manager, or admin
        const isAssigned = task.assignedTo === userId;
        const isProjectMember = task.project.members.length > 0;
        
        // Get user role
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        
        const isAdmin = user?.role === "ADMIN";
        const isProjectManager = user?.role === "PROJECT_MANAGER";

        if (!isAssigned && !isProjectMember && !isAdmin && !isProjectManager) {
            return {
                success: false,
                message: "You don't have permission to upload files to this task"
            };
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
                message: uploadError instanceof Error ? uploadError.message : "Failed to upload file"
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
            }
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ATTACHMENT_ADDED",
                message: `File "${fileName}" attached to task "${task.title}"`,
                userId: userId,
                projectId: task.projectId,
                taskId: taskId,
            }
        });

        return {
            success: true,
            message: "File attached successfully",
            data: attachment
        };
    } catch (error) {
        console.error("Task attachment upload error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to upload attachment"
        };
    }
};

// Delete task attachment
const deleteTaskAttachment = async (attachmentId: string, userId: string, userRole: string) => {
    try {
        const attachment = await prisma.attachment.findFirst({
            where: { id: attachmentId },
            include: {
                task: {
                    include: {
                        project: true
                    }
                }
            }
        });

        if (!attachment) {
            return {
                success: false,
                message: "Attachment not found"
            };
        }

        // Check permissions
        const isUploader = attachment.uploadedBy === userId;
        const isAdmin = userRole === "ADMIN";
        const isProjectManager = userRole === "PROJECT_MANAGER";

        if (!isUploader && !isAdmin && !isProjectManager) {
            return {
                success: false,
                message: "You don't have permission to delete this attachment"
            };
        }

        // Delete from database (file will remain in cloud storage)
        await prisma.attachment.delete({
            where: { id: attachmentId }
        });

        // Log activity
        await prisma.activity.create({
            data: {
                action: "ATTACHMENT_ADDED",
                message: `File "${attachment.originalName}" removed from task "${attachment.task.title}"`,
                userId: userId,
                projectId: attachment.task.projectId,
                taskId: attachment.taskId,
            }
        });

        return {
            success: true,
            message: "Attachment deleted successfully"
        };
    } catch (error) {
        console.error("Delete attachment error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to delete attachment"
        };
    }
};

// Get task attachments
const getTaskAttachments = async (taskId: string) => {
    try {
        const attachments = await prisma.attachment.findMany({
            where: { taskId },
            orderBy: { createdAt: "desc" },
            include: {
                uploader: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    }
                }
            }
        });

        return {
            success: true,
            data: attachments
        };
    } catch (error) {
        console.error("Get attachments error:", error);
        return {
            success: false,
            message: "Failed to fetch attachments"
        };
    }
};

// Upload project image
const uploadProjectImage = async (
    projectId: string,
    userId: string,
    userRole: string,
    fileBuffer: Buffer,
    fileName?: string
) => {
    try {
        // Verify project exists and user has permission
        const project = await prisma.project.findFirst({
            where: { id: projectId },
            include: {
                members: {
                    where: { userId }
                }
            }
        });

        if (!project) {
            return {
                success: false,
                message: "Project not found"
            };
        }

        const isAdmin = userRole === "ADMIN";
        const isProjectManager = userRole === "PROJECT_MANAGER";
        const isProjectMember = project.members.length > 0;

        if (!isProjectManager && !isAdmin && !isProjectMember) {
            return {
                success: false,
                message: "You don't have permission to modify this project"
            };
        }

        const imageUrl = await uploadToImgbb(fileBuffer, fileName);

        // Note: Add an `imageUrl` field to your Project model if needed
        // const updatedProject = await prisma.project.update({
        //     where: { id: projectId },
        //     data: { imageUrl }
        // });

        return {
            success: true,
            message: "Project image uploaded successfully",
            data: {
                projectId,
                url: imageUrl
            }
        };
    } catch (error) {
        console.error("Project image upload error:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to upload project image"
        };
    }
};

export const uploadService = {
    uploadToImgbb,
    uploadFile,
    uploadAvatar,
    removeAvatar,
    uploadTaskAttachment,
    deleteTaskAttachment,
    getTaskAttachments,
    uploadProjectImage,
};