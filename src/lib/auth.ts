import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import nodemailer from "nodemailer";
import { bearer } from "better-auth/plugins";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    plugins: [
        bearer(),
    ],
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
    trustedOrigins: [
        "http://localhost:3000",
        "https://lumina.vercel.app",
        "https://lumina-server.vercel.app",
    ],
    cookie: {
        name: "lumina-auth",
        attributes: {
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        }
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "TEAM_MEMBER",
                required: true,
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        requireEmailVerification: false, // Set to true if you want email verification
    },
    emailVerification: {
        sendOnSignUp: false,
        autoSignInAfterVerification: false,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            try {
                const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
                await transporter.sendMail({
                    from: `"Lumina" <${process.env.EMAIL_FROM || "noreply@lumina.com"}>`,
                    to: user.email,
                    subject: "Verify Your Email - Lumina",
                    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Lumina</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; margin-top: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <!-- Header -->
        <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">✨ Lumina</h1>
                <p style="color: #c7d2fe; margin: 5px 0 0; font-size: 16px;">Smart Project & Task Collaboration</p>
            </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
            <td style="padding: 40px;">
                <h2 style="color: #4f46e5; margin: 0 0 20px; font-size: 24px;">Verify Your Email Address</h2>
                
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px;">Hello ${user.name},</p>
                
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px;">Thank you for joining <strong style="color: #4f46e5;">Lumina</strong>! To complete your registration and start managing your projects, please verify your email address by clicking the button below:</p>
                
                <!-- Verification Button -->
                <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                        <td style="background: #4f46e5; border-radius: 50px; text-align: center; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);">
                            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">Verify Email Address</a>
                        </td>
                    </tr>
                </table>
                
                <!-- Alternative Link -->
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px;">Or copy and paste this link into your browser:</p>
                <p style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; word-break: break-all; margin: 0 0 20px;">
                    <a href="${verificationUrl}" style="color: #4f46e5; text-decoration: none; font-size: 14px;">${verificationUrl}</a>
                </p>
                
                <!-- Expiry Notice -->
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>⚠️ Link Expires in 24 Hours</strong><br>
                        This verification link will expire in 24 hours for security reasons.
                    </p>
                </div>
                
                <p style="color: #4b5563; line-height: 1.6; margin: 20px 0 0;">If you didn't create an account with Lumina, you can safely ignore this email.</p>
            </td>
        </tr>
        
        <!-- Features Section -->
        <tr>
            <td style="padding: 0 40px 30px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="border-top: 1px solid #e5e7eb; padding-top: 25px;">
                            <h3 style="color: #4f46e5; margin: 0 0 20px; font-size: 18px; text-align: center;">What you can do with Lumina:</h3>
                            
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="33%" style="text-align: center; padding: 10px;">
                                        <div style="background-color: #e0e7ff; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; margin: 0 auto 10px; font-size: 24px;">📋</div>
                                        <p style="color: #4b5563; margin: 0; font-size: 14px;">Manage Projects</p>
                                    </td>
                                    <td width="33%" style="text-align: center; padding: 10px;">
                                        <div style="background-color: #e0e7ff; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; margin: 0 auto 10px; font-size: 24px;">✅</div>
                                        <p style="color: #4b5563; margin: 0; font-size: 14px;">Track Tasks</p>
                                    </td>
                                    <td width="33%" style="text-align: center; padding: 10px;">
                                        <div style="background-color: #e0e7ff; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; margin: 0 auto 10px; font-size: 24px;">👥</div>
                                        <p style="color: #4b5563; margin: 0; font-size: 14px;">Collaborate</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- Footer -->
        <tr>
            <td style="background-color: #1e1b4b; padding: 30px 40px; border-radius: 0 0 10px 10px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="text-align: center;">
                            <p style="color: #a5b4fc; margin: 0 0 10px; font-size: 14px;">© 2026 Lumina. All rights reserved.</p>
                            <p style="color: #a5b4fc; margin: 0 0 15px; font-size: 14px;">Illuminate your workflow, one task at a time.</p>
                            
                            <p style="color: #c7d2fe; margin: 0; font-size: 12px;">This email was sent to ${user.email}.</p>
                        </td>
                    </tr>
                </table>
            </table>
        </tr>
    </table>
</body>
</html>`
                });
            } catch (error) {
                console.error("Email verification error:", error);
                throw error;
            }
        },
    },
    socialProviders: {
        google: {
            prompt: "select_account consent",
            accessType: "offline",
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
    },
    advanced: {
        cookiePrefix: "lumina",
        useSecureCookies: process.env.NODE_ENV === "production",
        crossSubDomainCookies: {
            enabled: false,
        },
        disableCSRFCheck: true,
    },
});