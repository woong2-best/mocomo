export type ClientPlatform = "web" | "app";

export const CLIENT_PLATFORM_COOKIE = "mocomo_client";
export const CLIENT_PLATFORM_MAX_AGE = 60 * 60 * 24 * 365;

const DEFAULT_APP_HOSTS = ["app.mocomo.net", "app.localhost"];

export function getAppHostnames(): string[] {
  const fromEnv = process.env.NEXT_PUBLIC_APP_HOST?.trim();
  if (fromEnv) return [fromEnv, ...DEFAULT_APP_HOSTS];
  return DEFAULT_APP_HOSTS;
}

export function isAppHostname(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = host.split(":")[0]?.toLowerCase() ?? "";
  return getAppHostnames().some((h) => h.toLowerCase() === bare);
}

export function resolveClientPlatform(input: {
  cookie?: string | null;
  host?: string | null;
  queryClient?: string | null;
}): ClientPlatform {
  if (input.queryClient === "app") return "app";
  if (isAppHostname(input.host)) return "app";
  if (input.cookie === "app") return "app";
  return "web";
}

export function isNativeAppPlatform(platform: ClientPlatform): boolean {
  return platform === "app";
}
