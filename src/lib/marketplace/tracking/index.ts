/**
 * Tracking provider interface — Manual default; 17TRACK when API key configured.
 */

import {
  SeventeenTrackProvider,
  get17TrackApiKey,
} from "@/lib/marketplace/tracking/providers/17track";

export type TrackingSnapshot = {
  status: string;
  statusDetail?: string;
  estimatedDelivery?: string | null;
  checkpoints?: { time?: string; location?: string; message?: string }[];
  raw?: unknown;
};

export type TrackingProvider = {
  id: string;
  registerTracking(input: {
    carrierId: string;
    trackingNumber: string;
    trackingSlug?: string;
    orderId?: string;
    destinationCountry?: string | null;
  }): Promise<{ externalId?: string } | { error: string }>;
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

export function getTrackingProvider(): TrackingProvider {
  if (cached) return cached;
  const name = process.env.MARKETPLACE_TRACKING_PROVIDER?.trim().toLowerCase();
  if (name === "17track" && get17TrackApiKey()) {
    cached = new SeventeenTrackProvider();
    return cached;
  }
  cached = new ManualTrackingProvider();
  return cached;
}

export function resetTrackingProviderCache() {
  cached = null;
}
