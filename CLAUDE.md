# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Attendance Tracker PWA built with Next.js 15 (App Router) and React 19. The app records employee check-in/check-out events with required photo capture and GPS coordinates, and persists everything to Supabase (Postgres tables + Storage buckets). Admin users can manage employees, stores, products, categories, sales, expenses, leaves, and review analytics dashboards in Thai.

## Key Tech Stack

- Next.js 15 + Turbopack (dev/build)
- React 19, TypeScript, Tailwind CSS v4
- Supabase (`@supabase/supabase-js`) for Postgres + Storage
- TanStack React Query for client-side data fetching
- Recharts for data visualization
- Leaflet/React-Leaflet for maps
- date-fns for date handling
- bcryptjs for PIN hashing (authentication)
- ESLint (Next.js config)

## Dev Commands

```bash
npm install          # once per machine (Node >= 18.18)
npm run dev          # Turbopack dev server (localhost:3000)
npm run build        # production build (run before PRs touching routing/config)
npm run start        # serve production bundle
npm run lint         # ESLint check (no fix mode configured)
npm run gen:types    # generate TypeScript types from Supabase schema (overwrites src/types/supabase.ts)
```

## Initial Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure Supabase credentials** in `.env.local`:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only, never expose to client)
   - `SUPABASE_ANON_KEY`: Anonymous public key (safe for client-side)
   - `SUPABASE_ATTENDANCE_BUCKET`: Storage bucket name (e.g., `attendance-photos`)
   - `APP_TIMEZONE`: Timezone for date processing (default: `Asia/Bangkok`)

3. **Set up Supabase database:**
   - Run migrations in `migrations/` folder via Supabase SQL Editor in sequential order
   - Create storage bucket for attendance photos
   - Configure bucket as public or set appropriate RLS policies

4. **Install dependencies and start:**
   ```bash
   npm install
   npm run dev
   ```

**Important Configuration:**
- TypeScript configured with strict mode enabled (`tsconfig.json`)
- Path alias `@/*` maps to `src/*` (e.g., `import { foo } from '@/lib/utils'`)
- Turbopack is used for both dev and build (faster than Webpack, enabled via `--turbopack` flag)
- There are currently no test scripts configured
- ESLint configured with Next.js rules (run via `npm run lint`, no autofix mode)

**Build Notes:**
- Always run `npm run build` before committing changes to routing, middleware, or Next.js config
- Build process validates TypeScript types and catches production-only errors
- Service worker is only generated in production builds (disabled in dev)
- Build output goes to `.next/` directory (gitignored)

## Data & Storage Layout

### Supabase Tables

**Core Data Tables:**
- `attendance_records`: primary source for attendance reports; schema in `types/supabase.ts`
- `sales_records`: mirrors sales form submissions with unit pricing and assignment tracking
- `employees`: Supabase-first employee master with employee codes and geography
- `stores`: Supabase-first store master with GPS coordinates and geofencing radius
- `employee_store_assignments`: many-to-many relationship between employees and stores (supports primary store designation)

**Product Management Tables:**
- `products`: product catalog with codes, names, and active status
- `product_units`: units of measure for products (e.g., box, piece) with SKU and base unit multipliers
- `product_assignments`: assigns products to employees (globally or per-store)
- `product_assignment_units`: pricing per unit for each assignment (price_pc and price_company)

**PC Daily Reports Tables:**
- `pc_daily_reports`: daily reports submitted by Product Consultants (PC) with customer activities, competitor promo notes, store promo notes
- `pc_shelf_photos`: shelf photos with captions (unlimited per report)
- `pc_stock_usage`: multi-unit stock usage tracking (JSONB quantities, auto-calculated base units)

**Monthly Targets Tables:**
- `monthly_targets`: monthly sales targets per employee with target amounts and achievement tracking

**Stock Management Tables:**
- `stock_inventory`: current stock balance per employee/store/product/unit (enforces non-negative quantities)
- `stock_transactions`: immutable audit trail of all stock movements (receive, sale, return, adjustment)

**Authentication & Security Tables:**
- `user_pins`: PIN-based authentication with bcrypt hashing, role-based access (employee/sales/admin/super_admin)
- `auth_audit_logs`: comprehensive audit trail of all login attempts (success/failure, IP, user agent)
- `auth_rate_limits`: failed login attempt tracking per employee with automatic lockout

