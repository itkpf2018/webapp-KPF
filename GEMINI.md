# Project Overview

This is a Next.js Progressive Web Application (PWA) for tracking employee attendance. It's designed to be mobile-first and allows users to check-in and check-out with photo and location verification. The application also includes functionality for tracking sales.

## Key Technologies

*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **Backend:** Supabase (Postgres + Storage)
*   **PWA:** `next-pwa`
*   **Mapping:** Leaflet, React-Leaflet
*   **Charts:** Recharts
*   **Date/Time:** date-fns

## Architecture

The application is a full-stack Next.js application. The frontend is built with React and Tailwind CSS, and it communicates with the backend via API routes. The backend uses Supabase for its database and file storage. The application is also a PWA, which allows it to be installed on mobile devices and used offline.

# Building and Running

## Prerequisites

*   Node.js
*   npm

## Installation

```bash
npm install
```

## Running the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Building for Production

```bash
npm run build
```

## Running in Production

```bash
npm run start
```

# Development Conventions

## Linting

The project uses ESLint for code linting. To run the linter, use the following command:

```bash
npm run lint
```

## Supabase

The application uses Supabase for its backend. The Supabase client is initialized in `src/lib/supabaseClient.ts`. The application requires the following environment variables to be set:

*   `SUPABASE_URL`
*   `SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY`
*   `SUPABASE_ATTENDANCE_BUCKET`

The database schema is defined in the `README.md` file.

## Data

Employee, store, and product data is stored in `data/app-data.json`. This file can be edited directly to update the application's data.
