import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteDevice, useDevices, useSendDeviceCommand, type Device } from "../api/devices";
import { useDeviceSocket } from "../ws/useDeviceSocket";
import { useAuthStore } from "../store/auth.store";
import AddDeviceForm from "./AddDeviceForm";
import ImportHomeAssistant from "./ImportHomeAssistant";
import ToggleSwitch from "../components/ToggleSwitch";

function DeviceRow({
  device,
  onToggle,
  onEdit,
  onDelete,
  pending,
}: {
  device: Device;
  onToggle: (device: Device, next: boolean) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  pending: boolean;
}) {
  const isOn = device.state?.state === "on";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${isOn ? "bg-emerald-400" : "bg-slate-600"}`} />
        <span className="truncate text-sm">{device.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <ToggleSwitch checked={isOn} disabled={pending} onChange={(next) => onToggle(device, next)} />
        <button onClick={() => onEdit(device)} className="text-xs text-slate-500 hover:text-slate-300" title="Editar">
          ✎
        </button>
        <button onClick={() => onDelete(device)} className="text-xs text-slate-500 hover:text-red-400" title="Eliminar">
          ✕
        </button>
      </div>
    </div>
  );
}

export default function Devices() {
  const navigate = useNavigate();
  const { data: devices, isLoading, isError } = useDevices();
  const sendCommand = useSendDeviceCommand();
  const deleteDevice = useDeleteDevice();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  useDeviceSocket();

  const { groups, singles } = useMemo(() => {
    const groups = new Map<string, Device[]>();
    const singles: Device[] = [];
    for (const device of devices ?? []) {
      const key = device.metadata?.group?.key;
      if (key) {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(device);
      } else {
        singles.push(device);
      }
    }
    return { groups, singles };
  }, [devices]);

  function handleLogout() {
    clear();
    navigate("/login");
  }

  function handleDelete(device: Device) {
    if (confirm(`¿Eliminar el dispositivo "${device.name}"?`)) {
      deleteDevice.mutate(device.id);
    }
  }

  function handleToggle(device: Device, next: boolean) {
    sendCommand.mutate({ deviceId: device.id, action: next ? "on" : "off" });
  }

  function handleEdit(device: Device) {
    setShowForm(false);
    setShowImport(false);
    setEditingDevice(device);
  }

  const formOpen = showForm || editingDevice !== null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dispositivos</h1>
          <p className="text-sm text-slate-400">
            {user?.username} · {user?.role}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowImport(false);
              setEditingDevice(null);
              setShowForm((v) => !v);
            }}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm hover:bg-sky-500"
          >
            {formOpen ? "Cerrar formulario" : "Agregar dispositivo"}
          </button>
          <button
            onClick={() => {
              setShowForm(false);
              setEditingDevice(null);
              setShowImport((v) => !v);
            }}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-600"
          >
            {showImport ? "Cerrar importador" : "Importar desde Home Assistant"}
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
          >
            Cerrar sesion
          </button>
        </div>
      </header>

      {showImport && <ImportHomeAssistant onDone={() => setShowImport(false)} />}

      {formOpen && (
        <AddDeviceForm
          key={editingDevice?.id ?? "new"}
          device={editingDevice ?? undefined}
          onDone={() => {
            setShowForm(false);
            setEditingDevice(null);
          }}
        />
      )}

      {isLoading && <p className="text-slate-400">Cargando...</p>}
      {isError && <p className="text-red-400">No se pudieron cargar los dispositivos.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...groups.entries()].map(([key, members]) => {
          const title = members[0].metadata?.group?.label || members[0].name;
          return (
            <div key={key} className="rounded-xl bg-slate-900 p-5 shadow">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium">{title}</h2>
                <span className="text-xs text-slate-500">{members[0].protocol.toUpperCase()}</span>
              </div>
              <div>
                {members.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    pending={sendCommand.isPending}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {singles.map((device) => (
          <div key={device.id} className="rounded-xl bg-slate-900 p-5 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">{device.name}</h2>
              <span className="text-xs text-slate-500">
                {device.protocol.toUpperCase()} ·{" "}
                {device.state?.updatedAt ? new Date(device.state.updatedAt).toLocaleTimeString() : "sin datos"}
              </span>
            </div>
            <DeviceRow
              device={device}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              pending={sendCommand.isPending}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