**Application Configuration Tables:**
- `app_logs`: system-wide activity logs (replaces filesystem-based logging)
- `categories`: product categories with color coding
- `leave_requests`: employee leave management (scheduled/approved/rejected/cancelled)
- `branding_settings`: application branding (logo, theme) stored in Supabase Storage

**Storage:**
- Photos stored in bucket defined by `SUPABASE_ATTENDANCE_BUCKET`
- Upload/URL generation in `src/app/api/attendance/route.ts`
- Branding logos stored in same bucket with metadata in `branding_settings` table
- Server-side access via `getSupabaseServiceClient()` (service role key)

**Schema Evolution:**
- Migrations tracked in `migrations/*.sql` files (numbered sequentially)
- Run all migrations in order via Supabase SQL Editor
- Check `migrations/` directory for current migration files
- **Important:** `npm run gen:types` outputs to `src/types/supabase.ts` (overwrites existing file)
- Keep a backup of custom types before regenerating
- After running migrations, restart dev server to ensure types are loaded: `npm run dev`

### Dual Data Source Pattern (Employees & Stores) - Legacy Architecture
**Note:** This is a transitional pattern from the original Google Sheets backend architecture.

The app historically supported a dual-source architecture:
1. **Primary**: JSON file (`data/app-data.json`) managed through `src/lib/configStore.ts`
2. **Sync Target**: Supabase tables (`employees`, `stores`) via `src/lib/supabaseDirectory.ts`

Modern approach: Use Supabase as the primary source and gradually migrate away from JSON-based storage for employees/stores. Product assignments, categories, and other configuration can remain JSON-based as they benefit from Git versioning.

Legacy sync behavior:
- `configStore.readData()` attempts Supabase fetch first, falls back to JSON if unavailable
- Changes to employees/stores written to both JSON and Supabase for backward compatibility
- Use `src/lib/supabaseEmployeeStores.ts` for direct Supabase-only operations

### Data Storage Migration Status

**Supabase (Primary - Production Ready):**
- Employees, stores, products, product assignments, stock, authentication, logs, categories, leaves, branding
- All core data now stored in Supabase tables
- Compatible with Netlify's read-only filesystem
- No filesystem writes required in production

**JSON Files (Development Only / Legacy):**
- `data/app-data.json`: Legacy storage - being phased out (do not use for new features)
- `data/expenses.json`: Expense baseline/items for ROI reports (consider migrating to Supabase table)
- JSON backups in `data/backups/` only work on local filesystem (not Netlify compatible)
- **Important**: For Netlify deployment, all data must be in Supabase

## API Surface (App Router)

### Public API
- `/api/attendance` (POST): validates payload, enforces photo upload, stores record in Supabase
- `/api/sales` (POST): submits sales form to Supabase

### Admin API
- `/api/admin/employees/**`: CRUD for employee management (syncs to Supabase directory)
- `/api/admin/stores/**`: CRUD for store management (syncs to Supabase directory)
- `/api/admin/products/**`: CRUD for products, includes import/export/catalog endpoints
- `/api/admin/categories/**`: CRUD for product categories
- `/api/admin/product-assignments/**`: manage employee-product-store assignments
- `/api/admin/leaves/**`: leave request management
- `/api/admin/expenses/**`: expense configuration for ROI reports
- `/api/admin/branding/**`: logo upload and branding settings
- `/api/admin/backups/**`: backup management
- `/api/admin/logs/**`: system logs retrieval
- `/api/admin/dashboard/**`: snapshot metrics and analytics
  - `/api/admin/dashboard/route.ts`: 7-day KPI snapshot with period-over-period comparison
  - `/api/admin/dashboard/analytics/route.ts`: filtered dashboard metrics with custom date ranges
  - `/api/admin/dashboard-pro/route.ts`: advanced analytics endpoint
