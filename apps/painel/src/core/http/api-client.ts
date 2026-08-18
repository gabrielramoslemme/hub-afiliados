import Cookies from 'js-cookie';

export const ACCESS_TOKEN_COOKIE = 'porto_access_token';

export interface ApiErrorBody {
  statusCode: number;
  code: string | null;
  message: string | string[];
  path: string;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1';

export async function apiClient<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const token = auth ? Cookies.get(ACCESS_TOKEN_COOKIE) : undefined;

  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json();

  if (!response.ok) {
    const error = body as ApiErrorBody;
    const message = Array.isArray(error.message) ? error.message.join(', ') : error.message;
    throw new ApiError(error.statusCode, error.code, message);
  }

  return body as T;
}
