export class ApiError extends Error {
  readonly status: number;
  readonly details: Record<string, string> | undefined;

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError(0, "server is offline");
  }

  const body = (await res.json().catch(() => null)) as
    | (T & { error?: string; details?: Record<string, string> })
    | null;

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `request failed (${res.status})`, body?.details);
  }
  return body as T;
}

export function postJson<T>(path: string, data?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: data === undefined ? null : JSON.stringify(data),
  });
}