- `/api/admin/reports/**`: report generation endpoints
  - `/api/admin/reports/attendance/route.ts`: attendance records report with pagination
  - `/api/admin/reports/sales/route.ts`: sales records report with pagination
  - `/api/admin/reports/sales-comparison/route.ts`: period-over-period sales comparison
  - `/api/admin/reports/products/route.ts`: product sales analysis and ranking
  - `/api/admin/reports/individual/route.ts`: individual employee performance metrics
  - `/api/admin/reports/roi/route.ts`: ROI calculations with expense baselines
- `/api/admin/pc-reports/**`: PC Daily Report management
  - `/api/admin/pc-reports/route.ts` (GET/POST): list and create PC reports
  - `/api/admin/pc-reports/[id]/route.ts` (GET/PUT/DELETE): manage individual reports
  - `/api/admin/pc-reports/[id]/photos/route.ts` (GET/POST): shelf photo management
  - `/api/admin/pc-reports/[id]/stock/route.ts` (GET/POST): stock usage tracking
  - `/api/admin/pc-reports/upload/route.ts` (POST): photo upload endpoint
- `/api/admin/targets/**`: Monthly sales target management
  - `/api/admin/targets/route.ts` (GET/POST): list and create monthly targets
  - `/api/admin/targets/[id]/route.ts` (GET/PUT/DELETE): manage individual targets
  - `/api/admin/targets/employee/[id]/summary/route.ts` (GET): employee target summary
- `/api/admin/user-pins/**`: PIN authentication management
  - `/api/admin/user-pins/route.ts` (GET/POST): list and create user PINs
  - `/api/admin/user-pins/[id]/route.ts` (GET/PUT/DELETE): manage individual PINs

All reports query Supabase tables via `fetchAttendanceSheetRows` / `fetchSalesSheetRows` helpers from `src/lib/supabaseData.ts`.

## Frontend Structure (App Router)

### Page Routes
- `/` - Main attendance form (employee check-in/check-out with photo + GPS)
- `/sales` - Sales recording form
- `/stock` - Stock management (receive, return, initial balance, adjustments)
- `/admin` - Admin dashboard with KPIs, charts, segments
- `/admin/reports/*` - Report pages (attendance, sales, sales-comparison, products, individual, roi, pc-daily, stock-movement)
- `/admin/employees` - Employee management
- `/admin/stores` - Store management
- `/admin/stores/map` - Store location map view
- `/admin/products` - Product catalog
- `/admin/categories` - Product category management
- `/admin/product-assignments` - Employee product assignments
- `/admin/leaves` - Leave management
- `/admin/settings` - Settings panel
- `/admin/logs` - System logs viewer
- `/admin/user-pins` - User PIN management (authentication)

### Component Organization
- `src/app/admin/_components/*` - Admin-specific shared components (AdminNav, BrandingSettingsPanel, PerformanceExplorer, LoadingDashboard)
- `src/app/admin/reports/_components/*` - Report-specific components (ReportFilters, ExportButtons, PaginationControls, SortableTable, ReportTabs)
- `src/app/admin/settings/sections/*` - Settings panels (EmployeesSection, StoresSection, ProductsSection, etc.)
- `src/components/*` - Global shared UI components
- `src/hooks/*` - Custom React hooks

### Client/Server Pattern
- Pages are Server Components by default (data fetching on server)
- Interactive components use "use client" directive and are typically in `*Client.tsx` files
  - Examples: `EnterpriseDashboardClient.tsx`, `ReportPageClient.tsx`, `SalesReportPageClient.tsx`
- Server Components fetch data directly from `configStore` functions
- Client Components use TanStack Query for data fetching/mutations

### Styling
- Tailwind CSS v4 (PostCSS-based, not JIT)
- Global overrides in `src/app/globals.css`
- Thai language UI throughout

## Configuration & Environment

### Required Environment Variables
- `SUPABASE_URL`: Project URL from Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-side only, never expose to client)
- `SUPABASE_ANON_KEY`: Anonymous public key (safe for client-side)
- `SUPABASE_ATTENDANCE_BUCKET`: Storage bucket name for attendance photos

### Optional Environment Variables
- `APP_TIMEZONE`: Timezone for date processing in reports (default: `Asia/Bangkok`)
- `GOOGLE_SHEETS_TIMEZONE`: Legacy env var (superseded by `APP_TIMEZONE`)
- `PIN_SALT`: Legacy salt for SHA-256 PIN hashing (for backward compatibility only)

