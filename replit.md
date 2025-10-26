# PocketTrack - Subscription Management Tracker

## Overview
PocketTrack is a modern web application designed to help users efficiently track and manage their recurring subscriptions. It provides tools for monitoring spending, visualizing costs by category, and staying informed about upcoming renewals. The project aims to offer a comprehensive solution for personal finance management focused on subscription services.

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
- **Database**: PostgreSQL with Drizzle ORM for persistent data storage.
- **Authentication**: Passwordless magic-link login via email, secured with JWT tokens.
- **Plaid Integration**: Secure bank connectivity via the Plaid API for automatic subscription detection from transaction history.
- **Key Features**:
    - Comprehensive subscription lifecycle management (add, edit, delete, cancel).
    - Visual analytics dashboard.
    - Export and import functionalities (CSV/JSON).
    - Webhook system for external integrations and notification preferences for renewal reminders.
    - Audit trail for subscription changes.

### System Design Choices
The system is built with a clear separation of concerns between client and server. Shared types and schemas are centralized. Authentication includes rate limiting and secure session management. Production readiness features include health monitoring, structured logging, robust error handling, and environment variable validation for security.

## External Dependencies
- **Plaid API**: Used for secure bank account integration, transaction analysis, and automatic subscription detection.
- **PostgreSQL**: Relational database for all application data storage.
- **SendGrid**: (Configurable) for email delivery of magic links and notifications.