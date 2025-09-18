// server.js (Golden para Railway)
const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_EXPERIMENTS_DOC_URL = 'https://zenodo.org/records/17153982';

app.use(compression());
app.use(express.json());

const distPath = path.join(__dirname, 'dist');
console.log('[BOOT] distPath =', distPath);

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/debug', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  const exists = fs.existsSync(indexPath);
  let listing = [];
  try { listing = fs.readdirSync(distPath); } catch {}
  res.json({ distPath, indexExists: exists, listing });
});

app.use(express.static(distPath, { maxAge: '1h', etag: true, index: false }));

const indexFilePath = path.join(distPath, 'index.html');
let cachedIndexHtml = null;
if (fs.existsSync(indexFilePath)) {
  cachedIndexHtml = fs.readFileSync(indexFilePath, 'utf8');
}

const HTTP_URL_PATTERN = /^https?:\/\//i;

function resolveRuntimeExperimentsDocUrl() {
  const envValue =
    process.env.EXPERIMENTS_DOC_URL ?? process.env.VITE_EXPERIMENTS_DOC_URL ?? '';
  const trimmed = envValue.trim();
  if (!trimmed || !HTTP_URL_PATTERN.test(trimmed)) {
    return '';
  }
  return trimmed;
}

function serializeForInlineScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();

  if (!cachedIndexHtml) {
    if (!fs.existsSync(indexFilePath)) {
      console.error('[ERROR] index.html no encontrado en:', indexFilePath);
      return res
        .status(500)
        .send('Build no encontrado. ¿Corrió "npm run build"?');
    }
    cachedIndexHtml = fs.readFileSync(indexFilePath, 'utf8');
  }

  const runtimeUrl = resolveRuntimeExperimentsDocUrl();
  const effectiveUrl = runtimeUrl || DEFAULT_EXPERIMENTS_DOC_URL;
  const runtimeScript = `<script>window.__BB_RUNTIME_CONFIG__ = Object.assign({}, window.__BB_RUNTIME_CONFIG__, ${serializeForInlineScript({
    experimentsDocUrl: effectiveUrl,
  })});</script>`;

  let htmlToSend = cachedIndexHtml;
  if (cachedIndexHtml.includes('</body>')) {
    htmlToSend = cachedIndexHtml.replace('</body>', `${runtimeScript}\n</body>`);
  } else {
    htmlToSend = `${cachedIndexHtml}\n${runtimeScript}`;
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(htmlToSend);
});

app.use((err, _req, res, _next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`[BOOT] Servidor escuchando en puerto ${PORT}`);
});
