import { FormEvent, useMemo, useState } from "react";
import { useDiscoverHomeAssistant, useImportHomeAssistant, type HomeAssistantEntity } from "../api/devices";

const inputClass =
  "w-full rounded-md bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500";
const labelClass = "mb-1 block text-xs text-slate-400";

/** Conecta una vez con la API de Home Assistant, lista sus entidades controlables y las importa como dispositivos HTTP. */
export default function ImportHomeAssistant({ onDone }: { onDone: () => void }) {
  const discover = useDiscoverHomeAssistant();
  const importDevices = useImportHomeAssistant();

  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [entities, setEntities] = useState<HomeAssistantEntity[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  const filtered = useMemo(() => {
    if (!entities) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter((e) => e.name.toLowerCase().includes(q) || e.entityId.toLowerCase().includes(q));
  }, [entities, filter]);

  async function handleDiscover(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    try {
      const found = await discover.mutateAsync({ baseUrl, token });
      setEntities(found);
      setSelected(new Set());
    } catch {
      setError("No se pudo conectar. Revisa la URL base y el token de Home Assistant.");
    }
  }

  function toggle(entityId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((e) => next.add(e.entityId));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleImport() {
    if (!entities) return;
    setError(null);
    const toImport = entities
      .filter((e) => selected.has(e.entityId))
      .map((e) => ({ entityId: e.entityId, name: e.name.trim() || e.entityId }));

    try {
      const res = await importDevices.mutateAsync({ baseUrl, token, entities: toImport });
      setResult({ created: res.created.length, failed: res.failed.length });
      if (res.failed.length === 0) {
        setTimeout(onDone, 1200);
      }
    } catch {
      setError("Fallo la importacion. Intenta de nuevo.");
    }
  }

  return (
    <div className="mb-6 rounded-xl bg-slate-900 p-5 shadow">
      <h2 className="mb-4 font-medium">Importar dispositivos desde Home Assistant</h2>

      <form onSubmit={handleDiscover} className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className={labelClass}>URL base de Home Assistant</label>
          <input
            className={inputClass}
            placeholder="http://10.3.0.25:8123"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Token de acceso de larga duracion</label>
          <input
            className={inputClass}
            type="password"
            placeholder="eyJhbGciOi..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={discover.isPending}
            className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50 sm:w-auto"
          >
            {discover.isPending ? "Buscando..." : "Buscar dispositivos"}
          </button>
        </div>
      </form>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {result && (
        <p className="mb-3 text-sm text-emerald-400">
          Importados {result.created} dispositivo(s){result.failed > 0 ? `, ${result.failed} fallaron` : ""}.
        </p>
      )}

      {entities && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Filtrar por nombre..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button
              type="button"
              onClick={selectAllFiltered}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700"
            >
              Seleccionar {filter ? "filtrados" : "todos"} ({filtered.length})
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700"
            >
              Limpiar seleccion
            </button>
            <span className="text-xs text-slate-400">{selected.size} seleccionado(s) de {entities.length}</span>
          </div>

          <div className="mb-4 max-h-80 overflow-y-auto rounded-md border border-slate-800">
            {filtered.map((entity) => (
              <label
                key={entity.entityId}
                className="flex cursor-pointer items-center justify-between gap-2 border-b border-slate-800 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-800/50"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(entity.entityId)}
                    onChange={() => toggle(entity.entityId)}
                  />
                  <span>{entity.name}</span>
                  <span className="text-xs text-slate-500">{entity.entityId}</span>
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    entity.state === "on"
                      ? "bg-emerald-400"
                      : entity.state === "unavailable"
                        ? "bg-slate-700"
                        : "bg-slate-600"
                  }`}
                  title={entity.state}
                />
              </label>
            ))}
            {filtered.length === 0 && <p className="p-3 text-sm text-slate-500">Sin resultados.</p>}
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={selected.size === 0 || importDevices.isPending}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {importDevices.isPending ? "Importando..." : `Importar seleccionados (${selected.size})`}
          </button>
        </>
      )}

      <div className="mt-4">
        <button type="button" onClick={onDone} className="rounded-md bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700">
          Cerrar
        </button>
      </div>
    </div>
  );
}
