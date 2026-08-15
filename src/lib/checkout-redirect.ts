import type { PaymentIntent } from "@prisma/client";
import { safeReturnPath } from "@/lib/donation-metadata";

export function checkoutRedirectPath(intent: PaymentIntent, type: string) {
  let redirectPath = "/support";
  const meta = intent.metadata as Record<string, string | undefined>;

  if (type === "TIP") {
    redirectPath = safeReturnPath(
      meta.returnPath,
      meta.username ? `/u/${meta.username}` : "/support"
    );
    if (meta.channelId) redirectPath = `/voice/${meta.channelId}`;
  }

  if (type === "EVENT_REGISTRATION") {
    if (meta.eventId) redirectPath = `/events/new?eventId=${meta.eventId}&paid=1`;
    else redirectPath = "/events";
  }

  if (type === "CREATOR_EPISODE") {
    if (meta.episodeId) redirectPath = `/works/e/${meta.episodeId}?paid=1`;
    else redirectPath = "/works";
  }

  if (type === "POST_MEDIA") {
    if (meta.returnPath) redirectPath = safeReturnPath(meta.returnPath, "/");
    else if (meta.username) redirectPath = `/u/${meta.username}?paid=1`;
    else redirectPath = "/";
  }

  if (type === "CREATOR_SUBSCRIPTION") {
    redirectPath = meta.username ? `/u/${meta.username}?subscribed=1` : "/";
  }

  if (type === "STUDIO_ASSET") {
    redirectPath = meta.studioAssetId
      ? `/studio/library?purchased=${meta.studioAssetId}`
      : "/studio/library";
  }

  return redirectPath;
}
