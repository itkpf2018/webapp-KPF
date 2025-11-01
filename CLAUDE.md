# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Attendance Tracker PWA** - a comprehensive employee management system for sales teams in Thailand. It combines attendance tracking, sales recording, inventory management, and analytics in a Progressive Web App built with Next.js 15, TypeScript, and Supabase.

**Core Features:**
- PIN-based authentication with role-based access control (employee/sales/admin/super_admin)
- Attendance tracking with GPS coordinates and mandatory photo capture
- Sales recording with multi-unit support (box/pack/piece/drum/sachet)
- Stock/inventory management with FIFO tracking
- PC Daily reports (customer activity, shelf photos, promotions)
- Comprehensive admin dashboard with real-time KPIs and analytics
- PWA with auto-update notifications showing Thai changelog

**Tech Stack:**
- Next.js 15 (App Router) with Turbopack
- TypeScript (strict mode)
- Supabase (PostgreSQL database + storage + realtime)
- Tailwind CSS v4
- TanStack React Query v5
- bcryptjs for PIN hashing
- Recharts for data visualization
- Leaflet + React-Leaflet for maps
- Discord Webhooks for support notifications
- next-pwa for PWA capabilities
- Framer Motion for animations
- ExcelJS for report exports

## Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack (http://localhost:3000)

# Build & Production
npm run build            # Production build with Turbopack
npm run start            # Serve production bundle

# Type Checking
npx tsc --noEmit        # Type check without emitting files

# Linting
npm run lint            # Run ESLint

# Supabase Type Generation
npm run gen:types       # Generate TypeScript types from Supabase schema
                        # Output: src/types/supabase.ts
```

## Critical Architecture Patterns

### 1. Data Storage Migration Strategy (IMPORTANT!)

**This system is in transition from JSON files to Supabase.** Understanding this is critical:

- **Historical Context:** Originally used `data/app-data.json` for all data storage
- **Current State:** Migrating to Supabase for production (Netlify has read-only filesystem)
- **Hybrid Approach:** Some data (employees, stores) reads from Supabase first, falls back to JSON
- **Disabled Writes:** Many `writeData(data)` calls are commented out with `// Disabled: Netlify read-only filesystem`

**Key Files:**
- `src/lib/configStore.ts` - Main data store with hybrid JSON/Supabase logic
- `src/lib/supabaseClient.ts` - Supabase client factory (service role)
- `src/lib/supabaseDirectory.ts` - Employee/store Supabase operations
- `src/lib/supabaseData.ts` - Generic Supabase query helpers
- `src/lib/supabase*.ts` - Domain-specific Supabase modules (Products, Categories, Branding, Logs, etc.)

**When adding new features:**
1. Store data in Supabase tables (create migrations first)
2. Use `getSupabaseServiceClient()` for server-side operations
3. Never use JSON files for new data persistence
4. Use logging via `src/lib/supabaseLogs.ts` instead of local files

### 2. Authentication Architecture

**PIN-Based System:**
- 4-6 digit numeric PINs (bcrypt hashed, 10 rounds)
- Rate limiting: 5 failed attempts → 15 minute lockout
- Roles: `employee` | `sales` | `admin` | `super_admin`
- Session stored in HTTP-only cookies (24h duration)

**Key Tables:**
- `user_pins` - PIN hashes, roles, employee associations
- `auth_audit_logs` - All login attempts (success/failure)
- `auth_rate_limits` - Failed attempt tracking and lockout state

**Auth Flow:**
1. User enters PIN → `/api/auth/login`
2. Check rate limit in `auth_rate_limits`
3. Verify PIN via `src/lib/pinAuth.ts` (bcrypt.compare)
4. Log attempt in `auth_audit_logs`
5. Create session, set cookie
6. Redirect based on role

**Context & Hooks:**
- `src/contexts/AuthContext.tsx` - Client-side auth state
- `src/contexts/ModalContext.tsx` - Global modal state (controls header positioning)
- `src/hooks/useSupabaseRealtime.ts` - Real-time dashboard updates hook
- Server-side auth verification in API routes via cookie parsing

