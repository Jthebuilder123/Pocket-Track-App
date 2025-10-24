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

## Project Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript, Wouter for routing
- **UI Components**: Shadcn UI with Tailwind CSS
- **Charts**: Recharts for data visualization
- **Backend**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage)
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

### Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/                    # Shadcn UI components
│   │   ├── dashboard-page.tsx     # Main dashboard page
│   │   ├── subscription-card.tsx  # Individual subscription display
│   │   ├── subscription-modal.tsx # Add/Edit subscription form
│   │   ├── spending-charts.tsx    # Data visualization charts
│   │   └── upcoming-renewals.tsx  # Upcoming renewal timeline
│   ├── pages/
│   │   └── not-found.tsx          # 404 page
│   ├── lib/
│   │   └── queryClient.ts         # React Query setup
│   ├── App.tsx                    # Main app component
│   └── index.css                  # Global styles
├── index.html                     # HTML entry point
shared/
└── schema.ts                      # Shared TypeScript types and Zod schemas
server/
├── routes.ts                      # API routes
└── storage.ts                     # Storage interface and implementation
```

### API Endpoints
All endpoints prefixed with `/api`:
- `GET /api/subscriptions` - Get all subscriptions
- `POST /api/subscriptions` - Create new subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription
- `POST /api/subscriptions/:id/cancel` - Cancel subscription with optional reason
- `GET /api/subscriptions/:id/history` - Get subscription history

### Design System
- **Primary Color**: Blue (hsl(220, 90%, 56%))
- **Font**: Inter for UI, system fonts for fallback
- **Spacing**: Consistent 6-unit padding for cards, 4-unit gaps for lists
- **Components**: Shadcn UI with custom theming
- **Interactions**: Hover elevations, smooth transitions

### Key User Flows
1. **Add Subscription**: Click "Add Subscription" → Fill form → Save
2. **Edit Subscription**: Click "Edit" on card → Modify → Update
3. **Delete Subscription**: Click "Delete" → Confirm → Remove
4. **Filter Subscriptions**: Use search bar or category/billing filters
5. **View Analytics**: Dashboard shows charts and upcoming renewals automatically

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

## Development
- **Start**: Run `npm run dev` (automatically configured)
- **Storage**: Uses in-memory storage for fast prototyping
- **Styling**: Tailwind CSS with design tokens in index.css

## User Preferences
- Clean, modern SaaS dashboard aesthetic
- Linear + Notion inspired design
- Focus on clarity and information density
- Smooth, purposeful interactions
