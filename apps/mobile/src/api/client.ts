import { API_BASE_URL } from "@/config/env";
import { errorCodeOfBody, localizeErrorBody } from "@/api/error-code";
import {
  clearTokens,
  currentAuthEpoch,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/auth/token-store";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Server error code (catalog key), when the response carried one. */
  get code(): string | null {
    return errorCodeOfBody(this.body);
  }
}

/** True when `e` is an API error carrying exactly this server error code. */
export function isApiErrorCode(e: unknown, code: string): boolean {
  return e instanceof ApiError && e.code === code;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  /** Default 15s. Long-poll wait should pass ~12s. */
  timeoutMs?: number;
  headers?: Record<string, string>;
};

let refreshInFlight: Promise<boolean> | null = null;

function mergeAbortSignals(timeoutMs: number, external?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  const onExternalAbort = () => {
    clearTimeout(timer);
    ac.abort();
  };
  if (external) {
    if (external.aborted) {
      clearTimeout(timer);
      ac.abort();
    } else {
      external.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  return {
    signal: ac.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

async function refreshAccessToken(): Promise<boolean> {
  const epoch = currentAuthEpoch();
  const refresh = await getRefreshToken();
  if (!refresh || epoch !== currentAuthEpoch()) return false;

  const { signal, cleanup } = mergeAbortSignals(12_000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/mobile/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      signal,
    });

    if (!res.ok) {
      await clearTokens();
      return false;
    }

    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    if (!data.accessToken || !data.refreshToken) {
      await clearTokens();
      return false;
    }

    if (epoch !== currentAuthEpoch()) return false;
    await setTokens(data.accessToken, data.refreshToken, undefined, epoch);
    return epoch === currentAuthEpoch();
  } catch {
    return false;
  } finally {
    cleanup();
  }
}

/**
 * Mobile HTTP client — Bearer only. Designed for millions-scale API usage:
 * - no cookies
 * - single-flight refresh
 * - JSON only
 * - hard timeouts so hung network never freezes the UI for minutes
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal, timeoutMs = 15_000, headers: extraHeaders } =
    options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const first = mergeAbortSignals(timeoutMs, signal);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: first.signal,
    });
  } catch (e) {
    first.cleanup();
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError(`API ${method} ${path} timed out`, 408);
    }
    throw e;
  } finally {
    first.cleanup();
  }

  if (res.status === 401 && auth) {
    refreshInFlight ??= refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
    const ok = await refreshInFlight;
    if (ok) {
      const token = await getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const retry = mergeAbortSignals(timeoutMs, signal);
      try {
        res = await fetch(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: retry.signal,
        });
      } catch (e) {
        retry.cleanup();
        if (e instanceof Error && e.name === "AbortError") {
          throw new ApiError(`API ${method} ${path} timed out`, 408);
        }
        throw e;
      } finally {
        retry.cleanup();
      }
    }
  }

  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      parsed = undefined;
    }
    const localized = localizeErrorBody(parsed);
    throw new ApiError(
      localized.message ?? `API ${method} ${path} failed`,
      res.status,
      localized.body
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
