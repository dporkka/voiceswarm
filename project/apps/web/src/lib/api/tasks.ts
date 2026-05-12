"use client";

import { useQuery, useMutation, useQueryClient } from "./client";
import { apiClient } from "./client";
import type { Task, TaskStatus } from "@/store/useTaskStore";

export function useTasks(status?: TaskStatus) {
  return useQuery<Task[]>({
    queryKey: ["tasks", { status }],
    queryFn: () => {
      const params = status ? `?status=${status}` : "";
      return apiClient.get(`/api/v1/tasks${params}`);
    },
    enabled: false,
  });
}

export function useTask(id: string) {
  return useQuery<Task>({
    queryKey: ["tasks", id],
    queryFn: () => apiClient.get(`/api/v1/tasks/${id}`),
    enabled: !!id && false,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Omit<Task, "id">) =>
      apiClient.post("/api/v1/tasks", task),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      apiClient.patch(`/api/v1/tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
