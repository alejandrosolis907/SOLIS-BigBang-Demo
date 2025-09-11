# BigBang_Final — SOLIS (UI opcional), telemetría ∂R/∂𝓛(x), export PNG/XLSX y verificación 30s

## Resumen
- Modo SOLIS **apagado por defecto** (feature flag).
- Telemetría segura (no-op si está deshabilitado).
- Export XLSX con 5 hojas (si `xlsx` está disponible).

## Cómo probar
```bash
# Habilitar temporalmente
set UI_MODE_SOLIS_ENABLED=1 && npm run build && node ./scripts/auto_verify_export.js
```

Checklist

 Sin cambios en archivos existentes

 Sin roturas en Railway sin flag

 Export XLSX genera 5 hojas y Meta
