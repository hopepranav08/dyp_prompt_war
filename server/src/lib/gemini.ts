import { GoogleGenAI, type Part, type Tool } from '@google/genai';
import { z } from 'zod';
import { languageInstruction, type Lang } from '../lang.js';
import type { LatLng } from './geo.js';
import { isTransientStatus, withRetry, withTimeout } from './retry.js';

export type GroundingTool = 'maps' | 'search';

export interface GroundingSource {
  title: string;
  uri: string;
  placeId?: string;
  kind: 'maps' | 'web';
}

export interface JsonRequest<T> {
  system: string;
  parts: Part[];
  schema: z.ZodType<T>;
  tools?: GroundingTool[];
  latLng?: LatLng;
  temperature?: number;
  lang?: Lang;
}

export interface JsonResponse<T> {
  data: T;
  sources: GroundingSource[];
}

/** The only surface the routes depend on — swapped for a fake in tests. */
export interface AiClient {
  generateJson<T>(req: JsonRequest<T>): Promise<JsonResponse<T>>;
}

export class AiError extends Error {}

const GEMINI_TIMEOUT_MS = 30_000;

/** Vertex errors carry an HTTP status; rate limits and 5xx are worth a retry, bad requests are not. */
const isRetryableAiError = (err: unknown) => {
  const status = (err as { status?: number })?.status;
  return status === undefined ? !(err instanceof AiError) : isTransientStatus(status);
};

/**
 * Gemini on Vertex AI. Auth is Application Default Credentials (the Cloud Run service account),
 * so there is no AI API key anywhere in the app.
 */
export class VertexGemini implements AiClient {
  private readonly ai: GoogleGenAI;

  constructor(
    project: string,
    location: string,
    private readonly model: string,
  ) {
    this.ai = new GoogleGenAI({ vertexai: true, project, location });
  }

  async generateJson<T>(req: JsonRequest<T>): Promise<JsonResponse<T>> {
    const tools: Tool[] = [];
    if (req.tools?.includes('maps')) tools.push({ googleMaps: {} });
    if (req.tools?.includes('search')) tools.push({ googleSearch: {} });

    const call = () =>
      this.ai.models.generateContent({
        model: this.model,
        contents: [{ role: 'user', parts: req.parts }],
        config: {
          systemInstruction: req.system + languageInstruction(req.lang),
          temperature: req.temperature ?? 0.4,
          responseMimeType: 'application/json',
          responseJsonSchema: z.toJSONSchema(req.schema, { target: 'draft-2020-12' }),
          ...(tools.length > 0 && { tools }),
          ...(req.latLng && {
            toolConfig: { retrievalConfig: { latLng: { latitude: req.latLng.lat, longitude: req.latLng.lng }, languageCode: 'en_IN' } },
          }),
        },
      });

    let response: Awaited<ReturnType<typeof call>>;
    try {
      response = await withRetry(() => withTimeout(call(), GEMINI_TIMEOUT_MS, 'Gemini timed out'), { retries: 2, baseMs: 400, isRetryable: isRetryableAiError });
    } catch (err) {
      throw new AiError(`Gemini call failed: ${(err as Error).message}`);
    }

    const text = response.text;
    if (!text) throw new AiError('Gemini returned an empty response');
    let json: unknown;
    try {
      json = JSON.parse(extractJson(text));
    } catch {
      throw new AiError('Gemini returned malformed JSON');
    }
    const parsed = req.schema.safeParse(json);
    if (!parsed.success) throw new AiError(`Gemini response failed validation: ${parsed.error.message}`);

    return { data: parsed.data, sources: extractSources(response.candidates?.[0]?.groundingMetadata) };
  }
}

/** Tolerates a model that wraps JSON in a markdown fence. */
export function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}

interface GroundingMetadataLike {
  groundingChunks?: Array<{
    maps?: { uri?: string; title?: string; placeId?: string };
    web?: { uri?: string; title?: string };
  }>;
}

export function extractSources(meta: GroundingMetadataLike | undefined): GroundingSource[] {
  const sources: GroundingSource[] = [];
  const seen = new Set<string>();
  for (const chunk of meta?.groundingChunks ?? []) {
    const src = chunk.maps
      ? { kind: 'maps' as const, title: (chunk.maps.title ?? '').replace(/ - Google Maps$/, ''), uri: chunk.maps.uri ?? '', placeId: chunk.maps.placeId }
      : chunk.web
        ? { kind: 'web' as const, title: chunk.web.title ?? '', uri: chunk.web.uri ?? '' }
        : undefined;
    if (!src?.uri || seen.has(src.uri)) continue;
    seen.add(src.uri);
    sources.push(src.placeId ? src : { kind: src.kind, title: src.title, uri: src.uri });
  }
  return sources;
}
