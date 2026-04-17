# ShelfMaster

A web-based library management system (LMS) built with React + Vite, Express.js, and MySQL/MariaDB for local XAMPP/phpMyAdmin usage.

## Tech Stack

- **Frontend:** React 19, React Router DOM v7
- **Build Tool:** Vite 8 served through an Express server on port 5000
- **Backend/Database:** Express.js API with MySQL/MariaDB via `mysql2`
- **Local Database Target:** XAMPP MySQL/MariaDB, default database `shelfmaster`
- **Charts:** Recharts
- **Barcodes:** react-barcode, jsbarcode
- **PDF:** jsPDF + jspdf-autotable
- **Package Manager:** npm

## Project Structure

- `server.js` — Express server that hosts the Vite app, creates MySQL tables, handles auth, uploads, and database API calls
- `xampp_schema.sql` — Optional phpMyAdmin import file for manually creating the local MySQL schema
- `src/` — All React source files (flat layout)
  - `main.jsx` — Entry point
  - `App.jsx` — Routing (public, `/student/*`, `/librarian/*`)
  - `supabaseClient.js` — Compatibility client that keeps the old Supabase-style `.from()` and `.auth` API while calling Express/MySQL endpoints
  - `supabaseAdmin.js` — Compatibility export that points to the Express/MySQL client
  - `BarcodeLabel.jsx` — Barcode label component + helpers (`generateBarcode`, `generateCopyAccessionId`)
  - `Inventory.jsx` — Physical book & eBook management with per-copy system; archive and eBook saves call server endpoints
  - `ProcessReturns.jsx` — Barcode scan to return a specific copy
  - `PendingRequests.jsx` — Approve/decline borrow requests, assigns specific copies
  - `BorrowingHistory.jsx` — Full transaction log with copy accession IDs
  - `StudentBooks.jsx` — Student view of active loans (shows copy accession ID)
  - `StudentCatalog.jsx` — Public book catalog with borrow request
- `public/` — Static assets

## Local XAMPP Database Configuration

Default local MySQL settings match a standard XAMPP install:
- `DB_HOST=127.0.0.1`
- `DB_PORT=3306`
- `DB_USER=root`
- `DB_PASSWORD=`
- `DB_NAME=shelfmaster`
- `JWT_SECRET=shelfmaster-local-dev-secret`

`server.js` loads `.env` automatically if present. If no `.env` is provided, it uses the XAMPP defaults above. The server creates the `shelfmaster` database and tables automatically when XAMPP MySQL is running.

The optional `xampp_schema.sql` file can also be imported through phpMyAdmin. The first account registered through the app is automatically made a librarian so a new local database can be administered immediately.

## Database Schema

### books
Core book title record. `quantity` = number of currently available copies.

### book_copies *(requires one-time migration)*
One row per physical copy. This is what gets scanned.
- `id`, `book_id` (FK→books), `copy_number`, `accession_id` (e.g. `LIB-2026-000001`), `status` (available/borrowed/damaged/lost), `date_acquired`

### transactions
- `id`, `user_id` (FK→users), `book_id` (FK→books), `copy_id` (FK→book_copies, nullable), `status`, `borrow_date`, `due_date`, `return_date`

The MySQL schema is created automatically by `server.js`. For manual setup, import `xampp_schema.sql` in phpMyAdmin.

## Per-Copy Barcode System

- **Accession ID format:** `LIB-YYYY-NNNNNN` (6-digit global counter, e.g. `LIB-2026-000001`)
- Adding a book with qty=5 auto-generates 5 copies with sequential accession IDs
- Each copy's barcode label is printed separately (Code 128)
- **Borrow:** Librarian approves → system assigns the next available copy → links `copy_id` to the transaction
- **Return:** Staff scans copy barcode → exact copy found → marked available → student's loan closed
- Inventory page shows expandable copies panel per book title

## Replit Migration Notes

- `.replit` runs `npm run dev` on port 5000; that script now starts `server.js`, which serves Vite in development and the built `dist` files in production.
- The app no longer depends on Supabase secrets for local database features.
- The archive action uses `/api/books/:id/archive` and eBook saves use `/api/ebooks`; the server verifies the requester is a librarian using JWT auth.
- Inventory save payloads clean blank numeric fields before writing to MySQL to avoid numeric type errors.
- File uploads are saved under `public/uploads/` and served from `/uploads/...`.

## Development

```bash
npm install
npm run dev   # with XAMPP MySQL running, starts on port 5000
```
