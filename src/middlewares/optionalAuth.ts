import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

let betterAuth: any;
const loadAuth = async () => {
    if (!betterAuth) {
        const authModule = await import("../lib/auth.js");
        betterAuth = await authModule.auth;
    }
    return betterAuth;
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authInstance = await loadAuth();
        const session = await authInstance.api.getSession({
            headers: req.headers as any
        });
        if (session) {
            const userFromDb = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { accountStatus: true }
            });

            req.user = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role,
                emailVerified: session.user.emailVerified,
                accountStatus: userFromDb?.accountStatus || 'ACTIVE'
            };
        }
        next();
    } catch (error) {
        next();
    }
};