### Environment Setup
- Copy `.env.example` to `.env.local` before starting development
- `.env.local` is gitignored and should never be committed

### Important Constants (configStore.ts)
- `LOG_LIMIT`: 300 entries (logs auto-trim on writes)
- `DASHBOARD_LOOKBACK_DAYS`: 7 days (default snapshot period)
- `PERFORMANCE_TIMELINE_DAYS`: 14 days (extended timeline view)
- `DASHBOARD_TIME_ZONE`: Falls back to `APP_TIMEZONE` or `Asia/Bangkok`

### Security Notes
- Never commit real service-role keys
- Keep `.env.local` out of version control (already in `.gitignore`)
- Service role key is only used in API routes, never in client components

## Key Libraries and Modules

### Core Data Layer
- `src/lib/configStore.ts`: Main data store for all entities (employees, stores, products, categories, leaves, logs, branding)
  - Provides all CRUD functions: `getEmployees()`, `createEmployee()`, `updateEmployee()`, `deleteEmployee()`, etc.
  - Handles dual-source sync pattern for employees/stores
  - Manages automatic backups on writes
  - Normalizes and validates all data
  - Contains dashboard metrics calculation logic
- `src/lib/supabaseClient.ts`: Supabase client factory with `getSupabaseServiceClient()`
- `src/lib/supabaseData.ts`: Query helpers for Supabase tables (`fetchAttendanceSheetRows`, `fetchSalesSheetRows`)
- `src/lib/supabaseDirectory.ts`: Employee/store directory sync to Supabase tables
- `src/lib/autoBackup.ts`: Automatic JSON backup on every write

### Utilities & Helpers
- `src/lib/observability.ts`: Telemetry/logging wrapper `withTelemetrySpan` for API routes
- `src/lib/reportRangeUtils.ts`: Date range utilities for report filtering
- `src/lib/csvUtils.ts`: CSV export helpers for reports
- `src/lib/dashboardExport.ts`: Export dashboard data to Excel
- `src/lib/productImportExport.ts`: Bulk product import/export (CSV/Excel)
- `src/lib/assignmentImportExport.ts`: Bulk product assignment import/export
- `src/lib/salesComparisonQuery.ts`: Period-over-period sales comparison logic
- `src/lib/thaiGeography.ts`: Thai province and region data (used for employee/store management)
- `src/lib/geo.ts`: Geolocation and GPS utilities (coordinate validation, distance calculations)
- `src/lib/branding.ts`: Logo upload and branding configuration
- `src/lib/supabaseProducts.ts`: Product and unit management in Supabase
- `src/lib/supabaseEmployeeStores.ts`: Employee-store assignment operations
- `src/lib/pcReports.ts`: PC Daily Report operations (photo upload, CRUD, stock calculations)
- `src/lib/monthlyTargets.ts`: Monthly sales target management and tracking
- `src/lib/pinAuth.ts`: PIN hashing and verification using bcryptjs
- `src/lib/authSecurity.ts`: Authentication security with audit logs and rate limiting

### Product Assignment System
Products use a multi-unit pricing system with flexible assignment:

**Product Structure:**
- Each product can have multiple units (e.g., box, piece, bottle)
- One unit is designated as the base unit
- Other units have multipliers to convert to base units
- Each unit can have a unique SKU for inventory tracking

**Assignment Model:**
- Products assigned to employees (globally or per-store)
- Global assignment: product available to employee at all stores
- Store-specific assignment: product only available at that specific store
- Each assignment can have multiple units with individual pricing
- Two price points per unit: `price_pc` (sale price) and `price_company` (cost/wholesale price)

**Key Functions:**
- `createProductAssignments()`: Create assignment with unit pricing
- `deleteProductAssignment()`: Remove assignment
- `getProductsForEmployee()`: Get available products filtered by employee + store
- See `src/lib/supabaseProducts.ts` for Supabase-based operations

### PC Daily Reports System
Product Consultants (PC) submit daily reports with customer activities, competitor intelligence, and stock usage:

**Report Structure:**
- One report per employee per store per day (enforced by unique constraint)
- Draft/submitted workflow: reports can be saved as drafts and submitted later
- Supports multiple photo types: shelf photos, competitor promo, store promo
- Multi-unit stock usage tracking with JSONB quantities (e.g., {"ลัง": 10, "ชิ้น": 5})
- Auto-calculated base units via `calculate_stock_base_units()` database function

