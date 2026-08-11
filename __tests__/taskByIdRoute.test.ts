import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Regression test for the module-scope Response singleton bug (A1): the
// route used to hoist `const NOT_FOUND = Response.json(...)` at module load
// and return the SAME object from every request. A Response body is a
// one-shot ReadableStream, so the second request to read that body would
// throw "Body is unusable". This test invokes the real route handler twice
// and asserts both responses parse cleanly.

vi.mock('@/lib/auth/session', () => ({
  requireUserId: vi.fn().mockResolvedValue('user-1'),
  AuthError: class AuthError extends Error {},
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]), // no matching task -> notFound()
        }),
      }),
    }),
  },
}));

describe('GET /api/v1/tasks/[id] — Response reuse regression', () => {
  it('returns a fresh, independently-readable 404 body on repeated invocations', async () => {
    const { GET } = await import('@/app/api/v1/tasks/[id]/route');

    const makeReq = () =>
      new NextRequest('http://localhost/api/v1/tasks/00000000-0000-0000-0000-000000000000');

    const res1 = await GET(makeReq(), { params: { id: '00000000-0000-0000-0000-000000000000' } });
    const res2 = await GET(makeReq(), { params: { id: '00000000-0000-0000-0000-000000000000' } });

    expect(res1.status).toBe(404);
    expect(res2.status).toBe(404);

    // Both bodies must be readable — this is exactly what failed before the fix.
    await expect(res1.json()).resolves.toEqual({ error: 'Not found' });
    await expect(res2.json()).resolves.toEqual({ error: 'Not found' });
  });

  it('returns a fresh, independently-readable 400 body for a malformed id, called twice', async () => {
    const { GET } = await import('@/app/api/v1/tasks/[id]/route');

    const req = new NextRequest('http://localhost/api/v1/tasks/not-a-uuid');
    const res1 = await GET(req, { params: { id: 'not-a-uuid' } });
    const res2 = await GET(req, { params: { id: 'not-a-uuid' } });

    expect(res1.status).toBe(400);
    expect(res2.status).toBe(400);
    await expect(res1.json()).resolves.toEqual({ error: 'Invalid task id' });
    await expect(res2.json()).resolves.toEqual({ error: 'Invalid task id' });
  });
});
