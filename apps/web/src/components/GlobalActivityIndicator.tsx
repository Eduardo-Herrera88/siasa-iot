import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import ThinkingIndicator from "./ThinkingIndicator";

/**
 * Insignia del "agente": en espera (animacion lenta, atenuada) cuando no hay nada en curso, y en
 * modo "transmitiendo" (rapido, brillante) mientras hay alguna peticion (query o mutation) activa
 * en cualquier parte de la app. Vive dentro del header sticky, asi queda fija arriba a la derecha
 * al hacer scroll sin arriesgar encimarse con otros controles.
 */
export default function GlobalActivityIndicator() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const busy = fetching + mutating > 0;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-full border py-2 pl-2.5 pr-4 shadow-lg backdrop-blur transition-colors duration-300 ${
        busy
          ? "border-sky-400/50 bg-slate-900/95 shadow-sky-500/20"
          : "border-slate-800 bg-slate-900/80 shadow-black/20"
      }`}
      role="status"
      aria-live="polite"
    >
      <ThinkingIndicator size={34} active={busy} />
      <div className="flex flex-col leading-tight">
        <span className={`text-xs font-semibold ${busy ? "text-sky-300" : "text-slate-400"}`}>
          {busy ? "Transmitiendo..." : "Agente activo"}
        </span>
        <span className="text-[10px] text-slate-500">{busy ? "procesando peticion" : "en tiempo real"}</span>
      </div>
    </div>
  );
}
