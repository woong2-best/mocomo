import type { ChatAttachment, ChatMessage, ChatReplyTo } from "@/api/messages";
import { chatPostShareListPreview } from "@/lib/chat-post-share";
import { chatUsedListingListPreview } from "@/lib/chat-used-listing-share";
import { parseUsedTradeRequestMarker } from "@/lib/chat-used-trade-request";
import { parseCallBookingMarker } from "@/lib/chat-call-booking";
import { parseLetterDonationMarker } from "@/lib/chat-letter-donation";
import { parseAtmLetter } from "@/lib/chat-atm-letter";
import { translate } from "@/i18n/runtime";

export function getReplyToHeading(
  replyTo: Pick<ChatReplyTo, "sender">,
  opts: {
    selfUserId?: string;
    selfUsername: string;
    bubbleIsMine: boolean;
    locale?: string;
  }
): string {
  const locale = opts.locale ?? "ko";
  const selfUserId = opts.selfUserId;
  const quotedIsSelf = !!selfUserId && replyTo.sender.id === selfUserId;
  if (quotedIsSelf) {
    if (opts.bubbleIsMine) {
      return translate("m.messages.reply_to_yourself");
    }
    return translate("m.messages.reply_to_selfusername", { selfUsername: String(opts.selfUsername) });
  }
  return translate("m.messages.reply_to_username", { username: String(replyTo.sender.username) });
}

export type QuotedMessageBody =
  | { kind: "text"; text: string }
  | { kind: "photo"; thumbUrl: string | null; label: string }
  | { kind: "video"; thumbUrl: string | null; label: string };

export function getQuotedMessageBody(
  m: Pick<ChatMessage | ChatReplyTo, "content" | "attachments">,
  locale = "ko"
): QuotedMessageBody {
  const preview = getChatReplyPreview(m, locale);
  const attachments = (m.attachments as ChatAttachment[] | undefined) ?? [];
  const unpaidVisual = attachments.find(
    (a) =>
      (a.type === "IMAGE" || a.type === "GIF" || a.type === "VIDEO") &&
      !(a.priceKrw ?? 0) &&
      Boolean(a.url)
  );
  const textOnly = m.content?.trim();
  const photoLabel = translate("m.common.photo");
  const videoLabel = translate("m.messages.video");
  if (
    textOnly &&
    preview !== photoLabel &&
    preview !== videoLabel &&
    preview !== translate("m.messages.voice_message")
  ) {
    return { kind: "text", text: preview };
  }
  if (unpaidVisual?.type === "VIDEO") {
    return { kind: "video", thumbUrl: unpaidVisual.url || null, label: videoLabel };
  }
  if (unpaidVisual && (unpaidVisual.type === "IMAGE" || unpaidVisual.type === "GIF")) {
    return { kind: "photo", thumbUrl: unpaidVisual.url || null, label: photoLabel };
  }
  return { kind: "text", text: preview };
}

export function getChatReplyPreview(
  m: Pick<ChatMessage | ChatReplyTo, "content" | "attachments">,
  locale = "ko"
): string {
  if (parseUsedTradeRequestMarker(m.content)) {
    return translate("m.messages.trade_request");
  }
  if (parseCallBookingMarker(m.content)) {
    return translate("m.common.call_booking");
  }
  if (parseAtmLetter(m.content)) {
    return translate("m.messages.transfer_letter");
  }
  if (parseLetterDonationMarker(m.content)) {
    return translate("m.messages.letter_tip");
  }
  const sharePreview = chatPostShareListPreview(m.content);
  if (sharePreview) return sharePreview;
  const listingPreview = chatUsedListingListPreview(m.content);
  if (listingPreview) return listingPreview;
  const text = m.content?.trim();
  if (text && /\[\[mocomo:[^\]]+\]\]/i.test(text)) {
    const stripped = text.replace(/\[\[mocomo:[^\]]+\]\]/gi, "").trim();
    if (!stripped) {
      return translate("m.messages.system_message");
    }
    return stripped.length > 100 ? `${stripped.slice(0, 100)}…` : stripped;
  }
  if (text) return text.length > 100 ? `${text.slice(0, 100)}…` : text;
  const att = (m.attachments as ChatAttachment[] | undefined)?.[0];
  if (!att) return translate("m.common.message");
  if (att.type === "IMAGE" || att.type === "GIF") return translate("m.common.photo");
  if (att.type === "VIDEO") return translate("m.messages.video");
  if (att.type === "AUDIO") return translate("m.messages.voice_message");
  return translate("m.messages.attachment");
}

export function formatBubbleTime(iso: string, locale = "ko") {
  const tag = locale === "ko" ? "ko-KR" : "en-US";
  return new Date(iso).toLocaleTimeString(tag, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Instagram DM lightbox relative time (e.g. "2d ago", "1h ago"). */
export function formatLightboxTime(iso: string, locale = "ko") {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatBubbleTime(iso);

  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return translate("m.common.just_now");
  if (min < 60) return translate("m.messages.min_m_ago", { min: String(min) });

  const hr = Math.floor(min / 60);
  if (hr < 24) return translate("m.messages.hr_h_ago", { hr: String(hr) });

  const day = Math.floor(hr / 24);
  if (day < 7) return translate("m.messages.day_d_ago", { day: String(day) });

  const tag = locale === "ko" ? "ko-KR" : "en-US";
  return new Date(iso).toLocaleDateString(tag, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function shouldShowMessageTime(messages: ChatMessage[], index: number) {
  const cur = messages[index];
  if (!cur) return false;
  const next = messages[index + 1];
  if (!next) return true;
  if (next.sender.id !== cur.sender.id) return true;
  const gap =
    new Date(next.createdAt).getTime() - new Date(cur.createdAt).getTime();
  return gap > 5 * 60_000;
}
