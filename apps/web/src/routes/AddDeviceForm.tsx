import { FormEvent, useState } from "react";
import { useCreateDevice, type CreateDevicePayload, type HttpMethod } from "../api/devices";

const inputClass =
  "w-full rounded-md bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500";
const labelClass = "mb-1 block text-xs text-slate-400";

export default function AddDeviceForm({ onDone }: { onDone: () => void }) {
  const createDevice = useCreateDevice();
  const [protocol, setProtocol] = useState<"mqtt" | "http">("mqtt");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [payloadOn, setPayloadOn] = useState("ON");
  const [payloadOff, setPayloadOff] = useState("OFF");

  // mqtt
  const [commandTopic, setCommandTopic] = useState("");
  const [stateTopic, setStateTopic] = useState("");

  // http
  const [httpBaseUrl, setHttpBaseUrl] = useState("");
  const [onMethod, setOnMethod] = useState<HttpMethod>("GET");
  const [onPath, setOnPath] = useState("");
  const [offMethod, setOffMethod] = useState<HttpMethod>("GET");
  const [offPath, setOffPath] = useState("");
  const [stateMethod, setStateMethod] = useState<HttpMethod>("GET");
  const [statePath, setStatePath] = useState("");
  const [pollIntervalMs, setPollIntervalMs] = useState("5000");
  const [stateJsonPath, setStateJsonPath] = useState("");
  const [headersJson, setHeadersJson] = useState("");
  const [onBodyJson, setOnBodyJson] = useState("");
  const [offBodyJson, setOffBodyJson] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payload: CreateDevicePayload = {
      name,
      protocol,
      payloadOn: payloadOn || undefined,
      payloadOff: payloadOff || undefined,
    };

    if (protocol === "mqtt") {
      payload.commandTopic = commandTopic || undefined;
      payload.stateTopic = stateTopic || undefined;
    } else {
      if (!httpBaseUrl || !onPath || !offPath) {
        setError("URL base, ruta de encendido y ruta de apagado son obligatorias para HTTP.");
        return;
      }

      let headers: Record<string, string> | undefined;
      let onBody: unknown;
      let offBody: unknown;
      try {
        headers = headersJson.trim() ? JSON.parse(headersJson) : undefined;
        onBody = onBodyJson.trim() ? JSON.parse(onBodyJson) : undefined;
        offBody = offBodyJson.trim() ? JSON.parse(offBodyJson) : undefined;
      } catch {
        setError('Encabezados o cuerpo con JSON invalido. Ejemplo: {"Authorization": "Bearer ..."}');
        return;
      }

      payload.httpBaseUrl = httpBaseUrl;
      payload.httpConfig = {
        on: { method: onMethod, path: onPath, headers, body: onBody },
        off: { method: offMethod, path: offPath, headers, body: offBody },
        ...(statePath
          ? {
              state: { method: stateMethod, path: statePath, headers },
              pollIntervalMs: Number(pollIntervalMs) || 5000,
              stateJsonPath: stateJsonPath || undefined,
            }
          : {}),
      };
    }

    try {
      await createDevice.mutateAsync(payload);
      onDone();
    } catch (err) {
      setError("No se pudo crear el dispositivo. Revisa los datos e intenta de nuevo.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl bg-slate-900 p-5 shadow">
      <h2 className="mb-4 font-medium">Agregar dispositivo</h2>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Protocolo</label>
          <select
            className={inputClass}
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as "mqtt" | "http")}
          >
            <option value="mqtt">MQTT</option>
            <option value="http">HTTP (Tasmota, Shelly, ESPHome, REST...)</option>
          </select>
        </div>
      </div>

      {protocol === "mqtt" ? (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Topic de comando</label>
            <input
              className={inputClass}
              placeholder="home/lampara/set"
              value={commandTopic}
              onChange={(e) => setCommandTopic(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Topic de estado</label>
            <input
              className={inputClass}
              placeholder="home/lampara/state"
              value={stateTopic}
              onChange={(e) => setStateTopic(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Payload "encendido"</label>
            <input className={inputClass} value={payloadOn} onChange={(e) => setPayloadOn(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Payload "apagado"</label>
            <input className={inputClass} value={payloadOff} onChange={(e) => setPayloadOff(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="mb-4 space-y-4">
          <div>
            <label className={labelClass}>URL base</label>
            <input
              className={inputClass}
              placeholder="http://10.0.0.50"
              value={httpBaseUrl}
              onChange={(e) => setHttpBaseUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex gap-2">
              <select className={inputClass} value={onMethod} onChange={(e) => setOnMethod(e.target.value as HttpMethod)}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
              <input
                className={inputClass}
                placeholder="/cm?cmnd=Power%20On o /api/services/switch/turn_on"
                value={onPath}
                onChange={(e) => setOnPath(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select className={inputClass} value={offMethod} onChange={(e) => setOffMethod(e.target.value as HttpMethod)}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
              <input
                className={inputClass}
                placeholder="/cm?cmnd=Power%20Off o /api/services/switch/turn_off"
                value={offPath}
                onChange={(e) => setOffPath(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Cuerpo JSON al encender (opcional, ej. {"{"}"entity_id": "switch.xxx"{"}"})</label>
              <input className={inputClass} value={onBodyJson} onChange={(e) => setOnBodyJson(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Cuerpo JSON al apagar (opcional)</label>
              <input className={inputClass} value={offBodyJson} onChange={(e) => setOffBodyJson(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Encabezados HTTP compartidos (JSON, opcional) - ej. para un token: {"{"}"Authorization": "Bearer ..."{"}"}
            </label>
            <input
              className={inputClass}
              placeholder='{"Authorization": "Bearer ..."}'
              value={headersJson}
              onChange={(e) => setHeadersJson(e.target.value)}
            />
          </div>

          <p className="text-xs text-slate-500">Lectura de estado (opcional, para reflejar cambios en tiempo real):</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex gap-2">
              <select
                className={inputClass}
                value={stateMethod}
                onChange={(e) => setStateMethod(e.target.value as HttpMethod)}
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
              <input
                className={inputClass}
                placeholder="/cm?cmnd=Power"
                value={statePath}
                onChange={(e) => setStatePath(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Cada cuanto leer (ms)</label>
              <input
                className={inputClass}
                type="number"
                value={pollIntervalMs}
                onChange={(e) => setPollIntervalMs(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Campo JSON con el estado (ej. "POWER")</label>
              <input className={inputClass} value={stateJsonPath} onChange={(e) => setStateJsonPath(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Payload "encendido" / "apagado"</label>
              <div className="flex gap-2">
                <input className={inputClass} value={payloadOn} onChange={(e) => setPayloadOn(e.target.value)} />
                <input className={inputClass} value={payloadOff} onChange={(e) => setPayloadOff(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={createDevice.isPending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
        >
          {createDevice.isPending ? "Guardando..." : "Guardar dispositivo"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
