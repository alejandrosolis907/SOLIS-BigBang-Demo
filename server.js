// server.js (Golden para Railway)
const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');
console.log('[BOOT] distPath =', distPath);

if (!fs.existsSync(path.join(distPath, 'index.html'))) {
  console.error('[BOOT] dist/index.html no encontrado. Asegúrate de ejecutar "npm run build" antes de iniciar el servidor.');
  process.exit(1);
}

app.use(compression());
app.use(express.json());

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use(express.static(distPath, { maxAge: '1h', etag: true }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`[BOOT] Servidor escuchando en puerto ${PORT}`);
});
