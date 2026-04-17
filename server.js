import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === 'production';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function requireLibrarian(req, res) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    res.status(401).json({ error: 'Please sign in again before making this change.' });
    return null;
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    res.status(500).json({ error: 'Server admin access is not configured. Add SUPABASE_SERVICE_ROLE_KEY to Replit Secrets.' });
    return null;
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'Your session could not be verified. Please sign in again.' });
    return null;
  }

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('role')
    .eq('auth_id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    res.status(500).json({ error: profileError.message });
    return null;
  }

  if (!profile || profile.role !== 'librarian') {
    res.status(403).json({ error: 'Only librarian accounts can archive books.' });
    return null;
  }

  return admin;
}

app.post('/api/books/:id/archive', async (req, res) => {
  const admin = await requireLibrarian(req, res);
  if (!admin) return;

  const { id } = req.params;
  const { error } = await admin
    .from('books')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true });
});

app.post('/api/ebooks', async (req, res) => {
  const admin = await requireLibrarian(req, res);
  if (!admin) return;

  const title = String(req.body?.title || '').trim();
  const source = String(req.body?.url || '').trim();

  if (!title || !source) {
    res.status(400).json({ error: 'Please enter both an eBook title and URL.' });
    return;
  }

  const { data: last, error: lastError } = await admin
    .from('books')
    .select('accession_num')
    .order('accession_num', { ascending: false })
    .limit(1);

  if (lastError) {
    res.status(500).json({ error: lastError.message });
    return;
  }

  const numericAccessions = (last || [])
    .map(book => Number.parseInt(book.accession_num, 10))
    .filter(Number.isFinite);
  const nextAcc = ((numericAccessions[0] || 0) + 1).toString().padStart(5, '0');

  const { data, error } = await admin
    .from('books')
    .insert([{
      accession_num: nextAcc,
      title,
      authors: 'eBook',
      quantity: 1,
      book_type: 'eBook',
      source,
      date_acquired: new Date().toISOString().split('T')[0],
      status: 'active',
    }])
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true, ebook: data });
});

app.patch('/api/ebooks/:id', async (req, res) => {
  const admin = await requireLibrarian(req, res);
  if (!admin) return;

  const title = String(req.body?.title || '').trim();
  const source = String(req.body?.url || '').trim();

  if (!title || !source) {
    res.status(400).json({ error: 'Please enter both an eBook title and URL.' });
    return;
  }

  const { error } = await admin
    .from('books')
    .update({ title, source })
    .eq('id', req.params.id)
    .eq('book_type', 'eBook');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true });
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`ShelfMaster running on port ${port}`);
});
