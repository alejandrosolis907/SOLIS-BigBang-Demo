# SOLIS BigBang — Simulación Metaontológica

Este proyecto implementa en forma visual y computacional la fórmula metaontológica **R = Φ ∘ 𝓛(x)**,
integrando los módulos de **dinámica temporal (𝓣)**, **resonancia (ℜ)** y **eventos (ε)**.
La interfaz de usuario (UI) permite manipular parámetros de 𝓛, observar variaciones en R y estudiar
la congruencia del modelo con los axiomas presentados en *axiomas.pdf*.

---

## 🚀 Instalación y uso

### Requisitos
- Node.js 18+ o 20+
- pnpm (recomendado) o npm

### Desarrollo
```bash
pnpm install
pnpm dev
# Abre http://localhost:5173/
```

### Producción (Express + Vite)
```bash
pnpm build
pnpm start
# Abre http://localhost:3000/
```

---

## 🌐 Despliegue en Railway

1. Sube este repositorio a GitHub.
2. En Railway, selecciona **New Project → Deploy from GitHub**.
3. Railway detectará automáticamente el entorno Node + Vite + Express y ejecutará:
   - `pnpm install`
   - `pnpm run build` (gracias al script `postinstall`)
   - `pnpm start`

---

## 📂 Estructura del proyecto

```
/ (raíz)
├─ LICENSE                        # Apache-2.0 para el código
├─ NOTICE                         # Aviso de autoría y licencias
├─ README.md                      # Este documento unificado
├─ server.js                      # Servidor Express
├─ package.json                   # Scripts y dependencias
├─ src/                           # Código fuente UI (React + Vite)
├─ public/                        # Recursos estáticos
└─ docs/
   ├─ axiomas.pdf                 # Documento metaontológico (CC BY-NC-ND 4.0)
   └─ LICENSE-docs-CC-BY-NC-ND-4.0.md
```

---

## 📜 Licencias

- **Código (src/, public/, server.js, etc.)**: Apache-2.0 (ver `LICENSE`).
- **Documento axiomas.pdf (docs/axiomas.pdf)**: CC BY-NC-ND 4.0 (ver `docs/LICENSE-docs-CC-BY-NC-ND-4.0.md`).

---

## 📑 Contenido previo integrado

A continuación se integran los textos de otros README que existían en el proyecto, para mantener trazabilidad:

# Contenido de README.md

# BigBang_PLUS — Φ ∘ 𝓛(x) → R

Motor visual minimalista que mapea tu modelo SOLIS (Ω, Φ, 𝓛, 𝓣, ℜ, ε, R, 𝓡ₐ) a una simulación interactiva con **3 cámaras Φ** corriendo en paralelo (multiverso).

## Cómo correr
**Opción A (sin instalar nada):**
1. Abre `index.html` con tu navegador (doble clic).

**Opción B (Node.js, listo para Railway):**
```bash
npm start
# abre http://localhost:8080
```
En Railway: crea un nuevo servicio desde este repo/carpeta.
- **Build**: `NIXPACKS` (auto)
- **Start command**: `npm start`
- Detecta el `PORT` automáticamente.

## Controles globales
- **Iniciar todo / Pausar todo / Big Bang (reinicio)** — control maestro de las 3 cámaras.
- **Seed base** — cambia el generador Φ (ruido estructurable).
- **Grid** — resolución de la lattice 𝓛(x).
- **Velocidad** — escala de 𝓣 (tasa de actualización).
- **Preset** — `Alta entropía` (ℜ laxo), `Simetría rígida` (𝓛 fuerte), `Balance`.

Cambios en **seed/grid/preset/velocidad** se aplican **en tiempo real** a todas las cámaras (auto-sync).

## Mapeo Modelo → Motor
- **Φ (campo potencial)**: ruido seudoaleatorio controlado por *seed* (`makePhi`).
- **𝓛(x) (lattice estructural)**: kernels de suavizado/realce y preset (entropía/rigidez).
- **ℜ (resonancia)**: métrica `res = mean/std` sobre el campo estructurado.
- **ε (evento)**: aparición de *sparks* cuando ℜ supera umbral.
- **𝓣 (tiempo)**: tasa de actualización (slider de velocidad).
- **R (realidad)**: canvas renderizado a partir del campo estructurado.
- **𝓡ₐ (autoactualización)**: leve *drift* que realimenta Φ desde el histórico de R.

## Archivo
- `src/engine.js`: implementación de axiomas en clave computacional.
- `src/main.js`: UI + control global + bucle de animación.
- `server.js`: servidor estático sin dependencias (Node puro).

