export const BACKEND_BASE_URL = 'http://13.127.192.243:3000';

export function getBackendBaseUrl(): string {
  return BACKEND_BASE_URL.replace(/\/+$/, '');
}

export function buildBackendUrl(
  path: string,
  query?: Record<string, string | number | undefined | null>
): string {
  const baseUrl = getBackendBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}
