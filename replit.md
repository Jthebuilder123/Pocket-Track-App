# PocketTrack - Subscription Management Tracker

## Overview
PocketTrack is a modern web application designed to help users efficiently track and manage their recurring subscriptions across web and native mobile platforms. It provides tools for monitoring spending, visualizing costs by category, and staying informed about upcoming renewals. The project aims to offer a comprehensive solution for personal finance management focused on subscription services. It is available as a Progressive Web App (PWA) and native iOS/Android applications.

## Plan-Tier Enforcement (Updated: Nov 2, 2025)
PocketTrack enforces feature restrictions based on subscription tier (Free/Essentials/Pro) with both server-side and client-side validation:

### Server-Side Enforcement
- **Webhooks**: All webhook routes (GET, POST, PUT, DELETE) require authentication and Pro plan via `requireFeature("webhooks")` middleware
- **Bank Connections**: Link token creation (GET /api/create_link_token) and token exchange (POST /api/exchange_public_token) check bank connection limits via `checkBankConnectionLimit` middleware (Free: 1, Essentials: 3, Pro: unlimited)
- **Subscriptions**: POST routes check subscription limits via `checkSubscriptionLimit` middleware (Free: 10, Essentials: 25, Pro: unlimited)
- **Returns HTTP 403** with clear upgrade message when limits exceeded

### Client-Side Enforcement
- **Export Features**: CSV/JSON export blocked for Free users, shows upgrade prompt with action button
- **Bank Connect**: When limit is reached and user clicks "Connect Bank", shows confirm dialog with upgrade message before Plaid opens
- **Add Subscription**: Blocked when limit reached, shows upgrade toast
- **Visual Indicators**: Lock icons, Crown badges, and disabled states show locked features
- **Upgrade Prompts**: All restricted actions show actionable upgrade buttons/links to /pricing

## User Preferences
- Clean, modern SaaS dashboard aesthetic
- Linear + Notion inspired design
- Focus on clarity and information density
- Smooth, purposeful interactions

## System Architecture

### Repository Structure
PocketTrack uses a two-repository architecture: a main web application (Express backend + React frontend) deployed as a web application, and a separate mobile app wrapper (Expo/React Native WebView) that loads the hosted web app in a native container for iOS and Android distribution.

### UI/UX Decisions
The application features a responsive design built with React and Shadcn UI, styled using Tailwind CSS. It utilizes Recharts for data visualization, presenting spending analytics by category, billing frequency, and a timeline view for upcoming renewals. The design emphasizes clarity, information density, and smooth interactions, inspired by modern SaaS dashboards.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, and React Hook Form with Zod for form handling.
- **Backend**: Express.js with TypeScript, providing a robust API.
- **Database**: PostgreSQL with Drizzle ORM for persistent data storage with multi-tenant data isolation.
- **Authentication**: Replit Auth (OpenID Connect) via Passport.js with session management, supporting Google, GitHub, X, Apple, and email/password login.
- **Key Features**:
    - Comprehensive subscription lifecycle management (add, edit, delete, cancel).
    - Cancellation Assistance: Provides help resources for canceling subscriptions.
    - Visual analytics dashboard.
    - Export and import functionalities (CSV/JSON) gated by plan tier.
    - Bank Statement Import: Automatically detects recurring transactions from uploaded bank statements (PDF/CSV/Excel) to suggest subscriptions.
    - Plaid Bank Integration: Direct bank account connectivity for automatic transaction syncing, intelligent recurring subscription detection with confidence scoring, and one-click confirmation for user approval.
    - Webhook system for external integrations, gated by plan tier.
    - Email Notifications: Payment confirmations and magic links via SendGrid.
    - Audit trail for subscription changes.
    - Three-tier pricing system (Free, Essentials, Pro) with feature gates.
    - Auto-sync Feature Flag: Premium (Pro) plan includes `autoSyncEnabled` flag.
- **PWA**: Progressive Web App with offline support, installability, and standalone mode.
- **Native Mobile Apps**: Wrapped as native iOS and Android applications using Expo/React Native (WebView wrapper) for app store distribution.