**Key Features:**
- Photo upload to Supabase Storage bucket (uses same bucket as attendance photos)
- Cascade delete: shelf photos and stock usage records deleted automatically when report is deleted
- Immutable once submitted: prevent accidental edits to submitted reports
- Customer activity tracking: track number of customer interactions

**Key Functions:**
- `uploadPCPhoto()`: Upload photo to storage and return public URL
- `createPCReport()`: Create new report (draft or submitted)
- `updatePCReport()`: Update existing report
- `addShelfPhoto()`: Add shelf photo with caption
- `addStockUsage()`: Record multi-unit stock usage
- See `src/lib/pcReports.ts` for all operations

### Stock Management System
Track inventory levels and movements across employees, stores, and products:

**Architecture:**
- `stock_inventory`: Current balance snapshot (one record per employee/store/product/unit)
- `stock_transactions`: Immutable audit trail of all movements (receive, sale, return, adjustment)
- Atomic operations via `add_stock_transaction()` RPC function (updates inventory + creates transaction in single DB transaction)

**Transaction Types:**
- `receive`: Receiving stock from supplier/warehouse (increases inventory)
- `sale`: Stock sold to customer (decreases inventory)
- `return`: Customer returns or internal return (increases inventory)
- `adjustment`: Manual correction/physical count adjustment (can increase or decrease)

**Key Features:**
- Non-negative constraint: prevents inventory from going negative (enforced at DB level)
- Denormalized reporting: transaction records store names (employee, store, product) for fast reporting
- Balance tracking: each transaction records `balance_after` for audit purposes
- Sales linkage: transactions can reference `sales_records` for traceability

**Key Functions:**
- `add_stock_transaction(employee_id, store_id, product_id, unit_id, type, quantity, notes, sale_record_id)`: Atomic stock operation
- Returns: `{transaction_id, balance_after, success, message}`
- Automatically creates inventory record if it doesn't exist

### Authentication & Security System
PIN-based authentication system with comprehensive security features:

**Architecture:**
- `user_pins`: Stores employee PINs with bcrypt hashing (4-6 digit numeric PINs)
- `auth_audit_logs`: Complete audit trail of all login attempts (success/failure)
- `auth_rate_limits`: Tracks failed attempts per employee with automatic account lockout

**Security Features:**
- bcrypt password hashing with 10 salt rounds (production-grade security)
- Legacy SHA-256 support for backward compatibility
- Rate limiting: 5 failed attempts within 15 minutes triggers account lockout
- Comprehensive audit logging: employee ID, IP address, user agent, failure reason
- Role-based access control: employee, sales, admin roles

**Key Functions (src/lib/pinAuth.ts):**
- `hashPin(pin)`: Hash a PIN using bcrypt (validates 4-6 digit numeric format)
- `verifyPin(pin, hash)`: Verify PIN against hash (supports bcrypt and legacy SHA-256)

**Key Functions (src/lib/authSecurity.ts):**
- `logAuthAttempt()`: Log authentication attempt to audit trail
- `checkRateLimit()`: Check if employee is rate-limited
- `recordFailedAttempt()`: Record failed login attempt
- `resetRateLimit()`: Reset failed attempts after successful login

**UI Routes:**
- `/admin/user-pins`: Manage employee PINs and roles
- API routes in `/api/admin/user-pins/**`

**Migration:**
- See `migrations/001_create_user_pins.sql` for PIN table schema
- See `migrations/002_create_auth_security.sql` for audit and rate limit tables

## Important Patterns

### Dashboard Metrics & Reports
All dashboard/report logic runs server-side:
1. Data collection from logs/Supabase via `collectDashboardRecords()` or direct Supabase queries
2. Timezone-aware date/time calculations using `getZonedDateParts()` and `makeZonedDate()`
3. Filtering by date range, employee, store, status, time window
4. Aggregation and grouping (by product, employee, store, date)
5. Percentage calculations and comparisons (current vs previous periods)

