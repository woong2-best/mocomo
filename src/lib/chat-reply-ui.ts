import type { ChatMessageView } from "@/lib/chat-message-normalize";
import { getChatMessageReplyPreview } from "@/lib/chat-message-normalize";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export function getReplyToHeading(
  replyTo: NonNullable<ChatMessageView["replyTo"]>,
  opts: {
    selfUserId: string;
    selfUsername: string;
    bubbleIsMine: boolean;
  }
): string {
  const { selfUserId, selfUsername, bubbleIsMine } = opts;
  const quotedIsSelf = replyTo.sender.id === selfUserId;
  if (quotedIsSelf) {
    if (bubbleIsMine) {
      return t("ui.reply_to_yourself");
    }
    return t("chat.replyToUser", { username: selfUsername });
  }
  return t("chat.replyToUser", { username: replyTo.sender.username });
}

export type QuotedMessageBody =
  | { kind: "text"; text: string }
  | { kind: "photo"; thumbUrl: string | null; label: string }
  | { kind: "video"; thumbUrl: string | null; label: string };

export function getQuotedMessageBody(
  replyTo: NonNullable<ChatMessageView["replyTo"]>
): QuotedMessageBody {
  const preview = getChatMessageReplyPreview(replyTo);
  const unpaidVisual = replyTo.attachments?.find(
    (a) =>
      (a.type === "IMAGE" || a.type === "GIF" || a.type === "VIDEO") &&
      !(a.priceKrw ?? 0) &&
      Boolean(a.url)
  );
  const textOnly = replyTo.content?.trim();
  if (
    textOnly &&
    preview !== t("ui.photo") &&
    preview !== t("live.modeVideo") &&
    preview !== t("chat.voiceMessage")
  ) {
    return { kind: "text", text: preview };
  }
  if (unpaidVisual?.type === "VIDEO") {
    return {
      kind: "video",
      thumbUrl: unpaidVisual.url || null,
      label: t("live.modeVideo"),
    };
  }
  if (unpaidVisual && (unpaidVisual.type === "IMAGE" || unpaidVisual.type === "GIF")) {
    return {
      kind: "photo",
      thumbUrl: unpaidVisual.url || null,
      label: t("ui.photo"),
    };
  }
  return { kind: "text", text: preview };
}
