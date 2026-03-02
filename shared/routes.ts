import { z } from "zod";
import { insertTranscriptSchema, transcripts } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  transcripts: {
    list: {
      method: 'GET' as const,
      path: '/api/transcripts' as const,
      responses: {
        200: z.array(z.custom<typeof transcripts.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/transcripts/:id' as const,
      responses: {
        200: z.custom<typeof transcripts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    createFromUrl: {
      method: 'POST' as const,
      path: '/api/transcripts/url' as const,
      input: z.object({ url: z.string().url() }),
      responses: {
        201: z.custom<typeof transcripts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    // We will use standard multipart form data for file uploads to /api/transcripts/file
    createFromFile: {
        method: 'POST' as const,
        path: '/api/transcripts/file' as const,
        // Using any since frontend sends FormData, not JSON
        responses: {
            201: z.custom<typeof transcripts.$inferSelect>(),
            400: errorSchemas.validation,
        }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/transcripts/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type TranscriptResponse = z.infer<typeof api.transcripts.get.responses[200]>;
export type TranscriptsListResponse = z.infer<typeof api.transcripts.list.responses[200]>;
export type CreateUrlRequest = z.infer<typeof api.transcripts.createFromUrl.input>;
