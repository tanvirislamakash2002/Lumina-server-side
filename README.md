
# 🌿 GreenSpark - Server Side

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Express.js](https://img.shields.io/badge/Express.js-5.0-000000)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.5-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1)](https://neon.tech/)

GreenSpark is an online community portal where members can share, discover, and fund sustainability-oriented ideas. This repository contains the complete **backend API** built with Express.js, Prisma, and PostgreSQL.

**Live API:** [https://greenspark-server.vercel.app](https://greenspark-server.vercel.app)

---

## ✨ Key Features

- **🔐 Authentication** - JWT-based authentication with Better-Auth (email/password + Google OAuth)
- **💡 Idea Management** - Full CRUD operations with draft, pending, approved, rejected workflow
- **💰 Payment Integration** - Stripe payment processing for premium ideas
- **👍 Voting System** - Upvote/downvote with vote score tracking
- **💬 Comments** - Nested comment system with report and moderation features
- **🔖 Bookmarks** - Save favorite ideas
- **👑 Admin Controls** - User management, idea moderation, platform analytics
- **📧 Email Notifications** - Nodemailer for verification and alerts
- **📊 Activity Logging** - Track all user actions

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js 5 |
| **Language** | TypeScript |
| **ORM** | Prisma 7 |
| **Database** | PostgreSQL (Neon Tech) |
| **Authentication** | Better-Auth |
| **Payments** | Stripe |
| **Email** | Nodemailer (Gmail SMTP) |
| **File Upload** | Multer + ImgBB |
| **Validation** | Zod |
| **Deployment** | Vercel / Render |

## 📁 Project Structure

```
src/
├── config/            # Configuration files (Stripe, etc.)
├── generated/         # Prisma generated client
├── helpers/           # Utility helper functions
├── lib/               # Core libraries (Prisma, Auth)
├── middlewares/       # Express middlewares (auth, error handler)
├── modules/           # Feature modules
│   ├── auth/          # Authentication logic
│   ├── ideas/         # Idea CRUD and moderation
│   ├── comments/      # Comment system
│   ├── votes/         # Voting system
│   ├── bookmarks/     # Bookmark functionality
│   ├── payments/      # Stripe payment processing
│   ├── users/         # User management (admin)
│   ├── profile/       # Member profile management
│   ├── settings/      # Admin settings
│   ├── dashboard/     # Admin & member dashboards
│   ├── category/      # Category management
│   ├── newsletter/    # Newsletter subscription
│   ├── stats/         # Platform statistics
│   └── upload/        # File upload handling
├── scripts/           # Database seeding scripts
├── app.ts             # Express app configuration
└── server.ts          # Server entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon Tech account)
- Stripe account (for payments)
- Gmail account (for email notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tanvirislamakash2002/GreenSpark-server-side.git
   cd GreenSpark-server-side
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
   BETTER_AUTH_URL=http://localhost:3000
   BETTER_AUTH_SECRET=your_secret_key

   # Email (Gmail)
   APP_USER=your_email@gmail.com
   APP_PASSWORD=your_app_password

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Image Upload (ImgBB)
   IMGBB_API_KEY=your_imgbb_api_key

   # Stripe
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma migrate dev --name init
   ```

5. **Seed admin user (optional)**
   ```bash
   npm run seed:admin
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. The API will be available at `http://localhost:5000`

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run seed:admin` | Seed admin user |
| `npm run seed:sellers` | Seed seller accounts |
| `npx prisma studio` | Open Prisma database GUI |

## 🔗 Important Links

| Resource | Link |
|----------|------|
| **Backend Repository** | [GreenSpark-server-side](https://github.com/tanvirislamakash2002/GreenSpark-server-side) |
| **Frontend Repository** | [GreenSpark-client-side](https://github.com/tanvirislamakash2002/GreenSpark-client-side) |
| **Live Backend** | [https://greenspark-server.vercel.app](https://greenspark-server.vercel.app) |
| **Live Frontend** | [https://greenspark1.vercel.app](https://greenspark1.vercel.app) |
| **Demo Video** | [Watch Demo](https://drive.google.com/drive/folders/1q7Un1fX-roWt3DLvpnVtoBb2UmqXa8Ko) |

## 👨‍💻 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | westbrook@gmail.com | westbrook123 |
| **Member** | *(Register via frontend)* | *(Choose your own)* |

## 📡 API Endpoints Overview

| Module | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| **Auth** | POST | `/api/auth/...` | Authentication routes |
| **Ideas** | GET | `/api/v1/ideas` | Get all approved ideas |
| | GET | `/api/v1/ideas/:id` | Get idea details |
| | POST | `/api/v1/ideas` | Create idea (member) |
| | PATCH | `/api/v1/ideas/:id/approve` | Approve idea (admin) |
| **Comments** | GET | `/api/v1/comments/idea/:ideaId` | Get comments |
| | POST | `/api/v1/comments/idea/:ideaId` | Add comment |
| **Votes** | POST | `/api/v1/votes/:ideaId` | Cast vote |
| | DELETE | `/api/v1/votes/:ideaId` | Remove vote |
| **Payments** | POST | `/api/v1/payments/create-payment-intent` | Create Stripe payment |
| | POST | `/api/v1/payments/webhook` | Stripe webhook |
| **Admin** | GET | `/api/v1/admin/users` | Get all users |
| | PATCH | `/api/v1/admin/users/:id/role` | Change user role |

## 🔄 Database Schema

Key models:
- **User** - Account management, roles (MEMBER/ADMIN)
- **Idea** - Core content with status (DRAFT/PENDING/APPROVED/REJECTED)
- **Comment** - Nested comment system with soft delete
- **Vote** - Upvote/downvote tracking
- **Payment** - Stripe payment records
- **Bookmark** - Saved ideas
- **Category** - Idea categorization
- **ActivityLog** - Audit trail of user actions

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
- [Stripe](https://stripe.com/)
- [Neon Tech](https://neon.tech/)
- [ImgBB](https://imgbb.com/)

---

**Built with 💚 for a sustainable future**
"# Lumina-server-side" 
"# Lumina-server-side" 
