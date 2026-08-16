export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    // Prefer the human-readable `message` when the API provides one
    // (e.g. the AI daily-limit 429 includes usage details there)
    throw new ApiError(res.status, body.message ?? body.error ?? 'Request failed');
  }

  // DELETE routes return 204 with an empty body — res.json() on an empty
  // body throws a SyntaxError, so no-content responses resolve to undefined
  // instead of attempting to parse one.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
