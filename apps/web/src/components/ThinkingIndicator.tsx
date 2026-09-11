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
 */
export default function ThinkingIndicator({ size = 28 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="relative shrink-0" aria-hidden="true">
      <div
        className="absolute inset-0 rounded-full bg-sky-500/50 blur-md"
        style={{ animation: "ti-glow 2s ease-in-out infinite" }}
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
              strokeOpacity={0.3}
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
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="5 5"
            style={{ animation: "ti-flow 1s linear infinite", animationDelay: `${i * 0.1}s` }}
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
              animation: "ti-node-pulse 1.4s ease-in-out infinite",
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
          fill="#0ea5e9"
          style={{ animation: "ti-core-pulse 1.4s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "center" }}
        />
      </svg>
    </div>
  );
}
