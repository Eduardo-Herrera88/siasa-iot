const OUTER_NODES = [
  { x: 50, y: 14 },
  { x: 83, y: 50 },
  { x: 50, y: 86 },
  { x: 17, y: 50 },
];
const CENTER = { x: 50, y: 50 };

/**
 * Animacion de "agente pensando": nodos conectados con lineas que fluyen, tipo red neuronal /
 * diagrama de flujo, con un nucleo central pulsante. Puramente CSS/SVG, sin dependencias nuevas.
 * `active` cambia el ritmo/intensidad: en espera (ambiental, lento) vs transmitiendo (rapido, brillante).
 */
export default function ThinkingIndicator({ size = 28, active = false }: { size?: number; active?: boolean }) {
  const nodeDuration = active ? "0.8s" : "2.4s";
  const flowDuration = active ? "0.5s" : "1.8s";
  const coreDuration = active ? "0.8s" : "2.4s";
  const glowDuration = active ? "1.1s" : "3s";
  const baseOpacity = active ? 1 : 0.55;

  return (
    <div
      style={{ width: size, height: size, opacity: baseOpacity }}
      className="relative shrink-0 transition-opacity duration-500"
      aria-hidden="true"
    >
      <div
        className={`absolute inset-0 rounded-full blur-md ${active ? "bg-sky-400/60" : "bg-sky-500/30"}`}
        style={{ animation: `ti-glow ${glowDuration} ease-in-out infinite` }}
      />
      <svg viewBox="0 0 100 100" className="relative h-full w-full">
        <defs>
          <linearGradient id="ti-line-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        {OUTER_NODES.map((n, i) => {
          const next = OUTER_NODES[(i + 1) % OUTER_NODES.length];
          return (
            <line
              key={`ring-${i}`}
              x1={n.x}
              y1={n.y}
              x2={next.x}
              y2={next.y}
              stroke="#38bdf8"
              strokeOpacity={active ? 0.4 : 0.2}
              strokeWidth={1.5}
            />
          );
        })}

        {OUTER_NODES.map((n, i) => (
          <line
            key={`spoke-${i}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={n.x}
            y2={n.y}
            stroke="url(#ti-line-gradient)"
            strokeWidth={active ? 3 : 2}
            strokeLinecap="round"
            strokeDasharray="5 5"
            style={{ animation: `ti-flow ${flowDuration} linear infinite`, animationDelay: `${i * 0.1}s` }}
          />
        ))}

        {OUTER_NODES.map((n, i) => (
          <circle
            key={`node-${i}`}
            cx={n.x}
            cy={n.y}
            r={5}
            fill="#38bdf8"
            style={{
              animation: `ti-node-pulse ${nodeDuration} ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
              transformBox: "fill-box",
              transformOrigin: "center",
            }}
          />
        ))}

        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={8}
          fill={active ? "#0ea5e9" : "#0369a1"}
          style={{
            animation: `ti-core-pulse ${coreDuration} ease-in-out infinite`,
            transformBox: "fill-box",
            transformOrigin: "center",
          }}
        />
      </svg>
    </div>
  );
}
