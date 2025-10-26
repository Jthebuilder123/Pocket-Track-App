# PocketTrack - Subscription Management Tracker

## Overview
PocketTrack is a modern web application designed to help users efficiently track and manage their recurring subscriptions. It provides tools for monitoring spending, visualizing costs by category, and staying informed about upcoming renewals. The project aims to offer a comprehensive solution for personal finance management focused on subscription services.

## Recent Changes (October 26, 2025)
- **Page Flickering Fix**: Fixed infinite request loop caused by catch-all route using `window.location.replace()`. Changed to wouter's `Redirect` component for smooth client-side navigation.
- **Plaid Error Handling**: Improved error handling for missing Plaid credentials. Server no longer crashes when `PLAID_CLIENT_ID` and `PLAID_SECRET` are missing - instead shows clear error message.
- **Deployment Documentation**: Added comprehensive guide for configuring environment variables in published deployments, especially Plaid credentials.
- **Authentication Migration Complete**: Successfully migrated from JWT-based authentication to Replit Auth (OpenID Connect) with Passport.js sessions
- **User Identification**: All protected routes now use `req.user.claims.sub` (userId) instead of email for user identification
- **Storage Layer Updated**: `updateUserPlan` and `updateUserStripeInfo` now accept userId instead of email
- **New Storage Method**: Added `getUserByStripeCustomerId` for Stripe webhook integration
- **Multi-Tenant Security**: All routes enforce data isolation by filtering on authenticated user's ID
- **Testing**: E2E tests confirm full CRUD functionality for subscriptions with Replit Auth

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
- **Plaid Integration**: Secure bank connectivity via the Plaid API for automatic subscription detection from transaction history.
- **Stripe Integration**: Complete payment processing with Checkout sessions and webhook handling for plan upgrades.
- **Key Features**:
    - Comprehensive subscription lifecycle management (add, edit, delete, cancel) with ownership verification.
    - Visual analytics dashboard.
    - Export and import functionalities (CSV/JSON) gated by plan tier.
    - Webhook system for external integrations gated by plan tier.
    - Email notification preferences for renewal reminders.
    - Audit trail for subscription changes.
    - Three-tier pricing system (Free, Essentials, Pro) with feature gates enforcing per-user limits.

### System Design Choices
The system is built with a clear separation of concerns between client and server. Shared types and schemas are centralized. Authentication includes rate limiting and secure session management. Production readiness features include health monitoring, structured logging, robust error handling, and environment variable validation for security.

## External Dependencies
- **Plaid API**: Used for secure bank account integration, transaction analysis, and automatic subscription detection.
  - Requires `PLAID_CLIENT_ID` and `PLAID_SECRET` environment variables
  - Development uses sandbox environment (test data only)
  - Production requires Plaid production credentials for real bank connections
- **Stripe**: Payment processing for subscription plans with webhook-based plan activation.
  - Requires `STRIPE_SECRET_KEY` environment variable
- **PostgreSQL**: Relational database for all application data storage with proper multi-tenant isolation.
- **SendGrid**: (Configurable) for email delivery of magic links and notifications.
  - Requires `SENDGRID_API_KEY` environment variable (optional)

### Configuring Environment Variables for Published Deployment

When you publish your app, environment variables from development are NOT automatically copied. You must add them manually to your published deployment:

**To add Plaid credentials to your published app:**
1. Go to your Replit project
2. Click on the "Deployments" tab
3. Click on your active deployment
4. Navigate to "Environment variables" or "Secrets"
5. Add the following variables:
   - `PLAID_CLIENT_ID`: Your Plaid client ID
   - `PLAID_SECRET`: Your Plaid secret key
   - `PLAID_ENV`: Set to `sandbox` for testing or `production` for real banks (defaults to `sandbox` if not set)
6. Save and redeploy your application

**Important Notes:**
- For testing: Use Plaid sandbox credentials (these work with test banks only) and set `PLAID_ENV=sandbox`
- For production: You need Plaid production credentials (requires Plaid approval for real bank connections) and set `PLAID_ENV=production`
- The app will run without Plaid credentials but bank connection features will show a configuration error message

## Pricing & Feature Gates
The application implements a three-tier pricing model with strict feature enforcement:

### Free Tier ($0/month)
- 5 active subscriptions maximum
- 0 bank connections
- Basic analytics dashboard
- Cancellation helper
- No data import/export
- No email notifications
- No webhook integrations

### Essentials Tier ($9/month or $84/year)
- 25 active subscriptions maximum
- 1 bank connection
- Full analytics dashboard
- Cancellation helper
- CSV/JSON export and import
- Email notifications
- No webhook integrations
- Most popular tier

### Pro Tier ($19/month or $180/year)
- Unlimited subscriptions
- Unlimited bank connections (up to 5)
- Advanced analytics
- Cancellation helper
- CSV/JSON export and import
- Email notifications
- Webhook integrations
- Priority support

All feature limits are enforced at the API level via middleware that verifies user plan and current usage. Multi-tenant data isolation ensures users can only access their own subscriptions and bank connections.

## Integration Notes
- **Google Calendar**: Integration available via Replit connector (connector:ccfg_google-calendar_DDDBAC03DE404369B74F32E78D) but not currently set up. Can be configured in the future to sync subscription renewal dates to calendar events.