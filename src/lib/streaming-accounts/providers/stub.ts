/**
 * Future streaming platforms (AfreecaTV, SOOP, Facebook Live, TikTok, …)
 * register here when OAuth / verification is implemented.
 */
import type { StreamingPlatformProvider } from "../types";

export const STUB_STREAMING_PROVIDERS: Partial<
  Record<string, StreamingPlatformProvider>
> = {};
