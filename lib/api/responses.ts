import { z } from "zod";

/**
 * Response objects wrap a one-shot ReadableStream body. Never construct one at
 * module scope and reuse it across requests — the body is consumed on first
 * read, so later requests can receive an empty or errored body. Always build
 * a fresh Response per call via these factories.
 */
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export const notFound = (message = "Not found"): Response => jsonError(message, 404);
export const badRequest = (message: string): Response => jsonError(message, 400);

export function zodErrorResponse(error: z.ZodError): Response {
  return jsonError(error.issues[0]?.message ?? "Invalid request body", 400);
}
