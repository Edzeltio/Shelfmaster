# ShelfMaster

A web-based library management system (LMS) built with React + Vite and Supabase.

## Tech Stack

- **Frontend:** React 19, React Router DOM v7
- **Build Tool:** Vite 8
- **Backend/Database:** Supabase (PostgreSQL + Auth)
- **Styling:** CSS
- **Charts:** Recharts
- **PDF:** jsPDF + jspdf-autotable
- **Package Manager:** npm

## Project Structure

- `src/` — All React source files (flat layout)
  - `main.jsx` — Entry point
  - `App.jsx` — Routing
  - `supabaseClient.js` — Supabase client init
  - `Home.jsx`, `Login.jsx`, `Signup.jsx` — Public pages
  - `Student*.jsx` — Student portal pages
  - `Librarian*.jsx`, `Inventory.jsx`, `UserManagement.jsx`, etc. — Librarian portal
- `public/` — Static assets
- `index.html` — HTML entry

## Environment Variables

Stored in `.env`:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

## Development

```bash
npm install
npm run dev   # starts on port 5000
```

## Deployment

Configured as a static site deployment:
- Build: `npm run build`
- Public dir: `dist`
