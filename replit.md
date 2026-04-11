# ShelfMaster

A web-based library management system (LMS) built with React + Vite and Supabase.

## Tech Stack

- **Frontend:** React 19, React Router DOM v7
- **Build Tool:** Vite 8 (port 5000)
- **Backend/Database:** Supabase (PostgreSQL + Auth)
- **Charts:** Recharts
- **Barcodes:** react-barcode, jsbarcode
- **PDF:** jsPDF + jspdf-autotable
- **Package Manager:** npm

## Project Structure

- `src/` — All React source files (flat layout)
  - `main.jsx` — Entry point
  - `App.jsx` — Routing (public, `/student/*`, `/librarian/*`)
  - `supabaseClient.js` — Supabase anon client
  - `supabaseAdmin.js` — Supabase service-role client
  - `BarcodeLabel.jsx` — Barcode label component + helpers (`generateBarcode`, `generateCopyAccessionId`)
  - `Inventory.jsx` — Physical book & eBook management with per-copy system
  - `ProcessReturns.jsx` — Barcode scan to return a specific copy
  - `PendingRequests.jsx` — Approve/decline borrow requests, assigns specific copies
  - `BorrowingHistory.jsx` — Full transaction log with copy accession IDs
  - `StudentBooks.jsx` — Student view of active loans (shows copy accession ID)
  - `StudentCatalog.jsx` — Public book catalog with borrow request
- `public/` — Static assets

## Environment Variables (stored in Replit Secrets)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

## Database Schema

### books
Core book title record. `quantity` = number of currently available copies.

### book_copies *(requires one-time migration)*
One row per physical copy. This is what gets scanned.
- `id`, `book_id` (FK→books), `copy_number`, `accession_id` (e.g. `LIB-2026-000001`), `status` (available/borrowed/damaged/lost), `date_acquired`

### transactions
- `id`, `user_id` (FK→users), `book_id` (FK→books), `copy_id` (FK→book_copies, nullable), `status`, `borrow_date`, `due_date`, `return_date`

### Migration SQL (run once in Supabase SQL Editor)
```sql
CREATE TABLE IF NOT EXISTS book_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  copy_number INTEGER NOT NULL DEFAULT 1,
  accession_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'borrowed', 'damaged', 'lost')),
  date_acquired DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS copy_id UUID REFERENCES book_copies(id);

ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for book_copies" ON book_copies
  FOR ALL USING (true) WITH CHECK (true);
```

## Per-Copy Barcode System

- **Accession ID format:** `LIB-YYYY-NNNNNN` (6-digit global counter, e.g. `LIB-2026-000001`)
- Adding a book with qty=5 auto-generates 5 copies with sequential accession IDs
- Each copy's barcode label is printed separately (Code 128)
- **Borrow:** Librarian approves → system assigns the next available copy → links `copy_id` to the transaction
- **Return:** Staff scans copy barcode → exact copy found → marked available → student's loan closed
- Inventory page shows expandable copies panel per book title

## Development

```bash
npm install
npm run dev   # starts on port 5000
```
