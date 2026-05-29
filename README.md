# Prokip Agent Qualification Portal

A modern, scalable, mobile-first qualification and examination platform for Prokip agents.

## Features

- 🎓 **Professional CBT Examination System** — Full-screen, timed, auto-save, auto-submit
- 👥 **Role-Based Access** — Admin, State Manager, Agent
- 📝 **Question Bank** — Multiple Choice, Multiple Answers, True/False, Short Answer, Scenario-based
- 📊 **Analytics Dashboard** — Pass rates, score distributions, state performance
- 📤 **Export System** — CSV, Excel
- 🔗 **Referral Registration** — State Manager unique registration links
- 📱 **Mobile-First** — Responsive, beautiful UI

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **Tailwind CSS v4**
- **JWT Authentication** (jose)

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL

# Push database schema
npm run db:push

# Seed sample data
npm run db:seed

# Start dev server
npm run dev
```

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@prokip.africa | admin123 |
| State Manager | kano.manager@prokip.africa | manager123 |

## Agent Registration

Agents register via referral links: `/register/kano/sm123`

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Registration
│   ├── (agent)/         # Agent dashboard
│   ├── (dashboard)/     # Admin & Manager dashboards
│   ├── (exam)/          # Exam interface
│   └── api/             # API routes
├── components/
│   ├── exam/            # ExamInterface, QuestionCard, Navigator, Review
│   ├── dashboard/       # Dashboard components
│   └── ui/              # Shared UI components
├── lib/                 # Prisma, auth, utils
└── middleware.ts        # Route protection
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Sample data seeder
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `NEXT_PUBLIC_APP_URL` | Application URL |

## Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run `npm run build`
4. Run `npm run db:push` then `npm run db:seed`
5. Run `npm start`

Compatible with Vercel, Railway, or any Node.js hosting.
