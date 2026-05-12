"use client";

import { useQuery, useMutation, useQueryClient } from "./client";
import { apiClient } from "./client";
import type { Agent } from "@/store/useAgentStore";

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => apiClient.get("/api/v1/agents"),
    placeholderData: [],
    enabled: false, // Disable until API is ready
  });
}

export function useAgent(id: string) {
  return useQuery<Agent>({
    queryKey: ["agents", id],
    queryFn: () => apiClient.get(`/api/v1/agents/${id}`),
    enabled: !!id && false,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agent: Omit<Agent, "id">) =>
      apiClient.post("/api/v1/agents", agent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Agent> & { id: string }) =>
      apiClient.patch(`/api/v1/agents/${id}`, updates),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agents", vars.id] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/agents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useAgentLogs(agentId: string) {
  return useQuery({
    queryKey: ["agents", agentId, "logs"],
    queryFn: () => apiClient.get(`/api/v1/agents/${agentId}/logs`),
    enabled: !!agentId && false,
    refetchInterval: 5000,
  });
}
