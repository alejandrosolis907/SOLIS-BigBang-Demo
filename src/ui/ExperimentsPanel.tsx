import React from "react";

type ExperimentsPanelProps = {
  onOpenDoc: () => void;
};

const MAP_ROWS: Array<{ phi: string; lambda: string }> = [
  { phi: "Fluctuaciones cuánticas del vacío", lambda: "Principio de incertidumbre (Heisenberg)" },
  { phi: "Creación/aniquilación de pares partícula–antipartícula", lambda: "Conservación de energía y carga" },
  { phi: "Oscilación de neutrinos", lambda: "Matriz PMNS (mezcla de sabores), masa mínima de neutrinos" },
  { phi: "Reacciones nucleares (fusión, fisión)", lambda: "Fuerza nuclear fuerte y débil, barrera de Coulomb" },
  { phi: "Tunelamiento cuántico", lambda: "Probabilidad cuántica, función de onda, no-clonación" },
  { phi: "Formación de moléculas y enlaces químicos", lambda: "Constante de estructura fina (α), mecánica cuántica molecular" },
  { phi: "Transiciones de fase (sólido–líquido–gas–plasma–BEC)", lambda: "Termodinámica (leyes de conservación, entropía)" },
  { phi: "Actividad volcánica, tectónica y sísmica", lambda: "Física de materiales, gravedad, geodinámica" },
  { phi: "Fenómenos atmosféricos (huracanes, auroras, arcoíris)", lambda: "Termodinámica, electromagnetismo, dinámica de fluidos" },
  { phi: "Mutación y evolución biológica", lambda: "ADN, tasas de mutación, leyes de la selección natural" },
  {
    phi: "Mecanismos del comportamiento humano",
    lambda:
      "Psicología social, teoría de juegos, topología de redes, sesgos cognitivos, límites atencionales, neurobiología del apego (oxitocina/dopamina), normas culturales, privacidad/consentimiento, sesgos, juegos de validación, sistemas de intercambio de valor, economía del comportamiento, límites éticos/legales, fatiga atencional, saturación de estímulos",
  },
  { phi: "Emergencia de conciencia", lambda: "Neurobiología, coherencia cuántica (hipótesis en debate)" },
  { phi: "Muerte y regeneración parcial", lambda: "Límite de reparación celular, entropía biológica" },
  { phi: "Formación de estrellas y planetas", lambda: "Colapso gravitatorio, límite de Jeans" },
  { phi: "Supernovas, hipernovas, kilonovas", lambda: "Límite de Chandrasekhar, TOV" },
  { phi: "Formación de agujeros negros", lambda: "Relatividad general, horizonte de eventos" },
  { phi: "Evaporación de agujeros negros (Hawking)", lambda: "Mecánica cuántica + relatividad (aún no unificada)" },
  { phi: "Colisiones galácticas", lambda: "Gravedad newtoniana/relativista, conservación de momento" },
  { phi: "Ondas gravitacionales", lambda: "Relatividad general, energía gravitacional" },
  { phi: "Expansión cósmica acelerada", lambda: "Constante cosmológica Λ, energía oscura" },
  { phi: "Posible Big Bang e inflaciones", lambda: "Condiciones iniciales del universo, simetrías rotas" },
  { phi: "Posibles universos burbuja", lambda: "Modelos inflacionarios multiverso" },
  { phi: "Lenguaje, cultura, sociedades", lambda: "Neurociencia, evolución cognitiva, dinámica social" },
  { phi: "Ciencia, arte, tecnología", lambda: "Límites de energía y recursos disponibles" },
  { phi: "Computación e inteligencia artificial", lambda: "Teoría de la información, complejidad computacional" },
  { phi: "Guerra y cooperación", lambda: "Psicología, sociología, recursos materiales" },
  { phi: "Colonización espacial", lambda: "Ley de Tsiolkovsky, restricciones energéticas" },
  {
    phi: "Propulsión sin eyección de masa (reactionless)",
    lambda: "Conservación de momento/energía, relatividad especial (→ **no permitido** en sistemas cerrados)",
  },
  {
    phi: "Propulsión con intercambio externo (vela solar/magnética, beam-riding)",
    lambda: "Presupuesto de momento/energía del campo externo, límites de potencia/materiales",
  },
  {
    phi: "Predicción de resultados deportivos",
    lambda: "Estocasticidad del juego, varianza previa, límites de medición (lesiones, moral), overfitting",
  },
  {
    phi: "Efecto del clima en el rendimiento deportivo",
    lambda: "Termodinámica, dinámica de fluidos, límites fisiológicos, intercambio de calor",
  },
  {
    phi: "Mejora de predicción climática via aprendizaje de errores",
    lambda: "Caos determinista, límites de observación/resolución, complejidad computacional",
  },
  {
    phi: "IA meta-aprendizaje para reducir efecto mariposa",
    lambda: "Teoría de control/estabilidad, regularización, límites de identificabilidad",
  },
  {
    phi: "Integración multidominio de Φ→𝓛 (misma fórmula en ámbitos distintos)",
    lambda: "Compatibilidad de unidades/escala, causalidad, validación cruzada, privacidad/ética",
  },
  { phi: "Ingeniería genética y biotecnología", lambda: "Biología molecular, bioética, límites mutacionales" },
  { phi: "Ciborgs y transhumanismo", lambda: "Ingeniería biomédica, integración hombre-máquina" },
  { phi: "Posible contacto extraterrestre", lambda: "Límites de detección (SETI, paradoja de Fermi)" },
  { phi: "Colonización interestelar", lambda: "Relatividad especial (velocidad < c), energía finita" },
];

export function ExperimentsPanel({ onOpenDoc }: ExperimentsPanelProps) {
  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Mapa Φ ∘ 𝓛(x)</h2>
        <p className="text-sm text-slate-400">Sucesos potenciales frente a estructuras limitantes.</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-separate border-spacing-y-1 min-w-[480px]">
          <thead>
            <tr className="text-slate-400">
              <th className="px-3 py-2 w-1/2">Φ — Sucesos y hechos posibles</th>
              <th className="px-3 py-2 w-1/2">𝓛 — Estructuras limitantes</th>
            </tr>
          </thead>
          <tbody>
            {MAP_ROWS.map((row) => (
              <tr key={`${row.phi}-${row.lambda}`} className="bg-slate-900/60 align-top">
                <td className="px-3 py-2 text-slate-200">{row.phi}</td>
                <td className="px-3 py-2 text-slate-200">{row.lambda}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Nota: Propulsión sin eyección de masa no está permitida por conservación del momento (caso de prueba negativo).
      </p>

      <section className="space-y-2 text-sm text-slate-200">
        <h3 className="text-sm font-semibold text-slate-300">Interpretación (Φ, 𝓛, R)</h3>
        <p>
          <strong className="text-slate-100">Φ</strong> representa el abanico de sucesos posibles, desde procesos cuánticos hasta
          fenómenos sociales y tecnológicos.
        </p>
        <p>
          <strong className="text-slate-100">𝓛</strong> describe las leyes, constantes y límites que estructuran o restringen esos
          sucesos, determinando qué potencialidades pueden manifestarse.
        </p>
        <p>
          La realidad <strong className="text-slate-100">R</strong> emerge donde ambas columnas coinciden: cuando un suceso posible
          cumple las condiciones limitantes, se actualiza como evento concreto sin alterar el motor holográfico.
        </p>
      </section>

      <div className="flex justify-end">
        <button
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
          onClick={onOpenDoc}
          type="button"
        >
          Axiomas
        </button>
      </div>
    </section>
  );
}