Key functions:
- `getDashboardSnapshot()`: 7-day KPI overview with period-over-period comparison
- `getDashboardMetrics(options)`: Filtered metrics with custom date ranges
- `getProductSalesReport(options)`: Product-level sales analysis

### Log-Based Analytics (Legacy Pattern)
Some analytics still derive from the `logs` array in `data/app-data.json`:
- `collectDashboardRecords()` parses logs with scope="attendance" or scope="sales"
- Used by `getDashboardSnapshot()` and product reports
- This is a transitional pattern; consider migrating fully to Supabase queries

### Photo Upload Flow
1. Client captures photo (base64 or blob)
2. POST to `/api/attendance` with photo + attendance data
3. Server uploads to Supabase Storage bucket
4. Server stores record in `attendance_records` table with `photo_public_url`
5. Public URL used for display in reports

### Import/Export Functionality
The app supports bulk operations for products and assignments:

**Product Import/Export:**
- `/api/admin/products/import` (POST): Upload CSV/Excel file to bulk import products
- `/api/admin/products/export` (GET): Download current product catalog as CSV/Excel
- Handles product units, SKUs, base unit designation, and unit multipliers
- Import validates codes for duplicates and creates units automatically

**Assignment Import/Export:**
- `/api/admin/product-assignments/import` (POST): Bulk import employee-product-store assignments with pricing
- `/api/admin/product-assignments/export` (GET): Download current assignments as CSV/Excel
- Supports global assignments (no store) and store-specific assignments
- Includes unit pricing (price_pc and price_company) per assignment

**Report Export:**
- Most reports support CSV export via query parameter: `?export=csv`
- Dashboard metrics can be exported to Excel via `src/lib/dashboardExport.ts`
- Uses `exceljs` for Excel generation and `csv-stringify` for CSV

## Configuration & Gotchas

### JSON Files
- `data/app-data.json` and `data/expenses.json` must remain valid JSON at all times
- Backups are created in `data/backups/` before every write (via `src/lib/autoBackup.ts`)
- Logs are capped at 300 entries (see `LOG_LIMIT` in `configStore.ts`)
- Never delete these files; empty them if needed but keep the file structure intact

### Code Backup Files
- Files with `.backup`, `.original_backup`, or `.backup-before-*` suffixes are historical backups
- These are kept for reference during major refactors (e.g., `route.backup-before-grouping.ts`)
- Do not modify or delete backup files unless explicitly requested
- When creating new backup files, use descriptive suffixes (e.g., `.backup-before-[feature-name]`)

### Database Schema & Migrations
- **Important:** `npm run gen:types` outputs directly to `src/types/supabase.ts` (overwrites existing file)
- **Type Generation Workflow**:
  1. Run migrations via Supabase SQL Editor (see `migrations/` folder)
  2. **Backup custom types:** Save any custom type definitions from `src/types/supabase.ts`
  3. Generate types: `npm run gen:types` (requires Supabase project ID configured in package.json:10)
  4. **Restore custom types:** Re-add any custom type definitions if needed
  5. Restart dev server: `npm run dev`
- Run migrations in `migrations/` folder via Supabase SQL Editor
- Migrations must be run sequentially in numbered order (001, 002, 003, etc.)
- Each migration file includes rollback instructions in SQL comments
- Test migrations on a development database before running on production
- **Workflow**: Schema change → Write migration SQL → Run migration → Backup custom types → Generate types → Restore custom types → Test locally → Deploy

### Common Code Issues
- **Variable hoisting in React hooks**: Always declare `useMemo`/`useCallback` values **before** they're referenced in `useEffect` dependency arrays
- **Temporal Dead Zone (TDZ)**: Attempting to access a `const` or `let` variable before its declaration will throw a ReferenceError
- **Example**: If a `useEffect` at line 100 depends on a `useMemo` value, that `useMemo` must be declared before line 100

