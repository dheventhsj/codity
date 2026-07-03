const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<{ success: boolean; data?: T; error?: { message: string }; pagination?: unknown }> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Request failed');
  return json;
}

export function getApiBase() {
  return API_BASE.replace('/api/v1', '');
}
