"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";
import { ComposePollEditor } from "@/components/compose/compose-poll-editor";
import {
  ComposeCollaboratorPicker,
  type CollabPickerUser,
} from "@/components/compose/compose-collaborator-picker";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CreatePostPollInput } from "@/lib/post-poll";
import { validatePostPollInput } from "@/lib/post-poll";
import { buildPostCreditLabel } from "@/lib/media-watermark";
import { useLocale } from "@/components/providers/locale-provider";
import { usePublishedToastOptional } from "@/components/providers/published-toast-provider";
import {
  pushErrorToast,
  pushPublishedToast,
  pushPublishingToast,
} from "@/lib/published-toast-store";
import { userDisplayName } from "@/lib/user-public-select";
import { cn } from "@/lib/utils";

function friendlyPostError(err: unknown, apiError?: string): string {
  if (apiError) return apiError;
  if (err instanceof Error) {
    if (err.message.includes("Server Components render")) {
      return "게시 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    }
    return err.message;
  }
  return "연결 오류가 발생했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.";
}

export function ComposeForm({
  communityId,
  variant = "page",
  initialContent,
  initialTitle,
  onPosted,
  onNeedSignIn,
}: {
  communityId?: string;
  variant?: "page" | "sheet" | "inline";
  initialContent?: string;
  initialTitle?: string;
  onPosted?: (postId: string) => void;
  onNeedSignIn?: () => void;
}) {
  const { data: session } = useSession();
  const { t } = useLocale();
  const publishedToast = usePublishedToastOptional();
  const watermarkCreditLabel = useMemo(
    () => (session?.user?.username ? buildPostCreditLabel(session.user.username) : undefined),
    [session?.user?.username]
  );
  const [loading, setLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<PostMediaItem[]>([]);
  const [poll, setPoll] = useState<CreatePostPollInput | null>(null);
  const [content, setContent] = useState(initialContent ?? "");
  const [defaultTitle] = useState(initialTitle ?? "");
  const [showOptions, setShowOptions] = useState(false);
  const [collaborators, setCollaborators] = useState<CollabPickerUser[]>([]);
  const submitBusy = loading || mediaUploading;
  const canSubmit = content.trim().length > 0 || media.length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const invalidMedia = media.some(
      (m) =>
        m.url.startsWith("blob:") ||
        m.url.startsWith("data:") ||
        (!m.url.startsWith("http") && !m.url.startsWith("/"))
    );
    if (invalidMedia) {
      setError("사진·영상 업로드가 끝난 뒤 다시 시도해 주세요.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const tags = (form.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean);
    const contentText =
      content.trim() || String(form.get("content") ?? "").trim();

    if (!contentText && media.length === 0) return;

    if (poll) {
      const pollErr = validatePostPollInput(poll);
      if (pollErr) {
        setError(pollErr);
        return;
      }
    }

    const payload = {
      title: (form.get("title") as string) || undefined,
      content: contentText,
      communityId,
      isNsfw: form.get("isNsfw") === "on",
      tagNames: tags,
      media: media.map((m) => ({ url: m.url, type: m.type })),
      poll: poll ?? undefined,
      collaboratorUserIds: collaborators.map((c) => c.id),
    };

    setLoading(true);
    setError("");
    const authorAvatar = session?.user
      ? {
          image: session.user.image,
          name: userDisplayName({
            username: session.user.username ?? "",
            name: session.user.name,
          }),
        }
      : null;
    const collabAvatars = collaborators.map((c) => ({
      image: c.image,
      name: userDisplayName(c),
    }));
    const avatars = [
      ...(authorAvatar ? [authorAvatar] : []),
      ...collabAvatars,
    ].slice(0, 3);
    const toastUser = {
      userImage: authorAvatar?.image,
      userName: authorAvatar?.name,
      avatars: avatars.length > 0 ? avatars : undefined,
    };

    // context + module store 둘 다 — remount 되어도 toast 유지
    (publishedToast?.showPublishingToast ?? pushPublishingToast)({
      ...toastUser,
      message: t("compose.posting"),
    });

    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = (await res.json().catch(() => ({}))) as {
        postId?: string;
        error?: string;
      };

      if (!res.ok) {
        const msg = result.error ?? t("toast.publishFailed");
        setError(msg);
        (publishedToast?.showErrorToast ?? pushErrorToast)({
          message: t("toast.publishFailed"),
          detail: t("toast.retry"),
        });
        if (res.status === 401 || msg.includes("로그인")) {
          onNeedSignIn?.();
        }
        return;
      }

      if (result.postId) {
        (publishedToast?.showPublishedToast ?? pushPublishedToast)({
          postId: result.postId,
          ...toastUser,
          message: t("toast.published"),
        });
        onPosted?.(result.postId);
        return;
      }
      setError(result.error ?? t("toast.publishFailed"));
      (publishedToast?.showErrorToast ?? pushErrorToast)({
        message: t("toast.publishFailed"),
        detail: t("toast.retry"),
      });
    } catch (err) {
      console.error("[ComposeForm] createPost", err);
      setError(friendlyPostError(err));
      (publishedToast?.showErrorToast ?? pushErrorToast)({
        message: t("toast.publishFailed"),
        detail: t("toast.retry"),
      });
    } finally {
      setLoading(false);
    }
  }

  if (variant === "inline") {
    const user = session?.user;
    const avatarLabel =
      user?.name?.trim()?.[0] ?? user?.username?.trim()?.[0] ?? "?";

    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-3 items-start">
          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/40">
            <AvatarImage src={user?.image ?? undefined} alt="" />
            <AvatarFallback className="text-sm font-semibold bg-folk-cobalt/10 text-folk-cobalt">
              {avatarLabel.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("compose.placeholder")}
              rows={3}
              className={cn(
                "w-full resize-none bg-transparent text-[15px] leading-relaxed",
                "placeholder:text-muted-foreground/70 outline-none border-0 p-0 min-h-[72px]"
              )}
            />

            <PostMediaComposer
              items={media}
              onChange={setMedia}
              maxImages={100}
              maxVideos={1}
              layout="toolbar"
              allowVideoCapture={false}
              watermarkCreditLabel={watermarkCreditLabel}
              onUploadingChange={setMediaUploading}
              toolbarFooterStart={
                <>
                  {!poll && (
                    <ComposePollEditor
                      value={poll}
                      onChange={setPoll}
                      disabled={submitBusy}
                      compact
                    />
                  )}
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/60 shrink-0"
                    onClick={() => setShowOptions((v) => !v)}
                  >
                    {showOptions ? t("compose.optionsClose") : t("compose.optionsOpen")}
                  </button>
                </>
              }
              toolbarFooter={
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-full px-5 font-semibold shrink-0"
                  disabled={submitBusy || !canSubmit}
                >
                  {mediaUploading ? t("compose.uploading") : loading ? t("compose.posting") : t("compose.post")}
                </Button>
              }
            />

            {poll && (
              <ComposePollEditor value={poll} onChange={setPoll} disabled={submitBusy} />
            )}

            {showOptions && (
              <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
                <input
                  name="tags"
                  placeholder="태그 (쉼표로 구분)"
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="isNsfw" />
                  {t("compose.tagsNsfw")}
                </label>
                <ComposeCollaboratorPicker
                  selected={collaborators}
                  onChange={setCollaborators}
                  disabled={submitBusy}
                  labels={{
                    add: t("compose.collabAdd"),
                    search: t("compose.collabSearch"),
                    following: t("compose.collabFollowing"),
                    maxReached: t("compose.collabMax"),
                  }}
                />
              </div>
            )}

            {!showOptions && (
              <ComposeCollaboratorPicker
                selected={collaborators}
                onChange={setCollaborators}
                disabled={submitBusy}
                labels={{
                  add: t("compose.collabAdd"),
                  search: t("compose.collabSearch"),
                  following: t("compose.collabFollowing"),
                  maxReached: t("compose.collabMax"),
                }}
              />
            )}
          </div>
        </div>
        {error && <p className="text-sm text-destructive pl-[52px]">{error}</p>}
      </form>
    );
  }

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {variant === "sheet" && (
        <p className="text-sm text-muted-foreground -mt-1">
          사진·영상을 고른 뒤, 앱 안에서 자르기·구간 편집할 수 있습니다.
          {watermarkCreditLabel ? (
            <span className="block mt-1 text-xs">
              사진·영상을 첨부하면 사선·하단 워터마크를 선택할 수 있습니다. (
              <span className="font-medium">{watermarkCreditLabel}</span>)
            </span>
          ) : null}
        </p>
      )}
      <PostMediaComposer
        items={media}
        onChange={setMedia}
        watermarkCreditLabel={watermarkCreditLabel}
        maxImages={100}
        maxVideos={1}
        allowVideoCapture={false}
        onUploadingChange={setMediaUploading}
      />
      <input
        name="title"
        defaultValue={defaultTitle}
        placeholder="제목 (선택)"
        className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm"
      />
      <textarea
        name="content"
        defaultValue={initialContent}
        placeholder="내용을 입력하세요..."
        required
        className="w-full min-h-[160px] rounded-xl border border-border bg-background/50 p-3 text-sm resize-y"
      />
      <input
        name="tags"
        placeholder="태그 (쉼표로 구분) 예: 원신, 코스프레"
        className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm"
      />
      <ComposePollEditor value={poll} onChange={setPoll} disabled={submitBusy} />
      <ComposeCollaboratorPicker
        selected={collaborators}
        onChange={setCollaborators}
        disabled={submitBusy}
        labels={{
          add: t("compose.collabAdd"),
          search: t("compose.collabSearch"),
          following: t("compose.collabFollowing"),
          maxReached: t("compose.collabMax"),
        }}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isNsfw" />
        NSFW
      </label>
      <Button type="submit" className="w-full rounded-xl" disabled={submitBusy}>
        {mediaUploading ? t("compose.uploading") : loading ? t("compose.posting") : t("compose.post")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );

  if (variant === "sheet") {
    return formBody;
  }

  return (
    <div className="folk-card p-5 space-y-4">
      <div>
        <h2 className="font-bold text-folk-cobalt">글쓰기</h2>
        <p className="text-sm text-muted-foreground mt-1">
          사진·영상 파일을 고른 뒤 편집할 수 있습니다.
        </p>
      </div>
      {formBody}
    </div>
  );
}
