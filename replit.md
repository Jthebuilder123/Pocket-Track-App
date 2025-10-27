# PocketTrack - Subscription Management Tracker

## Overview
PocketTrack is a modern web application designed to help users efficiently track and manage their recurring subscriptions. It provides tools for monitoring spending, visualizing costs by category, and staying informed about upcoming renewals. The project aims to offer a comprehensive solution for personal finance management focused on subscription services. It is available as a Progressive Web App (PWA) and native iOS/Android applications.

## User Preferences
- Clean, modern SaaS dashboard aesthetic
- Linear + Notion inspired design
- Focus on clarity and information density
- Smooth, purposeful interactions

## System Architecture

### UI/UX Decisions
The application features a responsive design built with React and Shadcn UI, styled using Tailwind CSS. It utilizes Recharts for data visualization, presenting spending analytics by category and billing frequency, and a timeline view for upcoming renewals. The design emphasizes clarity, information density, and smooth interactions, inspired by modern SaaS dashboards like Linear and Notion.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and React Hook Form with Zod for form handling.
- **Backend**: Express.js with TypeScript, providing a robust API for all functionalities.
- **Database**: PostgreSQL with Drizzle ORM for persistent data storage with full multi-tenant data isolation.
- **Authentication**: Replit Auth (OpenID Connect) supporting Google OAuth, GitHub, X (Twitter), Apple, and email/password login via Passport.js with session management.
- **Key Features**:
    - Comprehensive subscription lifecycle management (add, edit, delete, cancel) with ownership verification.
    - **Cancellation Assistance**: Subscriptions can include cancellation help (URL, email, phone, step-by-step instructions) in an expandable form section, with a "Cancellation Help" dialog on subscription cards.
    - Visual analytics dashboard.
    - Export and import functionalities (CSV/JSON) gated by plan tier.
    - **Bank Statement Import**: Upload bank statements (PDF/CSV/Excel) to automatically detect recurring transactions and suggest subscriptions for approval. Uses pdf-parse, papaparse, and xlsx libraries with pattern analysis.
    - **Self-Tracking**: When users subscribe to Essentials or Pro plans, PocketTrack automatically creates a subscription entry in their dashboard to track their own PocketTrack subscription (with actual price, billing cycle, and renewal dates from Stripe).
    - Webhook system for external integrations gated by plan tier.
    - Email notification preferences for renewal reminders.
    - Audit trail for subscription changes.
    - Three-tier pricing system (Free, Essentials, Pro) with feature gates enforcing per-user limits.
    - **Auto-sync Feature Flag**: Premium (Pro) plan includes `autoSyncEnabled` flag for future automatic bank transaction syncing capability.
- **PWA**: Converted to a Progressive Web App with offline support, installability, and standalone mode using a web app manifest and service worker.
- **Native Mobile Apps**: Wrapped as native iOS and Android applications using Capacitor, enabling app store distribution and secure OAuth flows via system browsers (SFSafariViewController/Custom Tabs) and deep linking.

### System Design Choices
The system is built with a clear separation of concerns between client and server. Shared types and schemas are centralized. Authentication includes rate limiting and secure session management. Production readiness features include health monitoring, structured logging, robust error handling, and environment variable validation for security.

## External Dependencies
- **Plaid API**: Used for secure bank account integration, transaction analysis, and automatic subscription detection. Requires `PLAID_CLIENT_ID` and `PLAID_SECRET`.
- **Stripe**: Payment processing for subscription plans with webhook-based plan activation. Requires `STRIPE_SECRET_KEY`. Pricing is defined dynamically in `shared/pricing.ts`.
- **PostgreSQL**: Relational database for all application data storage with proper multi-tenant isolation.
- **SendGrid**: (Configurable) for email delivery of magic links and notifications. Requires `SENDGRID_API_KEY`.