import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000/ws";

interface DeviceStateMessage {
  type: "device.state";
  deviceId: string;
  state: string;
  rawPayload?: string;
}

/** Se conecta al WebSocket del backend y refresca la cache de dispositivos cuando llega un cambio de estado. */
export function useDeviceSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(accessToken)}`);

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as DeviceStateMessage;
        if (message.type === "device.state") {
          queryClient.invalidateQueries({ queryKey: ["devices"] });
        }
      } catch {
        // mensaje no reconocido, se ignora
      }
    };

    return () => socket.close();
  }, [accessToken, queryClient]);
}
