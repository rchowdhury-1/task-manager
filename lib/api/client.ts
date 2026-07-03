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

  return res.json() as Promise<T>;
}