### 3. Database Schema Fundamentals

**Primary Entities:**

```sql
-- Attendance tracking
attendance_records (recorded_date, recorded_time, status, employee_id, store_id, photo_public_url, latitude, longitude)

-- Sales recording
sales_records (recorded_date, recorded_time, employee_id, store_id, product_id, unit_id, quantity, unit_price, total_price, price_type)

-- Inventory management
stock_inventory (employee_id, store_id, product_id, unit_id, quantity)
stock_transactions (type, quantity, balance_after, sale_record_id)

-- Master data
employees (name, employee_code, phone, province, region, regular_day_off, active_status)
stores (name, code, province, latitude, longitude, radius)
products (name, code, category_id, active_status)
product_units (product_id, name, sku, is_base_unit, base_unit_multiplier)

-- Product assignment (which employees can sell which products at which stores)
product_assignments (employee_id, product_id, store_id, is_global)
product_assignment_units (assignment_id, unit_id, price_pc, price_company)

-- PC Daily reports
pc_daily_reports (employee_id, store_id, report_date, customer_activity, notes)
pc_shelf_photos (report_id, photo_url, photo_path, notes)
pc_stock_usage (report_id, product_id, quantity_used)

-- Monthly targets
monthly_sales_targets (employee_id, year, month, target_amount, notes)

-- Support system
support_messages (type, message, user_name, user_id, user_role, context_url, status, admin_notes)

-- Leave management
leave_requests (employee_id, leave_type, start_date, end_date, reason, status, reviewed_by)

-- Branding & customization
branding_settings (company_name, logo_url, primary_color, secondary_color, dark_mode_enabled)
```

**Critical Constraints:**
- `stock_inventory.quantity` has CHECK (quantity >= 0) - cannot go negative
- Foreign keys everywhere with CASCADE deletes where appropriate
- Timestamps: use `recorded_date` (YYYY-MM-DD) + `recorded_time` (HH:MM:SS) for business records

### 4. API Route Patterns

**File Locations:**
- `src/app/api/attendance/route.ts` - POST attendance records
- `src/app/api/sales/route.ts` - POST sales records
- `src/app/api/stock/route.ts` - POST stock transactions
- `src/app/api/auth/[action]/route.ts` - Authentication endpoints
- `src/app/api/admin/*` - Admin-only operations (branding, reports, data management)

**Standard Pattern:**
```typescript
export async function POST(request: Request) {
  try {
    // 1. Parse and validate input
    const body = await request.json();

    // 2. Get Supabase client
    const supabase = getSupabaseServiceClient();

    // 3. Insert/update data
    const { data, error } = await supabase
      .from('table_name')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // 4. Log the action
    await supabaseLogs.addLog({
      timestamp: new Date().toISOString(),
      scope: 'attendance',
      action: 'create',
      details: 'บันทึกเวลาเข้างาน',
      metadata: { recordId: data.id }
    });

    // 5. Return success
    return Response.json({ success: true, data });

  } catch (error) {
    console.error('[API] error:', error);
    return Response.json(
      { success: false, error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
```

### 5. Frontend Component Organization

**App Router Structure:**
```
src/app/
├── page.tsx                    # Landing/attendance tracking
├── sales/page.tsx              # Sales recording form
├── stock/page.tsx              # Stock management
├── pc-report/page.tsx          # PC Daily report form
├── login/page.tsx              # PIN authentication
└── admin/                      # Admin dashboard & CMS
    ├── page.tsx                # Main dashboard with KPIs
    ├── reports/                # All analytics reports
    │   ├── attendance/
    │   ├── sales/
    │   ├── sales-comparison/
    │   ├── products/
    │   ├── individual/
    │   ├── roi/
    │   ├── pc-daily/
    │   └── stock-movement/
    ├── employees/              # Employee management
    ├── stores/                 # Store management
    ├── products/               # Product management
    ├── categories/             # Category management
    ├── leaves/                 # Leave request management
    ├── user-pins/              # PIN & role management
    ├── logs/                   # Activity logs
    └── settings/               # System settings
```

