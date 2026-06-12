import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateUrlRequest, type TranscriptResponse } from "@shared/routes";

function parseWithLogging<T>(schema: any, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useTranscripts() {
  return useQuery({
    queryKey: [api.transcripts.list.path],
    queryFn: async () => {
      const res = await fetch(api.transcripts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transcripts");
      const data = await res.json();
      return parseWithLogging<TranscriptResponse[]>(api.transcripts.list.responses[200], data, "transcripts.list");
    },
  });
}

export function useTranscript(id: number) {
  return useQuery({
    queryKey: [api.transcripts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.transcripts.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch transcript");
      const data = await res.json();
      return data as TranscriptResponse;
    },
    enabled: id > 0,
    staleTime: 0,
    retry: 3,
    // Keep polling as long as there's no data yet OR status is still processing.
    refetchInterval: (query) => {
      const data = query.state.data as TranscriptResponse | null | undefined;
      if (!data) return 3000;
      const { status } = data;
      return status === "pending" || status === "processing" ? 3000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

export function useCreateFromUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUrlRequest) => {
      const res = await fetch(api.transcripts.createFromUrl.path, {
        method: api.transcripts.createFromUrl.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to start transcription");
      }
      return await res.json() as TranscriptResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transcripts.list.path] });
    },
  });
}

export function useCreateFromFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, language }: { file: File; language?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (language && language !== "auto") {
        formData.append("language", language);
      }

      const res = await fetch(api.transcripts.createFromFile.path, {
        method: api.transcripts.createFromFile.method,
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload file");
      }
      return await res.json() as TranscriptResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transcripts.list.path] });
    },
  });
}

export function useDeleteTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.transcripts.delete.path, { id });
      const res = await fetch(url, {
        method: api.transcripts.delete.method,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete transcript");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transcripts.list.path] });
    },
  });
}
