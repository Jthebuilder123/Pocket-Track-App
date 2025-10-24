# Subscription Management Tracker - Design Guidelines

## Design Approach: Modern SaaS Dashboard System

**Selected Reference:** Linear + Notion hybrid approach
**Rationale:** Combines Linear's clean data presentation with Notion's intuitive information organization for a productivity-focused subscription tracker.

**Core Principles:**
- Clarity over decoration - every element serves a purpose
- Information density without clutter
- Scannable hierarchy for quick decision-making
- Smooth, purposeful interactions

---

## Typography System

**Font Stack:** Inter (primary), SF Pro Display (headings), system fonts fallback

**Hierarchy:**
- Page Titles: 2xl - 3xl, font-semibold (Dashboard, Subscriptions, etc.)
- Section Headers: xl, font-medium
- Subscription Names: lg, font-medium
- Metadata (costs, dates): base, font-normal
- Labels: sm, font-medium, uppercase tracking-wide
- Supporting Text: sm, font-normal

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Consistent rhythm: p-6 for cards, gap-4 for lists, mb-8 for sections
- Container max-width: max-w-7xl mx-auto
- Grid systems: 12-column grid for dashboard, single column for mobile

**Dashboard Layout:**
```
Top Navigation Bar (fixed, h-16)
├── Logo/App Name (left)
├── Main Navigation (center/left)
└── User Profile + Actions (right)

Main Content Area (px-6 py-8)
├── Page Header (mb-8)
│   ├── Title + Description
│   └── Primary Actions (Add Subscription button)
├── Stats Overview Cards (grid-cols-1 md:grid-cols-3, gap-6, mb-8)
│   ├── Monthly Total
│   ├── Annual Total
│   └── Active Subscriptions Count
├── Charts Section (grid-cols-1 lg:grid-cols-2, gap-6, mb-8)
│   ├── Spending by Category (pie/donut chart)
│   └── Billing Frequency (bar chart)
└── Subscriptions List/Table
    └── Individual subscription cards
```

---

## Component Library

### Navigation Bar
- Horizontal layout with subtle bottom border
- Links with active state indicators (underline or background highlight)
- "Add Subscription" button prominently placed
- Search bar integration (w-64, expandable on focus)

### Stat Cards
- Rounded corners (rounded-lg)
- Padding: p-6
- Display: Large number (text-3xl font-bold), label below (text-sm)
- Subtle elevation with border treatment
- Hover state: slight scale transform

### Subscription Cards
**Layout per card:**
- Service icon/logo placeholder (w-12 h-12, rounded-lg) on left
- Content area (flex-grow)
  - Subscription name (font-medium text-lg)
  - Category tag (inline badge, rounded-full px-3 py-1 text-xs)
  - Cost (text-xl font-semibold) + billing cycle
  - Next renewal date (text-sm with calendar icon)
- Actions (right-aligned)
  - Edit icon button
  - Delete icon button
  - Options menu (three dots)

**List Structure:**
- Stack vertically with gap-4
- Each card: p-6, rounded-lg, border treatment
- Alternating emphasis for visual separation

### Charts
- Use Chart.js or Recharts library via CDN
- Container: aspect-video for responsive scaling
- Legend positioned at bottom
- Tooltips on hover showing exact values
- Minimal gridlines for clarity

### Forms (Add/Edit Subscription Modal)
**Modal Structure:**
- Centered overlay (max-w-lg)
- Header with title + close button
- Form fields with consistent spacing (space-y-4)
- Input fields:
  - Full width inputs
  - Label above (text-sm font-medium, mb-2)
  - Input height: h-11
  - Focus states with ring treatment
- Buttons: Primary (Save) + Secondary (Cancel) in footer

**Form Fields:**
1. Subscription Name (text input)
2. Cost (number input with currency prefix)
3. Billing Cycle (dropdown: Monthly/Quarterly/Yearly)
4. Category (dropdown or tags)
5. Next Renewal Date (date picker)
6. Notes (textarea, optional)

### Upcoming Renewals Section
- Timeline-style layout
- Group by time periods (Due Today, This Week, This Month)
- Each item shows: service name, cost, days until renewal
- Warning indicators for renewals within 7 days

### Filters & Sorting
- Horizontal filter bar above subscription list
- Dropdown menus for: Category, Billing Cycle, Sort By
- Clear filters button when active
- Active filter chips with remove option

### Empty States
- Centered illustrations (simple line art)
- Helpful message (text-lg)
- Primary action button (Add First Subscription)

---

## Interaction Patterns

**Micro-interactions:**
- Button hover: subtle shadow increase
- Card hover: gentle lift (translate-y-1 shadow-md)
- Input focus: ring appearance, subtle scale
- Checkbox/toggle: smooth color transition
- Delete confirmation: slide-in confirmation banner

**Loading States:**
- Skeleton screens for cards and lists
- Spinner for chart rendering
- Progressive disclosure for data-heavy sections

---

## Data Visualization

**Chart Specifications:**
- Category Spending: Donut chart with center total
- Billing Frequency: Horizontal bar chart
- Spending Trends (optional): Line chart showing monthly totals over time
- All charts: Clean, minimal styling with clear labels

---

## Responsive Behavior

**Mobile (< 768px):**
- Stack all multi-column layouts to single column
- Stat cards: full width, stacked
- Subscription cards: Simplified layout, icon + name + cost in compact view
- Bottom sheet for forms instead of modal
- Hamburger menu for navigation

**Tablet (768px - 1024px):**
- 2-column stat cards
- Single column charts (stacked)
- Full subscription card detail maintained

**Desktop (1024px+):**
- Full multi-column layouts
- Side-by-side charts
- Spacious padding and breathing room

---

## Images

**No hero image required** - This is a dashboard application.

**Icon System:**
- Use Heroicons (outline and solid variants) via CDN
- Subscription logos: 48x48px placeholders with initials or generic service icons
- Category icons in filters and tags

---

This design creates a professional, efficient subscription tracker that prioritizes quick scanning, easy data entry, and actionable insights without unnecessary visual complexity.