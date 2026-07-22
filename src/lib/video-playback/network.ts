export type NetworkQuality = "slow" | "medium" | "fast";

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
};

function getConnection(): NetworkInformationLike | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & {
    connection?: NetworkInformationLike;
    mozConnection?: NetworkInformationLike;
    webkitConnection?: NetworkInformationLike;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

/** Map Network Information API → coarse quality bucket. */
export function getNetworkQuality(): NetworkQuality {
  const conn = getConnection();
  if (!conn) return "fast";
  if (conn.saveData) return "slow";
  const type = (conn.effectiveType ?? "").toLowerCase();
  if (type === "slow-2g" || type === "2g") return "slow";
  if (type === "3g") return "medium";
  if (typeof conn.downlink === "number" && conn.downlink > 0 && conn.downlink < 1.5) {
    return "slow";
  }
  return "fast";
}

/** Suggested preload based on network + proximity. */
export function suggestedPreload(
  quality: NetworkQuality,
  nearViewport: boolean
): "none" | "metadata" | "auto" {
  if (!nearViewport) return "none";
  if (quality === "slow") return "none";
  if (quality === "medium") return "metadata";
  return "metadata";
}

export function shouldAutoplayOnNetwork(quality: NetworkQuality): boolean {
  return quality !== "slow";
}
