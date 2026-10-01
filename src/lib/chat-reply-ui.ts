import type { ChatMessageView } from "@/lib/chat-message-normalize";
import { getChatMessageReplyPreview } from "@/lib/chat-message-normalize";
import type { Locale } from "@/lib/i18n/config";
import { uiText } from "@/lib/i18n/ui-text";

export function getReplyToHeading(
  replyTo: NonNullable<ChatMessageView["replyTo"]>,
  opts: {
    selfUserId: string;
    selfUsername: string;
    bubbleIsMine: boolean;
    locale: Locale | string | undefined;
  }
): string {
  const { selfUserId, selfUsername, bubbleIsMine, locale } = opts;
  const quotedIsSelf = replyTo.sender.id === selfUserId;
  if (quotedIsSelf) {
    if (bubbleIsMine) {
      return uiText(locale, "나에게 답장", "Reply to yourself");
    }
    return uiText(locale, `${selfUsername}에게 답장`, `Reply to ${selfUsername}`);
  }
  return uiText(
    locale,
    `${replyTo.sender.username}에게 답장`,
    `Reply to ${replyTo.sender.username}`
  );
}

export type QuotedMessageBody =
  | { kind: "text"; text: string }
  | { kind: "photo"; thumbUrl: string | null; label: string }
  | { kind: "video"; thumbUrl: string | null; label: string };

export function getQuotedMessageBody(
  replyTo: NonNullable<ChatMessageView["replyTo"]>,
  locale: Locale | string | undefined = "ko"
): QuotedMessageBody {
  const preview = getChatMessageReplyPreview(replyTo);
  const unpaidVisual = replyTo.attachments?.find(
    (a) =>
      (a.type === "IMAGE" || a.type === "GIF" || a.type === "VIDEO") &&
      !(a.priceKrw ?? 0) &&
      Boolean(a.url)
  );
  const textOnly = replyTo.content?.trim();
  if (textOnly && preview !== "사진" && preview !== "동영상" && preview !== "음성 메시지") {
    return { kind: "text", text: preview };
  }
  if (unpaidVisual?.type === "VIDEO") {
    return {
      kind: "video",
      thumbUrl: unpaidVisual.url || null,
      label: uiText(locale, "동영상", "Video"),
    };
  }
  if (unpaidVisual && (unpaidVisual.type === "IMAGE" || unpaidVisual.type === "GIF")) {
    return {
      kind: "photo",
      thumbUrl: unpaidVisual.url || null,
      label: uiText(locale, "사진", "Photo"),
    };
  }
  return { kind: "text", text: preview };
}
