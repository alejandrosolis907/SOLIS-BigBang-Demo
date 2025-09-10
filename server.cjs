// server.js (Golden para Railway)
const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());

const distPath = path.join(__dirname, 'dist');
console.log('[BOOT] distPath =', distPath);

if (!fs.existsSync(path.join(distPath, 'index.html'))) {
  console.warn('[BOOT] dist/index.html no encontrado, ejecutando "node node_modules/vite/bin/vite.js build"...');
  try {
    // Railway inyecta variables `npm_config_*` que provocan warnings si se
    // invoca a `npm`. Ejecutamos directamente el binario de Vite con Node y
    // limpiamos esas variables para que el build sea silencioso.
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (key.toLowerCase().startsWith('npm_config_')) delete env[key];
    }
    execSync('node node_modules/vite/bin/vite.js build', { stdio: 'inherit', env });
  } catch (err) {
    console.error('[BOOT] build falló', err);
    process.exit(1);
  }

  // Si después del build aún no existe index.html, abortamos para que
  // Railway reinicie el contenedor en vez de servir respuestas vacías.
  if (!fs.existsSync(path.join(distPath, 'index.html'))) {
    console.error('[BOOT] build completado pero dist/index.html sigue ausente');
    process.exit(1);
  }
}

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/debug', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  const exists = fs.existsSync(indexPath);
  let listing = [];
  try { listing = fs.readdirSync(distPath); } catch {}
  res.json({ distPath, indexExists: exists, listing });
});

app.use(express.static(distPath, { maxAge: '1h', etag: true }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  const indexFile = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexFile)) {
    console.error('[ERROR] index.html no encontrado en:', indexFile);
    return res.status(500).send('Build no encontrado. ¿Corrió "npm run build"?');
  }
  res.sendFile(indexFile);
});

app.use((err, _req, res, _next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`[BOOT] Servidor escuchando en puerto ${PORT}`);
});
