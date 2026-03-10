# SupaCtrl

SupaCtrl is a lightweight Supabase admin console that runs entirely in your browser. It helps you connect to any Supabase project, browse and edit tables, and move data in or out without leaving the Supabase ecosystem.

## Features

- Database connection wizard with inline guidance for picking the right API key (anon/publishable or `service_role`).
- Table explorer with search, pagination, row counts, clipboard copy, and CRUD actions (insert, edit, delete).
- Export workspace that can bundle selected tables into JSON or SQL, with optional schema inference based on live data.
- Import workflow for JSON or SQL files up to 10 MB, including progress feedback and error summaries.
- Toast notifications, RLS awareness hints, and quick table refresh to reduce common friction when working against protected datasets.

## Prerequisites

- Node.js 18+ (LTS recommended).
- npm 9+ (bundled with Node 18).
- A Supabase project URL and an API key with read/write access (service role suggested when working with protected tables).

## Getting Started

```bash
# Install dependencies
npm install

# Start the Vite dev server with hot reloading
npm run dev
```

The app runs on `http://localhost:5173` by default. When prompted, paste your Supabase project URL (e.g. `https://<project>.supabase.co`) and API key. Use a `service_role` key whenever Row Level Security (RLS) might block reads or writes; SupaCtrl stores the key in memory only for the active session.

## Usage Guide

- **Browse tables:** Select a table from the sidebar to view paginated results. Use the search box to filter per column and copy individual cell values to the clipboard.
- **Modify data:** Click `Insert` to add a new row, or the edit/delete controls within each row to update or remove records. Primary keys are auto-detected (`id` or the first column).
- **Export data:** Switch to the Export view to choose tables, formats (JSON or SQL), and whether to include schema, data, or both. Downloads are generated locally.
- **Import data:** Switch to the Import view and drop a `.json` or `.sql` file (10 MB max). JSON should follow `{ "table_name": { "data": [...] } }`. SQL `INSERT` statements are replayed in batches. Review the summary panel for any per-table errors.
- **Handle RLS:** If tables appear empty, SupaCtrl surfaces inline warnings. Reconnect using a `service_role` key or adjust policies in Supabase.

## Project Scripts

- `npm run dev` — launch the local development server.
- `npm run build` — create a production build in the `dist/` folder.
- `npm run preview` — serve the production build locally.
- `npm run lint` — run ESLint with the shared project configuration.

## Screenshots

![Connection screen](screenshots/Screenshot%202026-03-10%20at%2010.22.05.png)
![Table explorer](screenshots/Screenshot%202026-03-10%20at%2010.22.50.png)
![Import and export tools](screenshots/Screenshot%202026-03-10%20at%2010.23.14.png)

## Roadmap Ideas

- Bulk row editing and multi-table relational previews.
- CSV support for both import and export workflows.
- Adjustable page size and saved column filter presets.

