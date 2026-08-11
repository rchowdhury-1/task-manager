import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { notFound, badRequest, jsonError, zodErrorResponse } from '@/lib/api/responses';

describe('lib/api/responses', () => {
  it('jsonError builds a Response with the given status and message', async () => {
    const res = jsonError('boom', 418);
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ error: 'boom' });
  });

  it('notFound defaults to 404 "Not found"', async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });

  it('badRequest returns 400 with the given message', async () => {
    const res = badRequest('Invalid task id');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid task id' });
  });

  it('zodErrorResponse extracts the first issue message', async () => {
    const schema = z.object({ title: z.string().min(1, 'Title required') });
    const parsed = schema.safeParse({ title: '' });
    if (parsed.success) throw new Error('expected failure');
    const res = zodErrorResponse(parsed.error);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Title required' });
  });

  it('each call returns a distinct Response instance with a fresh, readable body', async () => {
    // This is the regression case for the module-scope singleton bug: a
    // Response body is a one-shot ReadableStream, so returning the SAME
    // object across two requests means the second .json() call fails.
    // Factories must build a new Response every call.
    const first = notFound();
    const second = notFound();
    expect(first).not.toBe(second);

    // Both must be independently readable — this is exactly what breaks
    // if notFound() returned a hoisted module-level constant instead.
    await expect(first.json()).resolves.toEqual({ error: 'Not found' });
    await expect(second.json()).resolves.toEqual({ error: 'Not found' });
  });

  it('demonstrates the bug this file fixes: reusing one Response across two reads fails', async () => {
    const hoisted = Response.json({ error: 'Not found' }, { status: 404 });
    await hoisted.json();
    await expect(hoisted.json()).rejects.toThrow();
  });
});
