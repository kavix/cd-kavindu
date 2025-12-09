# Environment Variables

This document lists all environment variables used in this project.

## Required Environment Variables

### Clerk Authentication
These are required for authentication to work. Get them from your [Clerk Dashboard](https://dashboard.clerk.com).

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Where used:**
- `src/app/layout.tsx` - ClerkProvider wrapper
- `src/middleware.ts` - Authentication middleware
- `src/app/login/[[...rest]]/page.tsx` - Sign-in component
- `src/app/dashboard/page.tsx` - Protected routes
- `src/app/history/page.tsx` - Protected routes

## Optional Environment Variables

### API Configuration
```bash
NEXT_PUBLIC_API_URL=http://3.108.238.200
```

**Default:** `http://3.108.238.200` (if not set)

**Where used:**
- `src/components/EnergyDashboard.tsx` - Fetches `/current` and `/predict` endpoints
- `src/components/HealthCheck.tsx` - Checks `/health` endpoint
- `src/components/SensorDataForm.tsx` - POSTs to `/send` endpoint
- `src/app/history/page.tsx` - Fetches `/history` endpoint

## Setup Instructions

1. Create a `.env.local` file in the root directory:
   ```bash
   touch .env.local
   ```

2. Add your environment variables:
   ```bash
   # Required
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
   CLERK_SECRET_KEY=your_secret_key

   # Optional (has default)
   NEXT_PUBLIC_API_URL=http://3.108.238.200
   ```

3. For Vercel deployment, add these in your Vercel project settings:
   - Go to your project → Settings → Environment Variables
   - Add each variable for Production, Preview, and Development environments

## Notes

- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Variables without `NEXT_PUBLIC_` are server-side only
- Never commit `.env.local` or `.env` files to git (they're in `.gitignore`)
- The API URL defaults to `http://3.108.238.200` if not specified

