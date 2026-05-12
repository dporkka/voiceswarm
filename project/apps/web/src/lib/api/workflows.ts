"use client";

import { useQuery, useMutation, useQueryClient } from "./client";
import { apiClient } from "./client";
import type { Workflow } from "@/store/useWorkflowStore";

export function useWorkflows() {
  return useQuery<Workflow[]>({
    queryKey: ["workflows"],
    queryFn: () => apiClient.get("/api/v1/workflows"),
    enabled: false,
  });
}

export function useWorkflow(id: string) {
  return useQuery<Workflow>({
    queryKey: ["workflows", id],
    queryFn: () => apiClient.get(`/api/v1/workflows/${id}`),
    enabled: !!id && false,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workflow: Omit<Workflow, "id">) =>
      apiClient.post("/api/v1/workflows", workflow),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });
}

export function useRunWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/api/v1/workflows/${id}/run`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });
}

export function useStopWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/api/v1/workflows/${id}/stop`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });
}
