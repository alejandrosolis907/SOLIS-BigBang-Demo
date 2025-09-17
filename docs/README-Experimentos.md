# Experimentos reproducibles del modelo Φ ∘ 𝓛(x)

## Introducción
Este documento detalla cómo ejecutar y comprender los experimentos reproducibles del simulador **BigBang_Final**. Resume la manera en la que el flujo de sucesos potenciales Φ es filtrado por las estructuras limitantes 𝓛 para generar realidades manifestadas R, siguiendo los axiomas del modelo metaontológico Φ ∘ 𝓛(x). La información aquí descrita amplía el README principal con contexto conceptual y no introduce cambios en el código ejecutable del proyecto.

## Cómo ejecutar los experimentos (resumen técnico)
Ejecuta los barridos automatizados de parámetros mediante:

```bash
npx ts-node scripts/run_experiments.ts
```

El comando crea reportes en `reports/experimentos-<timestamp>.csv` y `reports/experimentos-<timestamp>.json`, que incluyen métricas como \(R^2\) frente a perímetro/área, MSE de reconstrucción, varianzas de ℜ y promedios de flujo holográfico.

## Mapa de Φ ∘ 𝓛(x) – Sucesos vs Limitantes
| Sucesos y hechos posibles (Φ) | Estructuras limitantes (𝓛) |
|--------------------------------|-----------------------------|
| Fluctuaciones cuánticas del vacío | Principio de incertidumbre (Heisenberg) |
| Creación/aniquilación de pares partícula–antipartícula | Conservación de energía y carga |
| Oscilación de neutrinos | Matriz PMNS (mezcla de sabores), masa mínima de neutrinos |
| Reacciones nucleares (fusión, fisión) | Fuerza nuclear fuerte y débil, barrera de Coulomb |
| Tunelamiento cuántico | Probabilidad cuántica, función de onda, no-clonación |
| Formación de moléculas y enlaces químicos | Constante de estructura fina (α), mecánica cuántica molecular |
| Transiciones de fase (sólido–líquido–gas–plasma–BEC) | Termodinámica (leyes de conservación, entropía) |
| Actividad volcánica, tectónica y sísmica | Física de materiales, gravedad, geodinámica |
| Fenómenos atmosféricos (huracanes, auroras, arcoíris) | Termodinámica, electromagnetismo, dinámica de fluidos |
| Mutación y evolución biológica | ADN, tasas de mutación, leyes de la selección natural |
| Emergencia de conciencia | Neurobiología, coherencia cuántica (hipótesis en debate) |
| Muerte y regeneración parcial | Límite de reparación celular, entropía biológica |
| Formación de estrellas y planetas | Colapso gravitatorio, límite de Jeans |
| Supernovas, hipernovas, kilonovas | Límite de Chandrasekhar, TOV |
| Formación de agujeros negros | Relatividad general, horizonte de eventos |
| Evaporación de agujeros negros (Hawking) | Mecánica cuántica + relatividad (aún no unificada) |
| Colisiones galácticas | Gravedad newtoniana/relativista, conservación de momento |
| Ondas gravitacionales | Relatividad general, energía gravitacional |
| Expansión cósmica acelerada | Constante cosmológica Λ, energía oscura |
| Posible Big Bang e inflaciones | Condiciones iniciales del universo, simetrías rotas |
| Posibles universos burbuja | Modelos inflacionarios multiverso |
| Lenguaje, cultura, sociedades | Neurociencia, evolución cognitiva, dinámica social |
| Ciencia, arte, tecnología | Límites de energía y recursos disponibles |
| Computación e inteligencia artificial | Teoría de la información, complejidad computacional |
| Guerra y cooperación | Psicología, sociología, recursos materiales |
| Colonización espacial | Ley de Tsiolkovsky, restricciones energéticas |
| Ingeniería genética y biotecnología | Biología molecular, bioética, límites mutacionales |
| Ciborgs y transhumanismo | Ingeniería biomédica, integración hombre-máquina |
| Posible contacto extraterrestre | Límites de detección (SETI, paradoja de Fermi) |
| Colonización interestelar | Relatividad especial (velocidad < c), energía finita |

## Interpretación
- **Φ (columna izquierda)** representa el abanico de sucesos posibles en el cosmos, desde procesos cuánticos hasta fenómenos sociales y tecnológicos.
- **𝓛 (columna derecha)** describe las leyes, constantes y límites que estructuran o restringen esos sucesos, determinando qué potencialidades pueden manifestarse.
- La realidad **R** surge como la intersección de ambos dominios: cuando un suceso posible cumple las condiciones limitantes, se actualiza como evento concreto.
- Este marco es conceptual y no modifica el motor holográfico ni las rutinas de simulación.

## Notas finales
- La documentación de este archivo no altera el comportamiento de la aplicación ni introduce dependencias adicionales.
- Para instrucciones generales del proyecto y enlaces adicionales, vuelve al [README principal](../README.md).
