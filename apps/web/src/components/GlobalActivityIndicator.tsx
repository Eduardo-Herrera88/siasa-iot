import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import ThinkingIndicator from "./ThinkingIndicator";

/** Aparece en cualquier pantalla mientras hay una peticion en curso (query o mutation) - el "agente" pensando. */
export default function GlobalActivityIndicator() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const busy = fetching + mutating > 0;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-sky-500/30 bg-slate-900/90 py-2 pl-2.5 pr-4 shadow-lg shadow-sky-500/10 backdrop-blur transition-all duration-300 ${
        busy ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <ThinkingIndicator size={22} />
      <span className="text-xs font-medium text-sky-300">Procesando...</span>
    </div>
  );
}
