import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type ModeratorAction =
  | "CONTENT_REMOVE"
  | "SUSPEND_24H"
  | "SUSPEND_3D"
  | "SUSPEND_5D"
  | "SUSPEND_PERMANENT";

export type ContentTargetType = "POST" | "USED_LISTING" | "MARKETPLACE_LISTING";

export function applyMobileModeratorAction(input: {
  action: ModeratorAction;
  targetType: ContentTargetType;
  targetId: string;
}) {
  return apiRequest<{ success: boolean; sanctionId?: string }>(MobileApi.moderationAction, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchSanctionNotice() {
  return apiRequest<{
    notice: {
      id: string;
      kind: string;
      reason: string | null;
      endsAt: string | null;
      readOnly: boolean;
    } | null;
  }>(MobileApi.moderationNotice);
}

export function ackSanctionNotice(sanctionId?: string) {
  return apiRequest<{ ok: boolean }>(MobileApi.moderationNotice, {
    method: "POST",
    body: JSON.stringify({ sanctionId }),
  });
}

export function submitSanctionAppeal(input: {
  title: string;
  content: string;
  contactEmail: string;
  sanctionId?: string;
}) {
  return apiRequest<{ success: boolean; appealId?: string }>(MobileApi.moderationAppeal, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
