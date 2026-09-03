import { createHash, timingSafeEqual } from "crypto";
import type { TrackingProvider, TrackingSnapshot } from "@/lib/marketplace/tracking";
import { resolve17TrackCarrierCode } from "@/lib/marketplace/tracking/17track-carriers";
import { safeLogInfo, safeLogWarn } from "@/lib/safe-log";

const API_BASE = "https://api.17track.net/track/v2.4";

export function get17TrackApiKey(): string | null {
  return (
    process.env.MARKETPLACE_17TRACK_API_KEY?.trim() ||
    process.env.TRACKING_17TRACK_API_KEY?.trim() ||
    null
  );
}

export function verify17TrackWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = get17TrackApiKey();
  if (!key || !signature?.trim()) return false;
  const expected = createHash("sha256")
    .update(`${rawBody}/${key}`, "utf8")
    .digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature.trim(), "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type RegisterAccepted = {
  number: string;
  carrier?: number;
  tag?: string | null;
};

export class SeventeenTrackProvider implements TrackingProvider {
  id = "17track";

  private headers() {
    const key = get17TrackApiKey();
    if (!key) throw new Error("17TRACK API key not configured");
    return {
      "Content-Type": "application/json",
      "17token": key,
    };
  }

  async registerTracking(input: {
    carrierId: string;
    trackingNumber: string;
    trackingSlug?: string;
    orderId?: string;
    destinationCountry?: string | null;
  }) {
    const key = get17TrackApiKey();
    if (!key) return { error: "17TRACK API key not configured" };

    const number = input.trackingNumber.trim();
    if (!number) return { error: "Tracking number required" };

    const carrier = resolve17TrackCarrierCode(input.trackingSlug);
    const payload = [
      {
        number,
        ...(carrier != null ? { carrier } : {}),
        ...(input.orderId ? { tag: input.orderId.slice(0, 100), order_no: input.orderId.slice(0, 50) } : {}),
        ...(input.destinationCountry ? { destination_country: input.destinationCountry.toUpperCase() } : {}),
        auto_detection: carrier == null,
      },
    ];

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        code?: number;
        data?: { accepted?: RegisterAccepted[]; rejected?: { number: string; error?: { message?: string } }[] };
      };

      if (!res.ok || json.code !== 0) {
        safeLogWarn("17track-register", { status: res.status, code: json.code });
        return { error: "17TRACK registration failed" };
      }

      const rejected = json.data?.rejected?.find((r) => r.number === number);
      if (rejected?.error?.message) {
        return { error: rejected.error.message };
      }

      const accepted = json.data?.accepted?.find((r) => r.number === number);
      const externalId =
        accepted != null
          ? `${number}:${accepted.carrier ?? carrier ?? 0}`
          : number;

      safeLogInfo("17track-register", {
        number: number.slice(0, 6) + "…",
        orderId: input.orderId?.slice(0, 8),
        carrier: accepted?.carrier ?? carrier,
      });

      return { externalId };
    } catch (e) {
      safeLogWarn("17track-register", { err: String(e) });
      return { error: "17TRACK registration request failed" };
    }
  }

  async fetchTracking(input: {
    carrierId: string;
    trackingNumber: string;
    externalId?: string | null;
  }): Promise<TrackingSnapshot | null> {
    const key = get17TrackApiKey();
    if (!key) return null;

    const number = input.trackingNumber.trim();
    let carrier: number | undefined;
    if (input.externalId?.includes(":")) {
      const parsed = Number(input.externalId.split(":")[1]);
      if (Number.isFinite(parsed) && parsed > 0) carrier = parsed;
    }
    if (carrier == null) {
      carrier = resolve17TrackCarrierCode(input.carrierId);
    }

    try {
      const res = await fetch(`${API_BASE}/gettrackinfo`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify([
          {
            number,
            ...(carrier != null ? { carrier } : {}),
          },
        ]),
      });
      const json = (await res.json()) as {
        code?: number;
        data?: {
          accepted?: {
            number: string;
            track_info?: {
              latest_status?: { status?: string; sub_status?: string; sub_status_descr?: string | null };
              latest_event?: { description?: string; time_utc?: string; location?: string };
            };
          }[];
        };
      };
      if (!res.ok || json.code !== 0) return null;

      const row = json.data?.accepted?.find((a) => a.number === number);
      const latest = row?.track_info?.latest_status;
      if (!latest?.status) return null;

      return {
        status: latest.status,
        statusDetail: latest.sub_status_descr ?? latest.sub_status,
        checkpoints: row?.track_info?.latest_event
          ? [
              {
                time: row.track_info.latest_event.time_utc,
                location: row.track_info.latest_event.location,
                message: row.track_info.latest_event.description,
              },
            ]
          : [],
        raw: row,
      };
    } catch {
      return null;
    }
  }
}

export function parse17TrackMainStatus(payload: unknown): {
  trackingNumber: string;
  tag: string | null;
  mainStatus: string;
  subStatus: string | null;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { event?: string; data?: Record<string, unknown> };
  if (root.event !== "TRACKING_UPDATED" || !root.data) return null;

  const data = root.data;
  const number = typeof data.number === "string" ? data.number.trim() : "";
  if (!number) return null;

  const tag = typeof data.tag === "string" ? data.tag.trim() : null;
  const trackInfo = data.track_info as
    | { latest_status?: { status?: string; sub_status?: string } }
    | undefined;
  const mainStatus = trackInfo?.latest_status?.status?.trim() ?? "";
  if (!mainStatus) return null;

  const subStatus = trackInfo?.latest_status?.sub_status?.trim() ?? null;
  return { trackingNumber: number, tag, mainStatus, subStatus };
}
