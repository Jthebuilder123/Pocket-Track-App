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
    - **Mobile browsers** (Safari, Chrome on iOS/Android): Modal mode with OAuth redirect fallback
    - **Mobile WebView apps** (React Native/Expo TestFlight/App Store): **Native Plaid SDK** via WebView ⇄ React Native message bridge
    - **Desktop WebView apps** (Electron): Modal mode for desktop WebView compatibility
  - **WebView Detection**: Automatically detects WebView environments (window.ReactNativeWebView, window.isReactNativeWebView flag) and distinguishes between mobile browsers and mobile WebViews
  - **Device Context Caching**: Detection results cached on page load for consistency across event handlers
  - **Native Plaid SDK Integration for Mobile Apps** (Updated: Nov 3, 2025):
    - **Architecture**: WebView ⇄ React Native message bridge using `postMessage` API
    - **Flow**:
      1. User clicks "Connect Bank" in WebView
      2. WebView fetches link token from backend (authenticated with session cookies)
      3. WebView sends `PLAID_LINK_TOKEN` message to React Native via `window.ReactNativeWebView.postMessage()`
      4. React Native opens native Plaid Link SDK (`react-native-plaid-link-sdk`)
      5. User completes authentication in native iOS/Android Plaid UI
      6. React Native receives `public_token` from Plaid SDK
      7. React Native sends `PLAID_SUCCESS` message back to WebView
      8. WebView exchanges token with backend and reloads to show new bank connection
    - **Message Contract**:
      - WebView → React Native: `{type: 'PLAID_LINK_TOKEN', linkToken: string}`
      - React Native → WebView: `{type: 'PLAID_SUCCESS', publicToken: string, metadata: object}`
      - React Native → WebView: `{type: 'PLAID_EXIT'}` (user cancelled)
      - React Native → WebView: `{type: 'PLAID_ERROR', error: string}`
    - **Benefits**: No popup blocking, proper native UI, better UX, no OAuth redirect complexity
    - **Files**: `client/index.html` (WebView message handling), `mobile-app-native-plaid/App.js` (React Native bridge)
  - **Production Requirements**: 
    - No redirect URIs needed for native SDK integration
    - Backend must be accessible from mobile app for link token creation and token exchange
    - React Native app must have `react-native-plaid-link-sdk` installed and configured
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

## iOS App Store Compliance (Updated: Nov 12, 2025)
PocketTrack implements comprehensive iOS App Store compliance across three critical guidelines:

### Guideline 3.1.1 - In-App Purchase
- **Implementation**: Platform detection identifies iOS WebView users and hides Stripe checkout
- **User Experience**: iOS users see "Contact Support" message instead of upgrade buttons on pricing page
- **Rationale**: Complies with Apple's requirement that digital subscriptions use Apple's In-App Purchase system
- **Files**: `client/src/lib/platform.ts` (detection), `client/src/pages/pricing.tsx` (conditional rendering)

### Guideline 4.0 - Sign in with Apple & In-App Browsing
- **Implementation**: 
  - Replit Auth stays in WebView via domain whitelisting (replit.com, .replit.app)
  - External links open in in-app browser (SafariViewController on iOS, Custom Tabs on Android) instead of Safari
  - Uses expo-web-browser for seamless in-app browsing experience
- **User Experience**: 
  - All authentication (Google, GitHub, Apple, Email/Password) flows complete within the app
  - External links (privacy policies, cancellation pages) open in-app with "Done" button to return
  - Users never leave the PocketTrack app
- **Smart Caching**: First launch ~10s, subsequent launches ~2-3s (5x improvement)
  - Resources (JS, CSS, images) cached
  - HTML cache-busted with ?v=timestamp for auth freshness
- **In-App Browser Triggers**:
  - Privacy policy links (Plaid, Stripe, Replit)
  - Subscription cancellation assistance pages (Netflix, Spotify, etc.)
  - Stripe checkout pages
  - Bank OAuth flows
  - Any external http/https links not in the allowlist
- **Stays in WebView** (Critical for functionality):
  - PocketTrack main app (*.replit.app)
  - Replit Auth (auth.replit.com, id.replit.com)
  - Plaid SDK (*.plaid.com)
  - Fonts and CDNs (fonts.googleapis.com, fonts.gstatic.com)
- **Benefits**: Apple compliance, no external browser redirects, maintains session state, better UX
- **Files**: `mobile-app-native-plaid/App.js` (WebView config + in-app browser), `client/index.html` (caching strategy)

### Guideline 5.1.1v - Account Deletion
- **Implementation**: Comprehensive DELETE /api/account endpoint with Settings page UI
- **Data Deletion Order**:
  1. Subscription history (audit trail) - deleted first using subscriptionId references
  2. Subscriptions - deleted after history
  3. Bank connections - via Plaid, includes all transaction data
  4. Detected subscriptions - from bank import analysis
  5. Notification preferences - email/push settings
  6. Stripe subscription - external service, best-effort cancellation (continues on failure)
  7. User record - LAST, with error checking to prevent orphaned data
  8. Session logout - destroys session and redirects to login
- **Error Handling**: All database operations must succeed or entire deletion aborts with 500 error
- **User Experience**: Settings page with clear "Danger Zone" section listing all data to be deleted
- **Confirmation Dialog**: Shows comprehensive list of what will be permanently removed
- **Webhooks**: Intentionally NOT deleted (global, no userId column)
- **Testing**: E2E test validates complete data removal and session invalidation
- **Files**: `server/routes.ts` (DELETE /api/account), `client/src/pages/settings.tsx` (UI)

### App Store Submission Checklist
- [x] Platform detection (iOS WebView identification)
- [x] Stripe checkout hidden on iOS
- [x] In-WebView authentication (no external browser)
- [x] In-app browser for external links (privacy policies, cancellation pages)
- [x] Smart caching for fast subsequent launches
- [x] Account deletion in Settings
- [x] Comprehensive data removal (subscriptions, history, bank data, preferences)
- [x] Error-free deletion flow (tested end-to-end)
- [ ] Test in-app browser: privacy policy links open in SafariViewController/Custom Tabs
- [ ] Test in-app browser: cancellation assistance links stay in-app
- [ ] Real screenshots from production build (currently AI-generated placeholders)
- [ ] TestFlight beta testing
- [ ] Final App Store submission with real device screenshots