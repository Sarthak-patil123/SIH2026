export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * apiFetch — thin wrapper around fetch that:
 * 1. Sends credentials (HttpOnly cookies) with every request
 * 2. Adds Authorization Bearer header if a token is available in localStorage
 * 3. Always sends/accepts JSON
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach token from localStorage as a fallback (for non-browser API clients)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('idverify_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include', // send HttpOnly cookies automatically
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.error) errorMsg = body.error;
    } catch {
      // not JSON — use default message
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

/**
 * apiUpload — sends a multipart/form-data request (for file uploads).
 * Do NOT pass Content-Type; the browser sets it automatically with the
 * correct boundary when the body is a FormData instance.
 */
export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData
): Promise<T> {
  const headers: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('idverify_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Upload failed: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.error) errorMsg = body.error;
      if (body?.message) errorMsg = body.message;
    } catch {
      // not JSON — use default message
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
