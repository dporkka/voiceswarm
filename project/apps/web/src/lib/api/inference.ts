"use client";

import { useQuery, useMutation } from "./client";
import { apiClient } from "./client";

export interface InferenceRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface InferenceResponse {
  id: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  latency: number;
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: () => apiClient.get("/api/v1/inference/models"),
    enabled: false,
  });
}

export function useInference() {
  return useMutation({
    mutationFn: (request: InferenceRequest) =>
      apiClient.post<InferenceResponse>("/api/v1/inference/chat", request),
  });
}

export function useStreamingInference() {
  return useMutation({
    mutationFn: async (request: InferenceRequest) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/inference/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, stream: true }),
        }
      );
      return response.body;
    },
  });
}
