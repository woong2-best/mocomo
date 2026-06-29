export type LiveHubMode = "all" | "video" | "voice";

export function parseLiveHubModeParam(raw?: string | null): LiveHubMode {
  if (raw === "voice" || raw === "video") return raw;
  return "all";
}
