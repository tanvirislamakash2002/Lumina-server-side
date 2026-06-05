
# ✨ Lumina - Server Side

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Express.js](https://img.shields.io/badge/Express.js-5.0-000000)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.5-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1)](https://neon.tech/)

Lumina is a **Smart Project & Task Collaboration System** that helps teams manage projects, tasks, team members, and work progress with proper validation and workflow handling. This repository contains the complete **backend API** built with Express.js, Prisma, and PostgreSQL.

**Live API:** [https://lumina-server.vercel.app](https://lumina-server.vercel.app)

---

## ✨ Key Features

### Core Features
- **🔐 Authentication** - Email/password + Google OAuth with Better-Auth, session management
- **👑 Role-Based Access** - Admin, Project Manager, and Team Member roles with granular permissions
- **📋 Project Management** - Create, update, delete, and view projects with status tracking
- **✅ Task Management** - Full CRUD with priorities, statuses, and deadline validation
- **👥 Team Collaboration** - Add/remove members, assign tasks, member-wise task lists
- **📊 Progress Tracking** - Dashboard with KPI cards, charts, and project summaries
- **📝 Activity Log** - Track all system actions with detailed history
- **🔔 Notifications** - Real-time notifications for assignments, status changes, and mentions

### Additional Features
- **💬 Comments** - Task comments with nested replies
- **📎 File Attachments** - Upload and manage task attachments
- **🔍 Search & Filters** - Advanced search with multiple filter options
- **📈 Analytics** - Platform stats, completion rates, and productivity insights
- **⚙️ Settings** - User preferences and system configuration
- **🎨 Dark/Light Mode** - Theme support (handled by frontend)

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js 5 |
| **Language** | TypeScript |
| **ORM** | Prisma 7 |
| **Database** | PostgreSQL (Neon Tech) |
| **Authentication** | Better-Auth |
| **Email** | Nodemailer (Gmail SMTP) |
| **File Upload** | Multer + ImgBB |
| **Validation** | Zod |
| **Deployment** | Vercel / Render |

## 📁 Project Structure

```
src/
├── generated/         # Prisma generated client
├── helpers/           # Utility helper functions
├── lib/               # Core libraries (Prisma, Auth)
├── middlewares/       # Express middlewares
├── modules/           # Feature modules
│   ├── admin/         # Admin dashboard and management
│   ├── users/         # User profile and management
│   ├── projects/      # Project CRUD and operations
│   ├── tasks/         # Task management
│   ├── project-members/# Team member management
│   ├── comments/      # Comment system
│   ├── attachments/   # File upload handling
│   ├── activities/    # Activity logging
│   ├── notifications/ # Notification system
│   ├── dashboard/     # Dashboard analytics
│   ├── stats/         # Platform statistics
│   ├── search/        # Global search
│   ├── filters/       # Filter options
│   └── settings/      # System settings
├── app.ts             # Express app configuration
└── server.ts          # Server entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon Tech account)
- Gmail account (for email notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tanvirislamakash2002/Lumina-server-side.git
   cd Lumina-server-side
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@host/database"

   # Server
   PORT=5000
   APP_URL=http://localhost:3000
   BETTER_AUTH_URL=http://localhost:5000
   BETTER_AUTH_SECRET=your_secret_key

   # Email (Gmail)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   EMAIL_FROM=noreply@lumina.com
   EMAIL_SECURE=false

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Image Upload (ImgBB)
   IMGBB_API_KEY=your_imgbb_api_key

   # CORS
   PROD_APP_URL=https://lumina.vercel.app
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma migrate dev --name init
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. The API will be available at `http://localhost:5000`

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npx prisma studio` | Open Prisma database GUI |

## 🔗 Important Links

| Resource | Link |
|----------|------|
| **Backend Repository** | [Lumina-server-side](https://github.com/tanvirislamakash2002/Lumina-server-side) |
| **Frontend Repository** | [Lumina-client-side](https://github.com/tanvirislamakash2002/Lumina-client-side) |
| **Live Backend** | [https://lumina-server.vercel.app](https://lumina-server.vercel.app) |
| **Live Frontend** | [https://lumina.vercel.app](https://lumina.vercel.app) |

## 👨‍💻 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@lumina.com | admin123 |
| **Project Manager** | pm@lumina.com | pm123 |
| **Team Member** | member@lumina.com | member123 |

## 📡 API Endpoints Overview

| Module | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| **Auth** | POST | `/api/auth/...` | Authentication routes |
| **Users** | GET | `/api/v1/users/me` | Get current user profile |
| | PATCH | `/api/v1/users/me` | Update profile |
| **Projects** | GET | `/api/v1/projects` | Get all projects |
| | POST | `/api/v1/projects` | Create project (PM/Admin) |
| | GET | `/api/v1/projects/:id` | Get project details |
| | PATCH | `/api/v1/projects/:id` | Update project |
| | DELETE | `/api/v1/projects/:id` | Delete project |
| **Tasks** | GET | `/api/v1/tasks/project/:projectId` | Get project tasks |
| | POST | `/api/v1/tasks/project/:projectId` | Create task |
| | PATCH | `/api/v1/tasks/:id/status` | Update task status |
| **Comments** | GET | `/api/v1/comments/task/:taskId` | Get task comments |
| | POST | `/api/v1/comments/task/:taskId` | Add comment |
| **Admin** | GET | `/api/v1/admin/users` | Get all users |
| | PATCH | `/api/v1/admin/users/:id/role` | Change user role |
| **Dashboard** | GET | `/api/v1/dashboard` | Get dashboard data |
| | GET | `/api/v1/dashboard/kpi` | Get KPI cards |
| **Stats** | GET | `/api/v1/stats/platform` | Get platform stats |
| | GET | `/api/v1/stats/user` | Get user stats |
| **Search** | GET | `/api/v1/search?q=query` | Global search |
| **Filters** | GET | `/api/v1/filters/options` | Get filter options |

## 🔄 Database Schema

Key models:
- **User** - Account management with roles (ADMIN/PROJECT_MANAGER/TEAM_MEMBER)
- **Project** - Project details with status (ACTIVE/COMPLETED/ON_HOLD)
- **ProjectMember** - Many-to-many relation between users and projects
- **Task** - Task management with priority (HIGH/MEDIUM/LOW) and status (TODO/IN_PROGRESS/COMPLETED)
- **Comment** - Nested comment system for tasks
- **Attachment** - File attachments for tasks
- **Activity** - Audit trail of all user actions
- **Notification** - User notifications

## 🛡️ Role Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, system settings |
| **Project Manager** | Create/manage projects, assign tasks, manage team |
| **Team Member** | Update assigned tasks, collaborate, track progress |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License.

## 🙏 Acknowledgements

- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [Better-Auth](https://better-auth.com/)
- [Neon Tech](https://neon.tech/)
- [ImgBB](https://imgbb.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---
