import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteDevice, useDevices, useSendDeviceCommand, type Device } from "../api/devices";
import { useDeviceSocket } from "../ws/useDeviceSocket";
import { useAuthStore } from "../store/auth.store";
import AddDeviceForm from "./AddDeviceForm";

export default function Devices() {
  const navigate = useNavigate();
  const { data: devices, isLoading, isError } = useDevices();
  const sendCommand = useSendDeviceCommand();
  const deleteDevice = useDeleteDevice();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  useDeviceSocket();

  function handleLogout() {
    clear();
    navigate("/login");
  }

  function handleDelete(device: Device) {
    if (confirm(`¿Eliminar el dispositivo "${device.name}"?`)) {
      deleteDevice.mutate(device.id);
    }
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
              setEditingDevice(null);
              setShowForm((v) => !v);
            }}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm hover:bg-sky-500"
          >
            {formOpen ? "Cerrar formulario" : "Agregar dispositivo"}
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
          >
            Cerrar sesion
          </button>
        </div>
      </header>

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
        {devices?.map((device) => {
          const isOn = device.state?.state === "on";
          return (
            <div key={device.id} className="rounded-xl bg-slate-900 p-5 shadow">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-medium">{device.name}</h2>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isOn ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
              </div>
              <p className="mb-4 text-xs text-slate-400">
                {device.protocol.toUpperCase()} ·{" "}
                {device.state?.updatedAt
                  ? new Date(device.state.updatedAt).toLocaleString()
                  : "sin datos aun"}
              </p>
              <div className="mb-2 flex gap-2">
                <button
                  disabled={sendCommand.isPending}
                  onClick={() => sendCommand.mutate({ deviceId: device.id, action: "on" })}
                  className="flex-1 rounded-md bg-emerald-600 py-1.5 text-sm hover:bg-emerald-500 disabled:opacity-50"
                >
                  Encender
                </button>
                <button
                  disabled={sendCommand.isPending}
                  onClick={() => sendCommand.mutate({ deviceId: device.id, action: "off" })}
                  className="flex-1 rounded-md bg-slate-700 py-1.5 text-sm hover:bg-slate-600 disabled:opacity-50"
                >
                  Apagar
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingDevice(device);
                  }}
                  className="flex-1 rounded-md bg-slate-800 py-1 text-xs hover:bg-slate-700"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(device)}
                  className="flex-1 rounded-md bg-slate-800 py-1 text-xs text-red-400 hover:bg-slate-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
