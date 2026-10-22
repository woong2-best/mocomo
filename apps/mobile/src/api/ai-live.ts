import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type AiLiveChatResponse = {
  text: string;
  blocked: boolean;
};

export function postAiLiveChat(text: string) {
  return apiRequest<AiLiveChatResponse>(MobileApi.aiLiveChat, {
    method: "POST",
    body: { text },
    timeoutMs: 20_000,
  });
}
