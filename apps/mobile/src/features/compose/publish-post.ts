import { createPost } from "@/api/posts";
import { uploadLocalFile } from "@/api/upload-file";
import type { CollaboratorDraft, LocalMediaDraft, PollDraft } from "@/features/compose/compose-types";
import { validatePollDraft } from "@/features/compose/compose-types";
import { uiText } from "@/i18n/ui-text";

function guessMime(filename: string, fallback: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return fallback;
}

async function uploadLocalMedia(item: LocalMediaDraft) {
  const mime =
    item.mime ||
    guessMime(item.filename, item.type === "VIDEO" ? "video/mp4" : "image/jpeg");
  const url = await uploadLocalFile({
    uri: item.uri,
    filename: item.filename,
    contentType: mime,
    category: item.type === "VIDEO" ? "video" : "image",
  });
  return {
    url,
    type: item.type,
    width: item.width,
    height: item.height,
    duration: item.duration != null ? Math.round(item.duration) : undefined,
  };
}

export async function publishComposePost(input: {
  content: string;
  media: LocalMediaDraft[];
  poll: PollDraft | null;
  collaborators: CollaboratorDraft[];
  isNsfw?: boolean;
  quotedPostId?: string;
  locale?: string;
}) {
  const content = input.content.trim();
  const locale = input.locale;
  if (input.poll) {
    const pollErr = validatePollDraft(input.poll, locale);
    if (pollErr) throw new Error(pollErr);
    if (!content) {
      throw new Error(uiText(locale, "투표 질문을 본문에 적어 주세요.", "Write the poll question in the post body."));
    }
  } else if (!content && input.media.length === 0 && !input.quotedPostId) {
    throw new Error(uiText(locale, "글 또는 사진을 추가해 주세요.", "Add text or a photo."));
  }

  const media = [];
  for (const item of input.media) {
    media.push(await uploadLocalMedia(item));
  }

  const poll = input.poll
    ? {
        options: input.poll.options.map((o) => o.trim()).filter(Boolean),
        durationMinutes: input.poll.durationMinutes,
      }
    : undefined;

  return createPost({
    content: content || (media.length > 0 ? "" : content),
    media,
    poll,
    collaboratorUserIds: input.collaborators.map((c) => c.id),
    isNsfw: input.isNsfw ?? false,
    quotedPostId: input.quotedPostId,
  });
}
