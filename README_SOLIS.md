# Modo SOLIS (opcional, apagado por defecto)
Este módulo añade UI y telemetría alineada a SOLIS sin romper el modo existente.
- Feature flag: `UI_MODE_SOLIS_ENABLED="1"` para habilitar.
- Export PNG igual que el actual (no se toca).
- Export XLSX opcional: si falta `xlsx`, se omite con warning.

## Mapeo
- Φ: `Phi` (semillas / condición inicial)
- 𝓛(x): `Lx` (parámetros estructurales)
- 𝓣: `Tau ≈ ∂R/∂𝓛(x)` (estimador discreto)
- ℜ: `Res` (resonancia/selección)
- ε: `Evt` (evento/colapso)
- R: `R` (estado colapsado)

## Verificación 30s
```bash
npm run build
node ./scripts/auto_verify_export.js         # si se transpila a JS
# o: npx ts-node ./scripts/auto_verify_export.ts
```

Genera ./artifacts/verify_export_*.xlsx cuando el flag está activo.
