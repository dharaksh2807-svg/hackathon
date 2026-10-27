import { z } from "zod";
import { ErrorResponseSchema, UuidSchema } from "../lib/contracts";
import { ApiError } from "./errors";

export function queryInput(request: Request): Record<string, string> {
  const query: Record<string, string> = Object.create(null);
  for (const [key, value] of new URL(request.url).searchParams) {
    if (Object.hasOwn(query, key)) throw new ApiError("VALIDATION_ERROR", 400, "Repeated query parameter");
    query[key] = value;
  }
  return query;
}

export function requireSameOrigin(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  // Host is the public authority. Next may construct request.url with an internal
  // hostname, so compare Origin to Host rather than that internal hostname.
  // Reverse proxies must preserve Host; set the canonical origin for TLS termination.
  let parsedOrigin: URL | undefined;
  try { if (origin) parsedOrigin = new URL(origin); } catch { /* reject below */ }
  const canonical = process.env.FAIRSHIFT_APP_ORIGIN;
  if (!origin || !parsedOrigin || parsedOrigin.origin !== origin || !host || parsedOrigin.host !== host ||
      (canonical ? origin !== canonical : parsedOrigin.protocol !== url.protocol) ||
      !["http:", "https:"].includes(parsedOrigin.protocol) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError("FORBIDDEN", 403, "Same-origin request required");
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError("VALIDATION_ERROR", 400, "JSON content type required");
  }
}

export async function bodyInput(request: Request): Promise<unknown> {
  requireSameOrigin(request);
  // Bound the streamed body as well as Content-Length (which cannot be trusted).
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("VALIDATION_ERROR", 400, "JSON body required");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16_384) {
        await reader.cancel();
        throw new ApiError("VALIDATION_ERROR", 400, "Request body too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid JSON body");
  } finally {
    reader.releaseLock();
  }
}

export function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "Request does not match the API contract");
  return parsed.data;
}
export function pathId(value: unknown) { return input(UuidSchema, value); }

/** Runtime-validate responses too: invalid internal data is a 500, never a 400. */
export async function endpoint<T>(schema: z.ZodType<T>, action: () => Promise<unknown>, status = 200): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };
  try {
    return Response.json(schema.parse(await action()), { status, headers });
  } catch (error) {
    const safe = error instanceof ApiError ? error : new ApiError("SERVER_ERROR", 500, "Unable to complete request");
    return Response.json(ErrorResponseSchema.parse({ error: { code: safe.code, message: safe.message } }),
      { status: safe.status, headers });
  }
}

export function methodNotAllowed(allow: string): Response {
  return Response.json(ErrorResponseSchema.parse({ error: { code: "VALIDATION_ERROR", message: "Method not allowed" } }), {
    status: 405, headers: { "Allow": allow, "Cache-Control": "private, no-store", "Vary": "Cookie" },
  });
}
