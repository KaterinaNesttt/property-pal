import { ApiErrorPayload } from "@/lib/types";
import {
  cacheOfflineResponse,
  enqueueOfflineMutation,
  flushOfflineMutations,
  getPendingOfflineMutationsCount,
  getOfflineResponse,
  isOfflineQueuedResult,
} from "@/lib/offline-sync";

const DEFAULT_API_BASE = "https://property-pal-api.roman-v-shkurenko.workers.dev";
const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "");
const API_BASE = configuredApiBase || DEFAULT_API_BASE;

export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string | null;
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError;
}

function shouldQueueRequest(path: string, options: RequestOptions) {
  const method = (options.method ?? "GET").toUpperCase();
  return (
    (method === "POST" || method === "PUT" || method === "DELETE") &&
    Boolean(options.token) &&
    path.startsWith("/api/") &&
    !path.startsWith("/api/auth/")
  );
}

function isOfflineReadable(path: string, options: RequestOptions) {
  return (options.method ?? "GET").toUpperCase() === "GET" && path.startsWith("/api/");
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (isOfflineReadable(path, options)) {
      const cached = getOfflineResponse(path);
      if (cached !== undefined) {
        return cached as T;
      }
    }

    if (shouldQueueRequest(path, options) && isNetworkError(error)) {
      return enqueueOfflineMutation({
        method: (options.method ?? "GET").toUpperCase() as "POST" | "PUT" | "DELETE",
        path,
        body: options.body,
        token: options.token as string,
      }) as T;
    }

    throw error;
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }

    throw new ApiError(
      response.status,
      payload?.error ?? `HTTP ${response.status}`,
      payload?.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T;
  if (isOfflineReadable(path, options)) {
    cacheOfflineResponse(path, data);
  }
  return data;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: "GET", token }),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body, token }),
  put: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PUT", body, token }),
  delete: <T>(path: string, token?: string | null) => request<T>(path, { method: "DELETE", token }),
};

export const offlineSync = {
  apiBase: API_BASE,
  flush: () => flushOfflineMutations(API_BASE),
  getPendingCount: getPendingOfflineMutationsCount,
  isQueuedResult: isOfflineQueuedResult,
};
