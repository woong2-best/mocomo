import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type CreatorMarketingSettings = {
  welcomeEnabled: boolean;
  welcomeText: string;
  welcomeMedia: {
    url: string;
    type: string;
    name: string | null;
    priceKrw: number;
  } | null;
  followerCount: number;
  activeBulkJob: {
    id: string;
    status: string;
    totalFollowers: number;
    sentCount: number;
    failedCount: number;
    createdAt: string;
    completedAt: string | null;
  } | null;
};

export async function fetchCreatorMarketingSettings() {
  return apiRequest<CreatorMarketingSettings>(MobileApi.creatorDmMarketing);
}

export async function saveCreatorWelcomeMessage(payload: {
  enabled: boolean;
  text?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
  mediaPriceKrw?: number | null;
}) {
  return apiRequest<CreatorMarketingSettings>(MobileApi.creatorDmMarketing, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function sendCreatorBulkMessage(payload: {
  text?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaName?: string | null;
  mediaPriceKrw?: number | null;
}) {
  return apiRequest<{
    jobId: string;
    totalFollowers: number;
    settings: CreatorMarketingSettings;
  }>(MobileApi.creatorDmMarketingBulk, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
