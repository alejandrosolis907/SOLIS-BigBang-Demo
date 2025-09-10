import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');
const port = process.env.PORT || 3000;

// ---- LOGS DE ARRANQUE
console.log('🔎 NODE_ENV:', process.env.NODE_ENV);
console.log('🔎 CWD:', process.cwd());
console.log('🔎 __dirname:', __dirname);
console.log('🔎 distPath:', distPath);

// Lista 10 archivos de dist si existe
try {
  const files = fs.readdirSync(distPath).slice(0, 10);
  console.log('📦 dist contents (first 10):', files);
} catch (e) {
  console.warn('⚠️ No pude listar dist:', e.message);
}

// Verifica que index.html exista
if (!fs.existsSync(indexPath)) {
  console.error('❌ dist/index.html NO existe. ¿Falló el build o el COPY en Docker?');
} else {
  console.log('✅ dist/index.html encontrado.');
}

// ---- ENDPOINTS
app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    node: process.version,
    env: process.env.NODE_ENV || 'undefined',
  });
});

// Sirve estáticos
app.use(express.static(distPath));

// Fallback SPA
app.get('*', (_req, res) => {
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send('dist/index.html no encontrado en runtime');
  }
  res.sendFile(indexPath);
});

// Arranque con logs verbosos y manejo de errores
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${port}`);
});

// Cualquier excepción no atrapada -> log explícito
process.on('uncaughtException', (err) => {
  console.error('💥 uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 unhandledRejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibido, cerrando servidor...');
  server.close(() => process.exit(0));
});
