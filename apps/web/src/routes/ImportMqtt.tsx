import { FormEvent, useMemo, useState } from "react";
import { useDiscoverZigbee2Mqtt, useImportZigbee2Mqtt, type ZigbeeEntity } from "../api/devices";
import { extractErrorMessage } from "../api/errors";
import ThinkingIndicator from "../components/ThinkingIndicator";

const inputClass =
  "w-full rounded-md bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500";
const labelClass = "mb-1 block text-xs text-slate-400";

/**
 * Conecta directo a un broker MQTT (Zigbee2MQTT u otro puente compatible) sin pasar por Home
 * Assistant, lista sus dispositivos y los importa. Deja los campos de broker vacios para usar
 * el broker ya configurado en el servidor (MQTT_URL).
 */
export default function ImportMqtt({ onDone }: { onDone: () => void }) {
  const discover = useDiscoverZigbee2Mqtt();
  const importDevices = useImportZigbee2Mqtt();

  const [brokerUrl, setBrokerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseTopic, setBaseTopic] = useState("zigbee2mqtt");
  const [entities, setEntities] = useState<ZigbeeEntity[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  const brokerParams = { brokerUrl: brokerUrl || undefined, username: username || undefined, password: password || undefined, baseTopic: baseTopic || undefined };

  const filtered = useMemo(() => {
    if (!entities) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter(
      (e) => e.name.toLowerCase().includes(q) || e.friendlyName.toLowerCase().includes(q),
    );
  }, [entities, filter]);

  async function handleDiscover(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    try {
      const found = await discover.mutateAsync(brokerParams);
      setEntities(found);
      setSelected(new Set());
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  function toggle(friendlyName: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(friendlyName)) next.delete(friendlyName);
      else next.add(friendlyName);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((e) => next.add(e.friendlyName));
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
      .filter((e) => selected.has(e.friendlyName))
      .map((e) => ({ friendlyName: e.friendlyName, name: e.name.trim() || e.friendlyName }));

    try {
      const res = await importDevices.mutateAsync({ ...brokerParams, entities: toImport });
      setResult({ created: res.created.length, failed: res.failed.length });
      if (res.failed.length === 0) {
        setTimeout(onDone, 1200);
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Fallo la importacion. Intenta de nuevo."));
    }
  }

  return (
    <div className="mb-6 rounded-xl bg-slate-900 p-5 shadow">
      <h2 className="mb-1 font-medium">Importar dispositivos por MQTT (Zigbee2MQTT)</h2>
      <p className="mb-4 text-xs text-slate-500">
        Habla directo con tu broker MQTT, sin pasar por Home Assistant. Deja los campos de broker vacios para
        usar el que ya esta configurado en el servidor.
      </p>

      <form onSubmit={handleDiscover} className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>URL del broker (opcional)</label>
          <input
            className={inputClass}
            placeholder="mqtt://10.3.0.25:1883"
            value={brokerUrl}
            onChange={(e) => setBrokerUrl(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Prefijo de topics</label>
          <input className={inputClass} value={baseTopic} onChange={(e) => setBaseTopic(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Usuario (opcional)</label>
          <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Contraseña (opcional)</label>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={discover.isPending}
            className="flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
          >
            {discover.isPending && <ThinkingIndicator size={16} />}
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
            <span className="text-xs text-slate-400">
              {selected.size} seleccionado(s) de {entities.length}
            </span>
          </div>

          <div className="mb-4 max-h-80 overflow-y-auto rounded-md border border-slate-800">
            {filtered.map((entity) => (
              <label
                key={entity.friendlyName}
                className="flex cursor-pointer items-center justify-between gap-2 border-b border-slate-800 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-800/50"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(entity.friendlyName)}
                    onChange={() => toggle(entity.friendlyName)}
                  />
                  <span>{entity.name}</span>
                  {entity.model && <span className="text-xs text-slate-500">{entity.model}</span>}
                </span>
              </label>
            ))}
            {filtered.length === 0 && <p className="p-3 text-sm text-slate-500">Sin resultados.</p>}
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={selected.size === 0 || importDevices.isPending}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {importDevices.isPending && <ThinkingIndicator size={16} />}
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
