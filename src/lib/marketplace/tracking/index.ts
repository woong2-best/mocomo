/**
 * Tracking provider interface — Manual now; AfterShip / Shippo / EasyPost / 17TRACK later.
 * Swap implementation in getTrackingProvider() without changing order/shipment callers.
 */

export type TrackingSnapshot = {
  status: string;
  statusDetail?: string;
  estimatedDelivery?: string | null;
  checkpoints?: { time?: string; location?: string; message?: string }[];
  raw?: unknown;
};

export type TrackingProvider = {
  id: string;
  /** Register or refresh tracking with external API (no-op for manual) */
  registerTracking(input: {
    carrierId: string;
    trackingNumber: string;
    trackingSlug?: string;
  }): Promise<{ externalId?: string } | { error: string }>;
  /** Fetch live status (manual returns null — UI shows stored status only) */
  fetchTracking(input: {
    carrierId: string;
    trackingNumber: string;
    externalId?: string | null;
  }): Promise<TrackingSnapshot | null>;
};

export class ManualTrackingProvider implements TrackingProvider {
  id = "manual";

  async registerTracking() {
    return {};
  }

  async fetchTracking(): Promise<TrackingSnapshot | null> {
    return null;
  }
}

let cached: TrackingProvider | null = null;

/** Override with AfterShip etc. via env later, e.g. TRACKING_PROVIDER=aftership */
export function getTrackingProvider(): TrackingProvider {
  if (cached) return cached;
  const name = process.env.MARKETPLACE_TRACKING_PROVIDER?.trim().toLowerCase();
  if (name === "aftership" || name === "shippo" || name === "easypost" || name === "17track") {
    // Placeholder — implement adapters under ./providers/* when API keys exist
    cached = new ManualTrackingProvider();
  } else {
    cached = new ManualTrackingProvider();
  }
  return cached;
}
