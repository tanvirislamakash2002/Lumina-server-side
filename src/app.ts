import { toNodeHandler } from "better-auth/node";
import express, { Application, Request, Response } from "express"
import { auth } from "./lib/auth";
import cors from "cors"
import errorHandler from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import { optionalAuth } from "./middlewares/optionalAuth";
import { uploadRouter } from "./modules/upload/upload.route";
import { usersRouter } from "./modules/users/users.route";
import { projectsRouter } from "./modules/projects/projects.route";
import { tasksRouter } from "./modules/tasks/tasks.route";
import { projectMembersRouter } from "./modules/project-members/project-members.route";
import { commentsRouter } from "./modules/comments/comments.route";
import { attachmentsRouter } from "./modules/attachments/attachments.route";
import { activitiesRouter } from "./modules/activities/activities.route";
import { notificationsRouter } from "./modules/notifications/notifications.route";
import { dashboardRouter } from "./modules/dashboard/dashboard.route";

const app: Application = express()


const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5000",
    "https://lumina.vercel.app",
    "https://lumina-server.vercel.app",
    process.env.APP_URL || "http://localhost:3000",
    process.env.PROD_APP_URL, // Production frontend URL
].filter(Boolean);


app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            // Check if origin is in allowedOrigins or matches Vercel preview pattern
            const isAllowed =
                allowedOrigins.includes(origin) ||
                /^https:\/\/invio-.*\.vercel\.app$/.test(origin) ||  // ← CHANGE to your frontend name
                /^https:\/\/.*\.vercel\.app$/.test(origin); // Any Vercel deployment

            if (isAllowed) {
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
        exposedHeaders: ["Set-Cookie"],
    }),
);
app.use(express.json())

app.use(optionalAuth);

app.all("/api/auth/*splat", toNodeHandler(auth));


app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/project-members', projectMembersRouter);
app.use('/api/v1/comments', commentsRouter);
app.use('/api/v1/attachments', attachmentsRouter);
app.use('/api/v1/activities', activitiesRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/dashboard', dashboardRouter);

app.get("/", (req, res) => {
    res.send("welcome to lumina server!")
})

app.use(notFound)
app.use(errorHandler)

export default app;