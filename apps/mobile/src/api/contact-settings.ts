import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type ContactAudience = "EVERYONE" | "FOLLOWING_ONLY";
export type MentionAudience = "EVERYONE" | "FOLLOWING_ONLY" | "NOBODY";

export type ContactSettings = {
  messageRequestAudience: ContactAudience;
  callRequestAudience: ContactAudience;
  mentionAudience: MentionAudience;
};

export async function fetchContactSettings() {
  return apiRequest<ContactSettings>(MobileApi.contactSettings, { auth: true });
}

export async function updateContactSettings(body: Partial<ContactSettings>) {
  return apiRequest<ContactSettings>(MobileApi.contactSettings, {
    method: "PUT",
    auth: true,
    body,
  });
}
