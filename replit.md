# PocketTrack - Subscription Management Tracker

## Overview
PocketTrack is a modern web application designed to help users efficiently track and manage their recurring subscriptions across web and native mobile platforms. It provides tools for monitoring spending, visualizing costs by category, and staying informed about upcoming renewals. The project aims to offer a comprehensive solution for personal finance management focused on subscription services. It is available as a Progressive Web App (PWA) and native iOS/Android applications.

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
- **Stripe**: Payment processing for subscription plans with webhook-based plan activation.
- **PostgreSQL**: Relational database for all application data storage with multi-tenant isolation.
- **SendGrid**: (Configurable) for email delivery of magic links and notifications.