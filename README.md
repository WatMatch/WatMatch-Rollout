# WatMatch Past Capstones

Standalone read-only browser for WatMatch past capstones.

## Scope

- Authenticated browsing only.
- No posting, importing, editing, team formation, matching, admin, or RBAC.
- Any verified `@uwaterloo.ca` Clerk user can browse.
- Data comes from the existing Supabase RPCs for historical past capstones.

## Local Setup

Use Node 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The Supabase service key is server-only. It is used only by protected Next route handlers that call read-only RPCs.

## Deploy

Deploy this folder as the Vercel project root. Add the same environment variables in Vercel.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
