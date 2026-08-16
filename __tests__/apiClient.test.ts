// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiFetch, ApiError } from '@/lib/api/client';

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves undefined for a 204 No Content response instead of trying to parse an empty body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 204 })
    ));

    await expect(apiFetch('/projects/some-id', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('still parses JSON on a normal 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: '1' }), { status: 200 })
    ));

    await expect(apiFetch('/projects/1')).resolves.toEqual({ id: '1' });
  });

  it('throws ApiError with the server message on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    ));

    await expect(apiFetch('/projects/missing')).rejects.toMatchObject(
      new ApiError(404, 'Not found')
    );
  });
});
