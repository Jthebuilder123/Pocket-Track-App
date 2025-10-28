# PocketTrack - Subscription Management Tracker

A modern web and mobile application for tracking and managing recurring subscriptions with automatic bank integration, visual analytics, and intelligent renewal reminders.

## Overview

PocketTrack helps users take control of their subscription spending with:
- 📊 Visual analytics dashboard with spending insights by category
- 🏦 Automatic subscription detection via Plaid bank integration
- 📱 Progressive Web App (PWA) with offline support
- 📲 Native iOS and Android apps via Capacitor
- 💳 Tiered pricing with Stripe payment processing
- 📧 Email notifications for renewals and plan updates
- 📤 Import/Export subscriptions (CSV, JSON, Excel)
- 🔔 Cancellation assistance with step-by-step guides

## Features by Plan

### Free Plan
- Track up to 10 subscriptions
- Basic analytics dashboard
- Manual subscription entry
- Renewal reminders

### Essentials Plan ($4.99/month)
- Unlimited subscriptions
- Bank statement import (PDF, CSV, Excel)
- Export data (CSV, JSON)
- Priority email support

### Pro Plan ($9.99/month)
- Everything in Essentials
- Plaid bank integration for auto-sync
- Webhook API access
- Advanced analytics
- Custom categories

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for client-side routing
- **TanStack Query** for state management
- **React Hook Form + Zod** for form validation
- **Shadcn UI + Tailwind CSS** for styling
- **Recharts** for data visualization

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database with Drizzle ORM
- **Passport.js** for authentication (Replit Auth/OIDC)
- **Stripe** for payment processing
- **Plaid** for bank integration
- **SendGrid** for email notifications

### Mobile
- **Capacitor** for native iOS/Android apps
- App ID: `app.pockettrack.mobile`

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Apple Developer Account (for iOS builds)
- Google Play Developer Account (for Android builds)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication (Replit Auth/OIDC)
ISSUER_URL=your_oidc_issuer_url
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
SESSION_SECRET=your_session_secret

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_xxx
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Plaid Bank Integration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox # or development, production

# Email Notifications (Optional)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@pockettrack.app

# App Configuration
NODE_ENV=development
PORT=5000
```

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/pockettrack.git
   cd pockettrack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   ```bash
   npm run db:push
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5000`

## Building for Production

### Web Application

```bash
# Build the web app
npm run build

# Start production server
npm start
```

### iOS App

1. **Update production URL in `capacitor.config.ts`:**
   ```typescript
   server: {
     url: 'https://your-production-domain.com'
   }
   ```

2. **Build and sync to iOS:**
   ```bash
   npm run build
   npx cap sync ios
   ```

3. **Open in Xcode:**
   ```bash
   npx cap open ios
   ```
   
   Or manually open `ios/App/App.xcworkspace` in Xcode

4. **Configure signing & capabilities:**
   - Select your team in Signing & Capabilities
   - Ensure Bundle Identifier is `app.pockettrack.mobile`
   - Add necessary capabilities (if required)

5. **Build and archive:**
   - Product → Archive
   - Follow App Store submission process

### Android App

1. **Build and sync to Android:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

3. **Configure signing:**
   - Build → Generate Signed Bundle/APK
   - Follow Google Play submission process

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User accounts with authentication and plan information
- **subscriptions** - Subscription tracking with renewal dates, costs, and categories
- **audit_logs** - Change history for subscriptions
- **webhooks** - Webhook configurations for Pro plan users
- **plaid_items** - Bank account connections via Plaid

See `shared/schema.ts` for complete schema definitions.

## API Endpoints

### Authentication
- `GET /api/auth/login` - Initiate OIDC login
- `GET /api/auth/callback` - OIDC callback handler
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - Logout

### Subscriptions
- `GET /api/subscriptions` - List all subscriptions
- `POST /api/subscriptions` - Create subscription
- `PATCH /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription
- `POST /api/subscriptions/:id/cancel` - Mark as cancelled

### Analytics
- `GET /api/analytics/summary` - Get spending summary
- `GET /api/analytics/category` - Category breakdown
- `GET /api/analytics/timeline` - Upcoming renewals

### Import/Export
- `POST /api/subscriptions/export` - Export data (CSV/JSON)
- `POST /api/subscriptions/import/analyze` - Analyze import file
- `POST /api/subscriptions/import/confirm` - Confirm import

### Plaid Integration (Pro Plan)
- `POST /api/plaid/link-token` - Create Plaid Link token
- `POST /api/plaid/exchange-token` - Exchange public token
- `GET /api/plaid/accounts` - List connected accounts
- `POST /api/plaid/sync` - Sync transactions

### Payments
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Security Notes

- Never commit `.env` files or secrets to Git
- Use Replit Secrets or environment variables for sensitive data
- All API keys are stored securely and never exposed to the client
- Webhook endpoints use signature verification
- Rate limiting is enabled on authentication endpoints
- Sessions are stored securely in PostgreSQL with encrypted cookies

## PWA Features

- Offline support with service worker
- Installable on mobile and desktop
- Standalone app mode
- App manifest with icons and theme colors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
- Create an issue on GitHub
- Contact support at support@pockettrack.app

## Roadmap

- [ ] Automated renewal reminders via email/SMS
- [ ] Subscription sharing with family members
- [ ] Bill negotiation assistance
- [ ] Integration with more financial institutions
- [ ] Receipt scanning and storage
- [ ] Budget forecasting and recommendations