**Component Naming Conventions:**
- Page files: `page.tsx` (Next.js convention)
- Client components: `*Client.tsx` (e.g., `SalesReportPageClient.tsx`)
- Sections: `*Section.tsx` (e.g., `EmployeesSection.tsx`)
- Shared components: `src/components/*` (e.g., `UpdatePopup.tsx`, `PINKeypad.tsx`)

**Page Architecture Pattern:**
```typescript
// page.tsx (Server Component)
import ClientComponent from './ClientComponent';

export default function Page() {
  // Can fetch data server-side if needed
  return <ClientComponent />;
}

// ClientComponent.tsx (Client Component)
'use client';

import { useQuery } from '@tanstack/react-query';

export default function ClientComponent() {
  // All interactivity, state, and data fetching happens here
  const { data } = useQuery({
    queryKey: ['key'],
    queryFn: async () => {
      const res = await fetch('/api/endpoint');
      return res.json();
    }
  });

  return <div>...</div>;
}
```

**Data Fetching Pattern:**
- Use TanStack React Query for all API calls
- Query keys should be descriptive: `['sales', employeeId, dateRange]`
- Server Components only when truly static or SEO-critical
- Most pages use Client Components due to interactivity requirements

### 6. Type Safety & Supabase Types

**Generated Types:**
- `types/supabase.ts` - Auto-generated from Supabase schema
- `src/types/auth.ts` - Custom auth types and role helpers
- Regenerate after schema changes: `npm run gen:types`

**Usage Pattern:**
```typescript
import type { Database } from '@/types/supabase';

// Table row type
type SalesRecord = Database['public']['Tables']['sales_records']['Row'];

// Insert type
type SalesRecordInsert = Database['public']['Tables']['sales_records']['Insert'];

// Typed client
const supabase = getSupabaseServiceClient();
const { data, error } = await supabase
  .from('sales_records')
  .select('*')
  .returns<SalesRecord[]>();
```

**Never use `any` types.** If types are complex, define them explicitly in the relevant module.

**Role-Based Type Checking:**
```typescript
import { hasRequiredRole } from '@/types/auth';

// Check if user has admin access
if (!hasRequiredRole(user.role, 'admin')) {
  return Response.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### 7. Timezone Handling

**Critical:** All business logic uses `Asia/Bangkok` timezone.

```typescript
const DASHBOARD_TIME_ZONE =
  process.env.APP_TIMEZONE?.trim() || 'Asia/Bangkok';

