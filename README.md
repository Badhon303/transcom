# BPCL × Transcom — PET Reverse-Logistics Platform (Phase 1)

Shared dashboard for a PET bottle reverse-logistics network: Transcom's distributors (customers) and BPCL's RBUs + Factory, with nearest-RBU suggestions, road routing, and multi-stop run planning.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** ORM + **SQLite** (portable to Postgres — change the datasource in `prisma/schema.prisma`)
- **NextAuth** (Credentials) with role-gating middleware
- **Leaflet + OpenStreetMap** tiles for maps, **OSRM** (public demo server) for road distance/duration + route polylines
- **Haversine** straight-line distance computed first (free) for candidate filtering
- **recharts** for the summary charts, **SheetJS (xlsx)** for spreadsheet import

## Setup

```bash
npm install            # installs deps + runs prisma generate
npx prisma db push     # creates the SQLite dev.db from the schema
npm run db:seed        # seeds users, 3 RBUs + Factory, Settings singleton
npm run db:import      # imports the geocoded spreadsheet (../List_Damages_Phase_2_02.07.26_geocoded.xlsx)
npm run dev            # http://localhost:3000
```

> On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd` / `npx.cmd`.

### Environment (`.env`)

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<change-me>"
OSRM_BASE_URL="https://router.project-osrm.org"   # swap for a self-hosted/paid OSRM in production
```

## Demo logins (password: `password123`)

| Email | Role | Can do |
|---|---|---|
| transcom@demo.com | TRANSCOM_ADMIN | Customer CRUD + import, full map |
| bpcl@demo.com | BPCL_ADMIN | RBU/Factory CRUD, Settings, Runs, full map |
| viewer@demo.com | VIEWER | Read-only map, summary, runs |

## Routes

- `/dashboard` — shared network map (blue customers sized by case qty, green RBUs, square Factory), filters, click-for-details side panel with ranked RBUs + route drawing.
- `/dashboard/summary` — KPI cards + case-qty-by-region / by-RBU charts + unassigned list.
- `/dashboard/runs` — multi-stop run planner: auto-suggested clusters, manual add/reorder/remove stops, live route + totals, save as PLANNED/COMPLETED.
- `/admin/customers` (+ `/import`) — Transcom customer table, add/edit with pin-drop map, spreadsheet upload.
- `/admin/rbus` — BPCL RBU/Factory CRUD with pin-drop, single-factory enforcement.
- `/admin/settings` — BPCL low-volume threshold + clustering radius (read live everywhere).

## Key logic

- **Nearest RBU** (`src/lib/distance.ts`): Haversine-rank all RBUs, confirm the top 2 with OSRM road distance, suggest the lowest road-distance one; also computes the RBU→Factory leg.
- **Low-volume flag & clustering** read the threshold/radius live from the `Settings` table (`src/lib/settings.ts`) — no hardcoded constants.
- **Multi-stop** (`src/lib/clustering.ts`): distance-based single-linkage clustering + nearest-neighbor stop ordering from the RBU; road totals via OSRM through all waypoints.
- Editing a customer's coordinates or an RBU recomputes affected assignments.

## Notes / Phase 1 scope

- 10 imported customers have no coordinates — imported and flagged "needs geocoding" (shown as unassigned / amber in the UI).
- Region names like "Khulna Region" / "Dhaka Outer " are normalized on import.
- Out of scope (per spec): live GPS tracking, scheduling calendar, SMS, billing, native mobile.
