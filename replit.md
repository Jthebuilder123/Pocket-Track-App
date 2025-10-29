# PocketTrack - Subscription Management Tracker

## Overview
PocketTrack is a modern web application designed to help users efficiently track and manage their recurring subscriptions. It provides tools for monitoring spending, visualizing costs by category, and staying informed about upcoming renewals. The project aims to offer a comprehensive solution for personal finance management focused on subscription services. It is available as a Progressive Web App (PWA) and native iOS/Android applications.

## User Preferences
- Clean, modern SaaS dashboard aesthetic
- Linear + Notion inspired design
- Focus on clarity and information density
- Smooth, purposeful interactions

## System Architecture

### Repository Structure
PocketTrack uses a **two-repository architecture**:

1. **Main Web Application** (this repository):
   - Express backend + React frontend
   - Deployed as a web application (e.g., Replit deployment)
   - Accessed via browser at your deployment URL
   - Serves as the primary application for all platforms

2. **Mobile App Wrapper** (`pockettrack-mobile/` directory → separate repository):
   - Expo/React Native WebView wrapper
   - Loads the hosted web app in a native container
   - Handles external links (Plaid, Stripe) by opening in system browser
   - Built and submitted to App Store/Google Play using EAS Build
   - Bundle ID: `com.pockettrack.app`
   - **Setup**: Copy the `pockettrack-mobile/` directory to a new GitHub repository, update `POCKETTRACK_URL` to your deployed web app URL, then follow the instructions in `pockettrack-mobile/GITHUB-SETUP.md`

This separation keeps the web application clean while providing native mobile distribution through app stores.

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
    - Webhook system for external integrations gated by plan tier.
    - **Email Notifications**: 
        - Payment confirmation emails sent via SendGrid when users subscribe to paid plans through Stripe checkout
        - Magic link authentication emails for email/password login
        - Configurable with `SENDGRID_API_KEY` environment variable (falls back to console logging in dev)
        - Email system uses non-throwing sendEmail() function that returns boolean for webhook safety
    - Audit trail for subscription changes.
    - Three-tier pricing system (Free, Essentials, Pro) with feature gates enforcing per-user limits.
    - **Auto-sync Feature Flag**: Premium (Pro) plan includes `autoSyncEnabled` flag for future automatic bank transaction syncing capability.
- **PWA**: Converted to a Progressive Web App with offline support, installability, and standalone mode using a web app manifest and service worker.
- **Native Mobile Apps**: Wrapped as native iOS and Android applications using Expo/React Native (WebView wrapper), enabling app store distribution with EAS Build for automated submission to App Store and Google Play.

### System Design Choices
The system is built with a clear separation of concerns between client and server. Shared types and schemas are centralized. Authentication includes rate limiting and secure session management. Production readiness features include health monitoring, structured logging, robust error handling, and environment variable validation for security.

### Recent Fixes (October 2025)
- **Payment Plan Update Bug Fix**: Resolved issue where users' paid plans displayed as "Free" after successful Stripe checkout. The root cause was a query key mismatch in the cache invalidation logic - the pricing page was invalidating `["/api/auth/me"]` but the `useAuth` hook uses `["/api/auth/user"]`. Fixed by updating the pricing page to invalidate the correct query key, ensuring user plan updates are reflected immediately without requiring a page refresh.
- **Enhanced Webhook Logging**: Added comprehensive logging to Stripe webhook handler and database update functions to track payment processing, plan updates, and identify issues in production. Logging includes userId, planId, customer IDs, and detailed error messages for debugging.
- **Template Duplication Cache Fix**: Resolved stale cache issue where users saw duplicate subscription templates. Root cause was `staleTime: Infinity` in TanStack Query configuration, which prevented cache invalidation. Fixed by changing global `staleTime` to 5 minutes (300,000ms), allowing periodic refetches while maintaining performance. Users with existing stale cache should perform a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to clear browser cache.
- **Stripe Webhook Configuration Fix**: Resolved critical issue where Stripe webhooks were not configured, preventing automatic plan updates after successful payments. Root cause: No webhook endpoint was registered in Stripe and `STRIPE_WEBHOOK_SECRET` was missing from environment variables. Fixed by creating webhook endpoint in Stripe (`we_1SNAbUAMur6yUaCVTzYi9gHN`) and configuring the webhook secret. All future payments will now automatically update user plans in the database via secure webhook notifications.
- **Health Check Routing Fix** (October 28, 2025): Moved health check from `/` route to dedicated `/health` endpoint. The root cause was the health check handler interfering with SPA routing - when navigating from `/pricing` back to `/`, browsers received "OK" text instead of the HTML app. This is now resolved, with `/health` available for infrastructure monitoring without impacting user navigation.
- **Guest Deletion 401 Error Fix** (October 28, 2025): Implemented guest-aware deletion with localStorage fallback in the `useDeleteSubscription` hook. Previously, the subscription card component bypassed the guest-aware hook and directly called the API, causing 401 errors for guest users. The fix centralizes deletion logic with automatic fallback to localStorage when receiving 401 responses, preventing error loops during auth state transitions.
- **ApiError Class Implementation** (October 28, 2025): Created custom `ApiError` class extending Error with a `status` property for robust, type-safe error handling throughout the application. Replaced fragile string-based error message parsing (`error.message.includes("401")`) with proper instanceof checks (`error instanceof ApiError && error.status === 401`), making error handling more maintainable and resistant to future API response changes.
- **Debug Logging Cleanup** (October 28, 2025): Gated all ungated debug console.logs in bank connection component with `DEBUG_BANK_CONNECT` flag (set to `import.meta.env.DEV`), ensuring verbose logging only appears in development mode and is automatically disabled in production builds.

