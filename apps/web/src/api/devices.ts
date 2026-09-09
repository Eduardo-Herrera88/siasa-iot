import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface DeviceState {
  state: string;
  rawPayload: string | null;
  updatedAt: string;
}

export type HttpMethod = "GET" | "POST" | "PUT";

export interface HttpActionTemplate {
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface HttpDeviceConfig {
  on: HttpActionTemplate;
  off: HttpActionTemplate;
  state?: HttpActionTemplate;
  pollIntervalMs?: number;
  stateJsonPath?: string;
}

export interface Device {
  id: string;
  name: string;
  protocol: "mqtt" | "http";
  commandTopic: string | null;
  stateTopic: string | null;
  httpBaseUrl: string | null;
  payloadOn: string;
  payloadOff: string;
  metadata: { http?: HttpDeviceConfig } | null;
  state: DeviceState | null;
}

export interface CreateDevicePayload {
  name: string;
  protocol: "mqtt" | "http";
  payloadOn?: string;
  payloadOff?: string;
  commandTopic?: string;
  stateTopic?: string;
  httpBaseUrl?: string;
  httpConfig?: HttpDeviceConfig;
}

export type UpdateDevicePayload = Partial<CreateDevicePayload>;

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data } = await apiClient.get<Device[]>("/devices");
      return data;
    },
    refetchInterval: 15_000,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDevicePayload) => {
      const { data } = await apiClient.post<Device>("/devices", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateDevicePayload }) => {
      const { data } = await apiClient.patch<Device>(`/devices/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useSendDeviceCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deviceId, action }: { deviceId: string; action: "on" | "off" }) => {
      const { data } = await apiClient.post(`/devices/${deviceId}/command`, { action });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
