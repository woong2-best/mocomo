import { replyForAvatar, systemInstructionFor } from "@/lib/ai-live/avatar-llm";
import { synthesizeIdolVoice } from "@/lib/ai-live/edge-tts";
import type { VrmEmotion } from "@/lib/ai-live/vrm-expression";

export { systemInstructionFor } from "@/lib/ai-live/avatar-llm";

export type HostSpeech = {
  text: string;
  emotion: VrmEmotion;
  blocked: boolean;
  rateLimited: boolean;
  exhausted?: boolean;
  audio: ArrayBuffer | null;
};

/** Caller must already have passed `planHostReply` and only send `kind: "model"` text. */
export async function speakHostLine(userText: string, member: string | null = null): Promise<HostSpeech> {
  const reply = await replyForAvatar(userText, member);
  if (reply.blocked || reply.rateLimited || reply.exhausted) {
    return {
      text: reply.text,
      emotion: reply.emotion,
      blocked: reply.blocked,
      rateLimited: reply.rateLimited,
      exhausted: reply.exhausted,
      audio: null,
    };
  }
  const audio = await synthesizeIdolVoice(reply.text, member);
  return { text: reply.text, emotion: reply.emotion, blocked: false, rateLimited: false, audio };
}
