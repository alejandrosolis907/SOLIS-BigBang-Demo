// Express server to serve Vite build (CommonJS)
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, { maxAge: '1h', etag: true }));

// Example API (optional)
// app.get('/api/ping', (_req, res) => res.json({ ok: true }));

// Fallback to index.html for SPA routes (but not for /api/*)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