// Use Intl.DateTimeFormat for timezone-aware formatting
const formatter = new Intl.DateTimeFormat('th-TH', {
  timeZone: DASHBOARD_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

// Store dates as YYYY-MM-DD strings in database
// Store times as HH:MM:SS strings in database
// Use ISO strings for timestamps
```

### 8. PWA Auto-Update System

**Version Management:**
- `public/version.json` - Current version, build date, Thai release notes
- `src/lib/serviceWorkerManager.ts` - Service worker registration & update detection
- `src/components/UpdatePopup.tsx` - Update notification UI

**Update Flow:**
1. Service worker checks `version.json` every 60 seconds
2. On version mismatch, shows Thai changelog popup
3. User clicks "อัปเดตเลย" → `window.location.reload()`
4. Service worker updates cache automatically

**Deployment:**
```bash
# 1. Update public/version.json with new version & Thai release notes
# 2. Commit & push to main branch
# 3. Netlify auto-deploys
# 4. Users see update popup within 60 seconds
```

## Common Development Patterns

### Adding a New Migration

```bash
# 1. Create migration file
touch migrations/013_add_feature_name.sql

# 2. Write SQL
-- Migration 013: Add feature_name
-- Description: What this migration does
-- Date: YYYY-MM-DD

CREATE TABLE IF NOT EXISTS public.feature_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns here
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.feature_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own data"
  ON public.feature_name FOR SELECT
  USING (employee_id = auth.uid()::text);

# 3. Run in Supabase SQL Editor
# 4. Regenerate types: npm run gen:types
```

### Adding a New Report

```typescript
// 1. Create page: src/app/admin/reports/new-report/page.tsx
import NewReportPageClient from './NewReportPageClient';

export default function NewReportPage() {
  return <NewReportPageClient />;
}

// 2. Create client component: NewReportPageClient.tsx
'use client';

import { useQuery } from '@tanstack/react-query';

export default function NewReportPageClient() {
  const { data, isLoading } = useQuery({
    queryKey: ['new-report'],
    queryFn: async () => {
      const res = await fetch('/api/admin/reports/new-report');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  // Render report UI
}

// 3. Create API route: src/app/api/admin/reports/new-report/route.ts
export async function GET(request: Request) {
  const supabase = getSupabaseServiceClient();

  // Query data
  const { data, error } = await supabase
    .from('sales_records')
    .select('*');

  if (error) throw error;

  return Response.json({ data });
}

// 4. Add to nav: src/app/admin/_components/AdminNav.tsx
```

### Working with Product Units

**Multi-unit System:**
- Each product can have multiple units (e.g., กล่อง, แพ็ค, ชิ้น)
- Each unit has a base multiplier (e.g., 1 กล่อง = 12 แพ็ค)
- Prices vary by unit and price type (PC vs Company)

**Example:**
```typescript
// Product: "น้ำดื่ม"
// Units:
// - กล่อง (box): base_unit_multiplier = 1, is_base_unit = true
// - แพ็ค (pack): base_unit_multiplier = 12, is_base_unit = false
// - ขวด (piece): base_unit_multiplier = 144, is_base_unit = false

// When recording sales:
// 1. User selects product + unit + quantity
// 2. Price looked up from product_assignment_units
// 3. Total = quantity * unit_price
// 4. Stock reduced by (quantity * base_unit_multiplier)
```

### Stock Management FIFO

**NOT implemented yet but structure supports it:**
```typescript
// stock_transactions table tracks all movements
// type: 'receive' | 'sale' | 'return' | 'adjustment'
// Each transaction links to sale_record_id if applicable
// balance_after shows inventory after transaction

// For FIFO: would need to track lot_number and expiry_date
// Currently just tracks aggregate quantity per (employee, store, product, unit)
```

## Testing & Quality

**Type Checking Before Commits:**
```bash
npx tsc --noEmit  # Must pass with zero errors
npm run lint      # Must pass
```

**No Test Framework Yet** - Manual testing required. Key test scenarios:
1. PIN authentication (success, failure, lockout)
2. Attendance recording with photo upload
3. Sales recording with multiple units
4. Stock operations (receive, sell, return)
5. Admin reports with various filters
6. PWA update notification flow

## Environment Variables

Required in `.env.local`:
```bash
# Supabase Configuration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_ATTENDANCE_BUCKET=attendance-photos

# Public Supabase Configuration (for client-side Realtime)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Application Configuration
APP_TIMEZONE=Asia/Bangkok

# Discord Webhook (for support notifications)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/xxx
```

**Security Note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Only use server-side.

## Logging Strategy

**All actions should be logged:**
```typescript
import * as supabaseLogs from '@/lib/supabaseLogs';

await supabaseLogs.addLog({
  timestamp: new Date().toISOString(),
  scope: 'sales', // 'employee' | 'store' | 'product' | 'attendance' | 'sales' | 'leave' | 'system'
  action: 'create', // 'create' | 'update' | 'delete' | 'assign' | etc.
  details: 'บันทึกยอดขาย: น้ำดื่ม 10 กล่อง',
  metadata: {
    saleId: data.id,
    employeeId: input.employeeId,
    productId: input.productId,
    quantity: input.quantity
  }
});
```

Logs stored in Supabase `app_logs` table, queryable from admin panel at `/admin/logs`.

## Deployment (Netlify)

**Build Configuration:**
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: 20.x

**Post-Deploy:**
1. Verify `/api/health` responds 200
2. Test authentication flow
3. Check service worker registration
4. Verify photo uploads to Supabase Storage

## Common Gotchas

1. **Don't use `data/app-data.json` for new features** - it's read-only on Netlify
2. **Always use server-side Supabase client in API routes** - never expose service role key to client
3. **Dates stored as strings** - `recorded_date: "2025-10-31"`, `recorded_time: "14:30:00"`
4. **Thai language strings** - Most UI text is in Thai, keep it consistent
5. **Photo uploads** - Use Supabase Storage, store both `photo_public_url` and `storage_path`
6. **GPS coordinates** - Store as `latitude` (number), `longitude` (number), `accuracy` (number in meters)
7. **Price types** - Sales records have `price_type: 'pc' | 'company'` for different pricing

## File Import Aliases

Uses `@/*` alias for `src/*`:
```typescript
import { getSupabaseServiceClient } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';
```

Configured in `tsconfig.json` paths.

## Language & Localization

**Primary Language:** Thai (ไทย)
- All UI strings in Thai
- Error messages in Thai
- Database columns in English (snake_case)
- Code comments in English
- Git commit messages can be English or Thai

**Date/Time Formatting:**
```typescript
// Use th-TH locale for display
new Intl.DateTimeFormat('th-TH', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(date);
```

## Client-Side Supabase & Realtime

**For realtime features (dashboard updates):**
```typescript
import { createClient } from '@supabase/supabase-js';

// Use NEXT_PUBLIC_ env vars for client-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Subscribe to realtime changes
const channel = supabase
  .channel('sales-changes')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'sales_records' },
    (payload) => {
      console.log('New sale:', payload.new);
      // Update UI
    }
  )
  .subscribe();
```

**Example Hook:**
```typescript
// src/hooks/useSupabaseRealtime.ts
export function useSupabaseRealtime(table: string, onUpdate: () => void) {
  // Subscribes to table changes and triggers callback
}
```

## Support System Integration

**Floating Chat Button & Discord Webhooks:**
- `src/components/FloatingChatButton.tsx` - Floating button on all pages
- `src/components/SupportChatModal.tsx` - Support ticket modal
- `src/app/api/support/send/route.ts` - API that stores in DB + sends to Discord
- `support_messages` table - Tracks all support requests
- Discord webhook sends formatted embed with user context (URL, user agent, role)

**Modal Context Pattern:**
```typescript
// src/contexts/ModalContext.tsx
// Global state for modal open/close
// Controls header positioning when modal is open
// Used by support chat and other modals
```

## Key Custom Hooks

- `useSupabaseRealtime(table, callback)` - Subscribe to database changes
- `useReportFilters()` - Shared state management for report filters
- `useTableSort()` - Client-side table sorting logic
- `useGPSRequired()` - GPS permission and coordinate capture
- `useAuth()` - Access authentication context

## Next.js Configuration Notes

**PWA Setup (next.config.ts):**
```typescript
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // PWA disabled in dev
  register: true,
  skipWaiting: true,
});
```

**Image Optimization:**
- Supabase Storage images are allowed via `remotePatterns`
- Pattern: `https://*.supabase.co/storage/v1/object/public/**`

## Error Handling & Error Boundaries

**ErrorBoundary Component:**
```typescript
// src/components/ErrorBoundary.tsx
// React Error Boundary for catching client-side errors
// Wraps the entire app in src/app/layout.tsx
```

**Pattern:**
- All API routes return `{ success: boolean, error?: string, data?: any }`
- Client components check `success` field before accessing `data`
- Thai error messages for user-facing errors

## Related Documentation

- **README.md** - Project overview, installation, features (Thai)
- **migrations/** - Database schema evolution (numbered 001-013)
- **.claude/agents/** - Specialized agent configurations (if present)
- **types/supabase.ts** - Auto-generated database types
- **.env.example** - Template for environment variables
