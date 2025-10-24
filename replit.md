# SubTracker - Subscription Management Tracker

## Overview
SubTracker is a modern web application for tracking and managing recurring subscriptions. It helps users monitor their subscription spending, visualize costs by category, and stay on top of upcoming renewals.

## Features
- **Dashboard**: Overview of all subscriptions with monthly/annual totals
- **Subscription Management**: Add, edit, and delete subscriptions
- **Visual Analytics**: Charts showing spending by category and billing frequency
- **Upcoming Renewals**: Timeline view of subscriptions due for renewal
- **Filtering & Sorting**: Search and filter subscriptions by category, billing cycle, or renewal date
- **Responsive Design**: Beautiful UI that works on desktop, tablet, and mobile
- **Database Persistence**: PostgreSQL storage for data persistence across sessions
- **History Tracking**: Complete audit trail of subscription changes
- **Cancellation**: Cancel subscriptions with optional reasons
- **Data Export**: Export subscriptions to CSV or JSON formats
- **Bank Integration**: Connect bank accounts via Plaid to automatically detect subscriptions
- **Auto-Detection**: Smart algorithm identifies recurring charges from transaction history
- **Detection Review**: Review and confirm detected subscriptions before adding to your list

## Project Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript, Wouter for routing
- **UI Components**: Shadcn UI with Tailwind CSS
- **Charts**: Recharts for data visualization
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Bank Integration**: Plaid API for secure bank connectivity
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation

### Data Model
**Subscription Entity**:
- `id`: Unique identifier (UUID)
- `name`: Subscription service name
- `cost`: Subscription cost (decimal)
- `billingCycle`: "Monthly", "Quarterly", or "Yearly"
- `category`: Category (Streaming, Software, Cloud Storage, etc.)
- `nextRenewalDate`: Next renewal date (timestamp)
- `notes`: Optional notes
- `status`: "active" or "cancelled"
- `cancelledAt`, `cancellationReason`: Cancellation tracking

**Bank Connection Entity**:
- `id`: Unique identifier
- `accessToken`: Encrypted Plaid access token
- `itemId`: Plaid item identifier
- `institutionName`: Bank/financial institution name
- `lastSyncedAt`: Last transaction sync timestamp

**Detected Subscription Entity**:
- `id`: Unique identifier
- `merchantName`: Detected merchant name
- `estimatedCost`: Calculated average cost
- `detectedBillingCycle`: Identified billing frequency
- `category`: Auto-categorized type
- `transactionIds`: List of matching transaction IDs
- `confidence`: Detection confidence score (50-99%)
- `status`: "pending" or "confirmed"

### Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/                       # Shadcn UI components
│   │   ├── dashboard-page.tsx        # Main dashboard with tabs
│   │   ├── subscription-card.tsx     # Individual subscription display
│   │   ├── subscription-modal.tsx    # Add/Edit subscription form
│   │   ├── spending-charts.tsx       # Data visualization charts
│   │   ├── upcoming-renewals.tsx     # Upcoming renewal timeline
│   │   ├── bank-connect.tsx          # Plaid bank connection UI
│   │   └── detected-subscriptions.tsx # Auto-detected subscriptions review
│   ├── pages/
│   │   └── not-found.tsx             # 404 page
│   ├── lib/
│   │   └── queryClient.ts            # React Query setup
│   ├── App.tsx                       # Main app component
│   └── index.css                     # Global styles
├── index.html                        # HTML entry point
shared/
└── schema.ts                         # Shared types, Zod schemas, Drizzle tables
server/
├── routes.ts                         # API routes (subscriptions + Plaid)
├── storage.ts                        # Storage interface and database operations
├── plaid.ts                          # Plaid API client configuration
└── db.ts                             # Database connection
```

### API Endpoints
All endpoints prefixed with `/api`:

**Subscription Endpoints**:
- `GET /api/subscriptions` - Get all subscriptions
- `POST /api/subscriptions` - Create new subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription
- `POST /api/subscriptions/:id/cancel` - Cancel subscription with optional reason
- `GET /api/subscriptions/:id/history` - Get subscription history

**Plaid Integration Endpoints**:
- `POST /api/plaid/create-link-token` - Generate Plaid Link token for bank connection
- `POST /api/plaid/exchange-token` - Exchange public token for access token
- `GET /api/plaid/connections` - Get all connected bank accounts
- `POST /api/plaid/sync-transactions/:id` - Sync and analyze transactions from bank
- `DELETE /api/plaid/disconnect/:id` - Disconnect bank account
- `GET /api/plaid/detected-subscriptions` - Get pending detected subscriptions
- `GET /api/plaid/detected-subscriptions/:id` - Get single detected subscription
- `POST /api/plaid/detected-subscriptions/:id/confirm` - Confirm and convert to subscription
- `DELETE /api/plaid/detected-subscriptions/:id` - Dismiss detected subscription

### Design System
- **Primary Color**: Blue (hsl(220, 90%, 56%))
- **Font**: Inter for UI, system fonts for fallback
- **Spacing**: Consistent 6-unit padding for cards, 4-unit gaps for lists
- **Components**: Shadcn UI with custom theming
- **Interactions**: Hover elevations, smooth transitions

### Key User Flows
1. **Add Subscription Manually**: Click "Add Subscription" → Fill form → Save
2. **Edit Subscription**: Click "Edit" on card → Modify → Update
3. **Delete Subscription**: Click "Delete" → Confirm → Remove
4. **Cancel Subscription**: Click "Cancel" → Add reason (optional) → Confirm
5. **View History**: Click "History" → See complete audit trail of changes
6. **Export Data**: Click "Export" → Choose CSV or JSON → Download file
7. **Filter Subscriptions**: Use search bar or category/billing filters
8. **View Analytics**: Dashboard shows charts and upcoming renewals automatically
9. **Connect Bank**: Navigate to "Bank Connections" tab → Click "Connect Bank" → Select institution via Plaid Link
10. **Sync Transactions**: Click "Sync Transactions" on connected bank → System analyzes last 90 days
11. **Review Detected**: Navigate to "Detected" tab → Review auto-detected subscriptions with confidence scores
12. **Confirm Detection**: Click "Confirm & Add" to add detected subscription, or "Edit Before Adding" to modify details first

## Recent Changes
- **2025-10-24**: Complete implementation of subscription management tracker
  - Created data models for subscriptions with Zod validation
  - Built all React components with Shadcn UI following design guidelines
  - Implemented responsive dashboard layout with stats cards
  - Added Recharts-based charts for spending visualization
  - Created upcoming renewals timeline with time period grouping
  - Implemented complete backend API with CRUD operations
  - Added date preprocessing for seamless frontend-backend integration
  - Fixed form dependency issues for proper edit flow
  - Comprehensive end-to-end testing completed successfully
  - All TypeScript errors resolved
  - **Database Persistence**: Migrated from in-memory to PostgreSQL storage
  - **Subscription History & Cancellation**: Added status tracking, cancellation workflow with reasons, and complete audit history for all subscription changes
  - **Plaid Bank Integration**: Integrated Plaid API for secure bank account connectivity
    - Extended database schema with bank_connections and detected_subscriptions tables
    - Built backend Plaid integration (link token, token exchange, transaction sync)
    - Implemented subscription detection algorithm analyzing recurring charges
    - Created BankConnect component with react-plaid-link for connection UI
    - Created DetectedSubscriptions component for reviewing auto-detected subscriptions
    - Added tabbed interface to dashboard: "My Subscriptions", "Detected", "Bank Connections"
    - Detection features: confidence scoring, merchant categorization, billing cycle identification

## Development
- **Start**: Run `npm run dev` (automatically configured)
- **Storage**: PostgreSQL database via Drizzle ORM
- **Styling**: Tailwind CSS with design tokens in index.css
- **Database**: `npm run db:push` to sync schema changes

## User Preferences
- Clean, modern SaaS dashboard aesthetic
- Linear + Notion inspired design
- Focus on clarity and information density
- Smooth, purposeful interactions