### PWA Configuration
- `public/manifest.json` controls PWA install experience
- `next.config.ts` configures `next-pwa` with runtime caching
- Service worker only active in production (disabled in dev mode)
- PWA assets generated in `public/` directory during production build
- To test PWA features: `npm run build && npm run start` (service worker won't work in dev mode)

### Next.js Image Configuration
- Remote patterns configured in `next.config.ts` for Supabase images
- Allows Next.js Image component to optimize images from `*.supabase.co` domains
- Pattern: `https://*.supabase.co/storage/v1/object/public/**`

## Employee-Store Relationships

Employees can be assigned to multiple stores with one designated as primary:

**Database Schema:**
- `employee_store_assignments` table links employees to stores
- `is_primary` flag indicates the default/primary store
- Each employee must have exactly one primary store (enforced by database trigger)
- Legacy `default_store_id` column maintained for backward compatibility

**API Endpoints:**
- `/api/admin/employees/[id]/stores` (GET): List stores for an employee
- `/api/admin/employees/[id]/stores` (POST): Assign employee to store(s)
- `/api/admin/employees/[id]/stores` (PUT): Update primary store designation
- `/api/admin/employees/[id]/stores` (DELETE): Remove store assignment

**Use Cases:**
- Sales representatives covering multiple locations
- Staff rotating between branches
- Report filtering by employee's assigned stores only
- Product assignments can be store-specific or global across all employee's stores

## Development Workflow

1. **Adding a new entity type**:
   - Update `AppData` type and `DEFAULT_DATA` in `src/lib/configStore.ts`
   - Add CRUD functions (create, read, update, delete)
   - Create API routes in `src/app/api/admin/{entity}/route.ts`
   - Create admin UI page in `src/app/admin/{entity}/page.tsx`
   - Add navigation link in `src/app/admin/_components/AdminNav.tsx`

2. **Adding a new report**:
   - Create API route: `src/app/api/admin/reports/{name}/route.ts`
   - Query Supabase via `fetchAttendanceSheetRows` or `fetchSalesSheetRows` helpers
   - Create client page component: `src/app/admin/reports/{name}/page.tsx`
   - Use shared report components from `src/app/admin/reports/_components/*`
   - Add export functionality if needed (CSV/Excel)

3. **Modifying Supabase schema**:
   - Create migration file: `migrations/00X_description.sql` with sequential numbering
   - Include descriptive comments at the top: migration number, description, date
   - Update `src/types/supabase.ts` to match new schema (manual types)
   - Run `npm run gen:types` to regenerate `src/types/supabase-generated.ts`
   - Include rollback instructions in migration file SQL comments
   - Test on development database first via Supabase SQL Editor
   - Restart dev server after running migration: `npm run dev`

4. **Adding new dashboard metrics**:
   - Extend `getDashboardMetrics()` or `getDashboardSnapshot()` in `src/lib/configStore.ts`
   - Add new data fetching in dashboard API routes
   - Create/update client components in `src/app/admin/EnterpriseDashboardClient.tsx`

5. **Adding import/export for new entities**:
   - Create helper module: `src/lib/{entity}ImportExport.ts`
   - Follow patterns from `productImportExport.ts` or `assignmentImportExport.ts`
   - Add API endpoints: `src/app/api/admin/{entity}/import/route.ts` and `export/route.ts`
   - Use `exceljs` for Excel, `csv-parse`/`csv-stringify` for CSV

6. **Adding a new client component**:
   - Use `"use client"` directive at the top
   - Import from `@/lib/*` using path alias
   - Use TanStack Query for data fetching: `useQuery`, `useMutation`
   - Follow naming convention: `{Feature}Client.tsx` for page-level components

7. **Working with PC Daily Reports**:
   - Reports use draft/submitted workflow (status field)
   - One report per employee/store/date (enforced by unique constraint)
   - Shelf photos stored in `pc_shelf_photos` table (one-to-many with cascade delete)
   - Stock usage stored in `pc_stock_usage` table with JSONB quantities
   - All photos uploaded via `src/lib/pcReports.ts` helper functions
   - API routes in `src/app/api/admin/pc-reports/**`

8. **Working with Stock Management**:
   - Always use `add_stock_transaction()` RPC function for stock operations (never manually update inventory)
   - Function is atomic: updates inventory + creates transaction record in single DB transaction
   - Transaction types: `receive`, `sale`, `return`, `adjustment`
   - Inventory cannot go negative (enforced at DB level)
   - Query `stock_inventory` for current balances
   - Query `stock_transactions` for audit trail and reporting

9. **Working with PIN Authentication**:
   - PINs must be 4-6 digit numeric strings
   - Always use `hashPin()` from `src/lib/pinAuth.ts` when creating/updating PINs
   - Never store plain-text PINs in the database
   - Use `verifyPin()` for login verification (supports bcrypt and legacy SHA-256)
   - Rate limiting automatically locks accounts after 5 failed attempts in 15 minutes
   - All authentication attempts are logged to `auth_audit_logs` for security auditing
   - Admin UI available at `/admin/user-pins` for PIN management

## Testing

The project uses Vitest with React Testing Library for component and integration testing:

- **Test Location**: Tests should mirror the source structure under `src/__tests__/` (e.g., `src/__tests__/app/sales` for sales features)
- **Running Tests**:
  - `npx vitest` - Enter watch mode for development
  - `npx vitest run` - Run all tests once
  - `npx vitest run --coverage` - Generate coverage report (required before PR merge, target >=80% coverage)
- **Testing Guidelines**:
  - Mock browser APIs (e.g., `navigator.geolocation`) for deterministic attendance flows
  - Name test suites after the route or hook being tested
  - Resolve snapshot failures immediately before requesting review
  - Use React Testing Library for component testing

## Debugging & Common Issues

### Build Errors
- **"Module not found"**: Check path alias `@/*` is used correctly
- **TypeScript errors in production only**: Run `npm run build` locally to reproduce
- **Supabase type mismatches**: Ensure `types/supabase.ts` matches actual database schema
- **"Cannot find module lightningcss.*.node"**: Native module issue in WSL/Linux. Run `npm install --force` or delete `node_modules` and reinstall. This is a Tailwind CSS v4 native dependency issue.

### Runtime Issues
- **Data not appearing in reports**: Check timezone settings (`APP_TIMEZONE`)
- **Photo upload fails**: Verify `SUPABASE_ATTENDANCE_BUCKET` exists and has correct permissions
- **Old data persists**: JSON cache may be stale - check `data/app-data.json` vs Supabase
- **RLS Policy errors**: Service role key bypasses RLS; anon key enforces it
- **Login fails with correct PIN**: Check `auth_audit_logs` table for failure reason, verify account not locked in `auth_rate_limits`
- **Account locked after failed attempts**: Rate limit resets automatically after 15 minutes, or admin can reset via database
- **Stock transaction fails**: Check inventory balance is non-negative; transaction will reject if result would be negative

### Development Tips
- Use `src/lib/observability.ts` → `withTelemetrySpan()` wrapper for API route logging
- Dashboard metrics use timezone-aware date functions: `getZonedDateParts()`, `makeZonedDate()`
- For date range filtering, see `src/lib/reportRangeUtils.ts`
- Client-side data fetching uses TanStack Query - check React Query DevTools

## Code Style & Conventions

- **TypeScript**: Use 2-space indentation, trailing semicolons, and explicit return types on exported APIs
- **Naming**:
  - PascalCase for components, hooks, and providers
  - camelCase for utilities and functions
  - SCREAMING_SNAKE_CASE for constants
- **Styling**: Prefer Tailwind classes; add custom styles only in `src/app/globals.css`
- **Comments**: Keep brief and focused on non-obvious logic or domain context
- **File Organization**:
  - User-facing routes in `src/app`
  - Shared UI primitives in `src/components`
  - Cross-cutting helpers in `src/lib`
  - API routes co-located with features or in `src/app/api/<feature>`

## Pull Request Guidelines

- Write imperative commit subjects (e.g., "add sales check-in flow")
- Squash fixup commits before pushing
- PR descriptions should summarize behavior changes, link related issues, and list manual checks
- Attach screenshots for UI updates
- Apply area labels like `ui`, `api`, or `infrastructure`
- Ensure all checks pass: `npm run lint` and `npx vitest run --coverage` before requesting review
- Confirm CI is green before merging

## Migration Notes

This app has evolved from a Google Sheets backend to Supabase. Legacy references:
- No longer dependent on Google Sheets API
- Log-based analytics are transitional; prefer direct Supabase queries for new features
- Employees/stores maintain dual-source pattern (JSON + Supabase) during transition
- `GOOGLE_SHEETS_TIMEZONE` env var is legacy - use `APP_TIMEZONE` instead