### Beta Tester Feedback Improvements (October 29, 2025)
Implemented comprehensive UX enhancements based on beta tester feedback to improve navigation, visual clarity, and feature understanding:

- **Clickable Logo Navigation**: The PocketTrack logo in the header is now clickable and navigates users back to the homepage/dashboard. Includes hover and active states for better interactivity.
- **Enhanced Post-Purchase Experience**: After successful Stripe checkout, users see a prominent success banner on the pricing page displaying:
  - Welcome message with their new plan name
  - Bulleted list of all unlocked features for their tier
  - "Go to Dashboard" button for immediate access to the app
  - Prevents users from being stuck on the pricing page after upgrading
- **Visual Plan Differentiation**: 
  - Current plan badge displayed in header next to user email (Free/Essentials/Pro)
  - Badge styling varies by plan tier (outline for Free, secondary for Essentials, primary for Pro)
  - Provides constant visual reminder of active subscription level
- **Webhook Feature Explanations**: Added contextual help tooltip on the pricing page explaining webhooks in non-technical language:
  - Simple explanation: "Webhooks automatically notify your other apps when something happens in PocketTrack"
  - Real-world example: Sending notifications to spreadsheets or budgeting apps
  - Target audience clarification: "Perfect for developers and power users"
  - Reduces confusion about this Pro-tier feature
- **Template Tier-Level Pricing**: Expanded subscription templates to include service-specific pricing tiers:
  - **Streaming Services**: Netflix (Standard with ads $6.99, Standard $15.49, Premium $22.99), Disney+ (Basic with ads $7.99, Premium $13.99), Max (With Ads $9.99, Ad-Free $15.99, Ultimate $19.99), Hulu (With Ads $7.99, No Ads $17.99)
  - **Music Services**: Spotify (Individual $10.99, Duo $14.99, Family $16.99), Apple Music (Individual $10.99, Family $16.99), YouTube Music (Individual $10.99, Family $16.99)
  - Users can now select the exact tier they're subscribed to instead of average pricing
  - Improves template accuracy and user experience
- **Auto-Add PocketTrack Subscription**: When users subscribe to Essentials or Pro plans via Stripe checkout:
  - System automatically creates a "PocketTrack [Plan Name]" subscription in their account
  - Subscription includes correct monthly price based on plan tier
  - Next renewal date set to one month from purchase
  - Idempotent implementation prevents duplicate entries
  - Non-critical failure handling ensures webhook processing continues even if auto-add fails
  - Helps users immediately see their PocketTrack subscription tracked within the app itself

These improvements address the main pain points identified in beta testing: navigation confusion after purchase, unclear plan benefits, webhook feature confusion, and template pricing accuracy.

## External Dependencies
- **Plaid API**: Used for secure bank account integration, transaction analysis, and automatic subscription detection. Requires `PLAID_CLIENT_ID` and `PLAID_SECRET`.
- **Stripe**: Payment processing for subscription plans with webhook-based plan activation. Requires `STRIPE_SECRET_KEY`. Pricing is defined dynamically in `shared/pricing.ts`.
- **PostgreSQL**: Relational database for all application data storage with proper multi-tenant isolation.
- **SendGrid**: (Configurable) for email delivery of magic links and notifications. Requires `SENDGRID_API_KEY`.