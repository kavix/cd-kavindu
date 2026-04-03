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

### API Configuration (Server-Side Only)
The backend base URL is **hardcoded** in `src/lib/backend.ts`.

**Current value:** `http://13.127.192.243:3000`

**Note:** The frontend components call Next.js API routes (`/api/*`) which then proxy requests to the backend (avoids CORS issues).

### MongoDB Configuration
```bash
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<db>?retryWrites=true&w=majority
MONGODB_DB=your_db_name
MONGODB_COLLECTION=your_collection
```

**Status:** Deprecated (the Next.js app no longer queries MongoDB directly).

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
- **CORS Solution:** All API calls now go through Next.js API routes (`/api/*`) which run server-side, eliminating CORS issues. The frontend never directly calls the backend API.