## Licencia
Este motor/plantilla es original para tu proyecto. Sustituye aquí la licencia que prefieras (p.ej., Apache-2.0 para el **código**) y mantén CC BY‑NC‑ND 4.0 para tu **obra teórica** si así lo deseas.
# Contenido de README_DEPLOY.md

# BigBang_PLUS – Setup unificado (Vite + Express)

## Desarrollo local
```bash
npm install
npm run dev    # inicia server (nodemon) + Vite (hot reload)
```

## Prueba de producción local
```bash
npm run build  # compila a dist/
npm start      # sirve dist/ con Express en http://localhost:3000
```

## Despliegue en Railway
- Conecta tu repo de GitHub a Railway.
- Comando de inicio: `npm start` (Railway usa PORT automáticamente).
- `postinstall` ejecuta `npm run build` para generar `dist/` en la nube.
# Contenido de README_PATCH.txt

SOLIS — Parche de Resonancia (ℜ), Umbral de Evento (ε) y Panel de Sensibilidad (𝓣 = ∂R/∂𝓛(x))

Qué incluye
- src/lib/solisModel.ts        → Hook con estado (𝓛, θ, log ε, métricas y funciones)
- src/lib/resonance.ts         → Cálculos de ℜ (similitud coseno) y utilidades de métricas
- src/components/ResonanceMeter.tsx
- src/components/SensitivityPanel.tsx
- src/components/EventLog.tsx
- src/App_solis_example_patch.tsx  → Ejemplo de integración (no reemplaza tu App automáticamente)

Cómo instalar
1) Descomprime este ZIP en la raíz de tu proyecto (donde está package.json).
   Debes terminar con estos archivos en tu carpeta `src/`.

2) Integra en tu App.tsx (paso mínimo):
   ------------------------------------------------------------------
   import React from "react";
   import { useSolisModel } from "./lib/solisModel";
   import { SensitivityPanel } from "./components/SensitivityPanel";
   import { ResonanceMeter } from "./components/ResonanceMeter";
   import { EventLog } from "./components/EventLog";

   export default function App() {
     const {
       L, setL, theta, setTheta,
       resonanceNow, pushParticles, tick,
       metricsDelta, eventsLog, resetMetrics
     } = useSolisModel();

     // TODO: en tu loop/animación actual llama:
     // pushParticles(particles)  // donde particles es un arreglo de { id, features:[e,s,c] }
     // tick()                    // avanza el tiempo y evalúa ε si ℜ ≥ θ

     return (
       <div style={{display:"grid", gap:12, padding:16}}>
         <ResonanceMeter value={resonanceNow} />
         <SensitivityPanel
           L={L}
           setL={setL}
           theta={theta}
           setTheta={setTheta}
           metricsDelta={metricsDelta}
           onResetMetrics={resetMetrics}
         />
         <EventLog events={eventsLog} />
         {/* Deja tu canvas/visual aquí */}
       </div>
     );
   }
   ------------------------------------------------------------------

3) ¿Cómo enviarle tus datos al modelo?
   - En cada frame o cada cierto intervalo, construye tu arreglo de partículas:
     const particles = [{ id: "p1", features: [energy, symmetry, curvature] }, ...];
     // componentes en [0..1] o normalizados
   - Luego llama:
     pushParticles(particles);
     tick();  // esto calculará ℜ para cada partícula, disparará ε si ℜ≥θ y actualizará métricas

4) Si quieres ver un ejemplo completo, abre `src/App_solis_example_patch.tsx`.
   Puedes renombrarlo a App.tsx para probar el HUD sin tocar tu simulación.

Notas
- No agrega dependencias externas.
- ℜ usa similitud coseno (valores en [0,1]).
- Métricas simples incluidas: entropía aproximada, densidad de eventos y #clusters por k-means 1D simplificado.
- El umbral θ se controla con un slider y dispara ε; se registra en EventLog con (t, id, ℜ, L).
# Contenido de README_licencia.md

# BigBang_Final — Simulador del Multiverso

Este repositorio contiene un simulador visual y simbólico del modelo metaontológico trascendental.

## Licencia
- **Código:** Apache-2.0 (ver archivo LICENSE).
- **Documentación/Axiomas:** CC BY-NC-ND 4.0 (ver archivo LICENSE-docs-CC-BY-NC-ND-4.0.md).

© 2025 Alejandro Solís Hernández  
ORCID: 0009-0005-8416-994X
