# BigBang_Final — Simulador del Multiverso

Este proyecto es un ejemplo mínimo que combina **React**, **Vite**, **Tailwind CSS** y un servidor **Express** para desplegarse en Railway.

## Desarrollo
1. Instala dependencias: `npm install`
2. Entorno de desarrollo: `npm run dev`
3. Compila la aplicación: `npm run build`
4. Inicia el servidor: `npm start`

## Parámetro μ y congruencia con 𝓛
El panel de sensibilidad expone **μ₀**, la fricción ontológica base descrita en el Axioma IX. La fricción efectiva aplicada en cada tic es la suma de esa base más la resistencia estructural inducida por 𝓛: a mayor magnitud de los pesos del kernel 3×3 (o del vector 𝓛 del modelo analítico), mayor es el aporte automático `μ𝓛`.

De esta forma la atenuación de cada tic solo afecta al campo de potenciales Φ, pero crece proporcionalmente con la estructura limitante. 𝓛 permanece fija, aunque el incremento de su intensidad fortalece la fricción total `μΣ = μ₀ + μ𝓛`, reduciendo las métricas de resonancia y la energía visible.

### Alcance de la fricción μ

- `μ` únicamente amortigua las características de las partículas (Φ) durante cada `tick`.
- La lattice 𝓛 no se escala ni se modifica por efecto de `μ`; su intensidad solo contribuye al componente estructural `μ𝓛` que se suma a la fricción efectiva.

## Retroalimentación 𝓡ₐ sobre 𝓛

- El modelo analítico ofrece un control `𝓡ₐ` que regula cómo la realidad manifestada (R) retroajusta la estructura limitante 𝓛.
- Al aumentar `𝓡ₐ`, la lattice se aproxima gradualmente al promedio de las características Φ que generan eventos ε, ponderado por la resonancia y el campo temporal `𝓣`.
- Con `𝓡ₐ = 0` la estructura permanece fija; valores mayores permiten estudiar el Axioma VIII (realidad autoactualizable) sin romper la independencia de la fricción, que sigue actuando únicamente sobre Φ.

## Campo temporal 𝓣

- Cada tic de la simulación registra el estado previo de 𝓛 y de las métricas de R (entropía, densidad y clusters de resonancia).
- `𝓣` se calcula como la derivada discreta ∂R/∂𝓛 ≈ Δ‖R‖ / Δ‖𝓛‖: si la lattice cambia pero las métricas de la realidad apenas lo hacen, `𝓣` se reduce; cuando pequeñas variaciones estructurales producen grandes cambios en R, `𝓣` crece.
- Este valor modulador aparece en la activación de eventos ε y en la retroalimentación `𝓡ₐ`, reforzando el Axioma IV donde el tiempo emerge del ritmo de actualización de R respecto a 𝓛.

## Panel de resultados reproducibles

- Desde el panel lateral puedes ejecutar un barrido automático de parámetros (`depth`, `boundaryNoise`, `kernelMix` y semillas) con más de 30 corridas.
- El botón **Exportar reporte** descarga un CSV con todas las métricas (`R²` frente a perímetro/área, MSE de reconstrucción, varianza de ℜ, promedios de flujo) y una imagen PNG con la comparativa ley de área vs volumen.
- También es posible generar los mismos archivos desde línea de comandos con:
  ```bash
  npx ts-node scripts/run_experiments.ts
  ```
  Los resultados se guardan en `reports/experimentos-<timestamp>.csv` y `.json`.

## Licencias
- El código fuente se distribuye bajo la [Licencia Apache 2.0](LICENSE).
- La documentación y axiomas incluidos en `docs/` se distribuyen bajo la licencia [CC BY-NC-ND 4.0](docs/LICENSE-docs-CC-BY-NC-ND-4.0.md).

## Citación
Si utilizas este trabajo, por favor cita este repositorio siguiendo la información en [CITATION.cff](CITATION.cff).
