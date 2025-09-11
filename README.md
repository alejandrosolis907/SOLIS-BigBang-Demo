# BigBang_Final — Simulador del Multiverso

Este proyecto es un ejemplo mínimo que combina **React**, **Vite**, **Tailwind CSS** y un servidor **Express** para desplegarse en Railway.

## Desarrollo
1. Instala dependencias: `npm install`
2. Entorno de desarrollo: `npm run dev`
3. Compila la aplicación: `npm run build`
4. Inicia el servidor: `npm start`

## Modo SOLIS
La interfaz permite cambiar entre el modo original **BigBang** y **SOLIS** desde el selector de modo.
En SOLIS se expone telemetría basada en los axiomas metaontológicos (v1.9.9.9.X): Φ, 𝓛(x), ℜ, ε y 𝓣.
La derivada funcional del tiempo se aproxima como `𝓣 ≈ ΔR/Δ𝓛(x)` utilizando diferencias discretas entre pasos.

### Exports
- **PNG**: `Exportar captura` guarda el canvas actual `R`.
- **Excel (.xlsx)**: `exportExcel()` genera hojas `R_series`, `Lx_params`, `Phi_seed`, `Res_events` y `Meta` con el mapeo SOLIS.

## Licencias
- El código fuente se distribuye bajo la [Licencia Apache 2.0](LICENSE).
- La documentación y los axiomas "Axiomas del Modelo Metaontológico Trascendental – Arquitectura Teórica hacia una Teoría del Todo" se distribuyen bajo la licencia [CC BY-NC-ND 4.0](docs/LICENSE-docs-CC-BY-NC-ND-4.0.md).

## Citación
Si utilizas este trabajo, por favor cita este repositorio siguiendo la información en [CITATION.cff](CITATION.cff).