### System Design Choices
The system features a clear separation of concerns, centralized shared types and schemas, and robust authentication with rate limiting and secure session management. Production readiness includes health monitoring, structured logging, error handling, and environment variable validation.

## External Dependencies
- **Plaid API**: Production-ready bank account integration for secure transaction access and automatic subscription detection.
  - **Multi-Device Support**: Plaid Link adapts to different environments:
    - **Desktop browsers**: Modal/iframe mode for seamless in-page experience
    - **Mobile browsers** (Safari, Chrome on iOS/Android): OAuth redirect mode for native browser authentication
    - **Mobile WebView apps** (React Native, Cordova, Capacitor, Expo on iOS/Android): **Hosted Link** with native browser authentication for proper WebView compatibility
    - **Desktop WebView apps** (Electron): Modal mode for desktop WebView compatibility
  - **WebView Detection**: Automatically detects WebView environments (window.ReactNativeWebView, window.cordova, window.Capacitor, iOS/Android in-app browsers) and distinguishes between mobile and desktop WebViews
  - **Device Context Caching**: Detection results cached on page load for consistency across event handlers
  - **Hosted Link for TestFlight/Mobile Apps**:
    - Uses Plaid's recommended Hosted Link for WebView apps (opens in iOS ASWebAuthenticationSession or Android Custom Tabs)
    - Server-side callback storage system to overcome storage isolation between native browser and WebView
    - Backend stores callback results in-memory Map keyed by user ID
    - WebView polls `/api/plaid/callback-result` endpoint when regaining focus after native browser closes
    - Callback page at `/plaid/callback` handles OAuth completion and stores result server-side
    - Multiple trigger points: immediate execution, window load, visibilitychange, and focus events
    - Duplicate-processing guard to prevent race conditions
  - **Production Requirements**: 
    - For production (`PLAID_ENV=production`), redirect URIs must be registered in Plaid Dashboard under Settings → API → Allowed redirect URIs
    - For sandbox (`PLAID_ENV=sandbox`), any redirect URI can be used dynamically for testing
    - Mobile OAuth flow requires `redirect_uri` parameter in link token creation with `hosted_link.is_mobile_app = true`
    - Completion redirect URI: `https://your-app-url.replit.app/plaid/callback`
- **Stripe**: Payment processing for subscription plans with webhook-based plan activation.
  - **Webhook Setup Required**: For production deployment, configure Stripe webhooks to point to your deployed app's webhook endpoint: `https://your-app-url.replit.app/api/webhooks/stripe`
  - **Required Events**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - **Webhook Secret**: Set `STRIPE_WEBHOOK_SECRET` environment variable with the signing secret from Stripe Dashboard
  - **Manual Sync**: Users can manually sync their plan using the "Refresh Plan" button on the pricing page if webhook delivery fails
- **PostgreSQL**: Relational database for all application data storage with multi-tenant isolation.
- **SendGrid**: (Configurable) for email delivery of magic links and notifications.

## Stripe Webhook Configuration

### Production Setup
To enable automatic plan updates after payment, configure Stripe webhooks:

1. **Add Webhook Endpoint**:
   - Navigate to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Enter URL: `https://your-deployed-app.replit.app/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

2. **Configure Signing Secret**:
   - After creating the endpoint, copy the "Signing secret"
   - Add to environment secrets: `STRIPE_WEBHOOK_SECRET=whsec_...`

3. **Verify Webhook Delivery**:
   - Complete a test payment
   - Check Stripe Dashboard → Webhooks → Recent deliveries
   - Check application logs for `[STRIPE WEBHOOK]` entries

4. **Troubleshooting**:
   - If webhooks fail, users can manually sync their plan using the "Refresh Plan" button on `/pricing`
   - Check logs with prefix `[STRIPE WEBHOOK]` for detailed webhook processing information
   - Verify webhook URL is publicly accessible and returns 200 OK

### Development Mode
In development without `STRIPE_WEBHOOK_SECRET`, webhooks process without signature verification. This is useful for local testing with Stripe CLI:
```bash
stripe listen --forward-to http://localhost:5000/api/webhooks/stripe
```