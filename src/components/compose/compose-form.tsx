"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ContentVisibility } from "@prisma/client";
import { PostMediaComposer, type PostMediaComposerHandle, type PostMediaItem } from "@/components/media/post-media-composer";
import { ComposePollEditor } from "@/components/compose/compose-poll-editor";
import { ComposeSalePriceField } from "@/components/compose/compose-sale-price-field";
import {
  ComposeCollaboratorPicker,
  type CollabPickerUser,
} from "@/components/compose/compose-collaborator-picker";
import { ContentVisibilitySelect } from "@/components/monetization/content-visibility-select";
import { getBankVerificationStatus } from "@/actions/bank-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  syncSettlementAccountToast,
  syncPaidMediaRequiredToast,
} from "@/lib/published-toast-store";
import { SETTLEMENT_ACCOUNT_REQUIRED_CODE, walletSettlementPath } from "@/lib/settlement-account";
import {
  parseUsdDollarsToCents,
  sanitizeUsdDollarInput,
  validateSaleMediaPricing,
} from "@/lib/money";
import { userDisplayName } from "@/lib/user-public-select";
import { NsfwToggleButton } from "@/components/forms/nsfw-toggle-button";
import { ComposeRichTextarea } from "@/components/compose/compose-rich-textarea";
import type { ContentRating } from "@prisma/client";

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
  const router = useRouter();
  const pathname = usePathname();
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
  const [collaborators, setCollaborators] = useState<CollabPickerUser[]>([]);
  const [visibility, setVisibility] = useState<ContentVisibility>("PUBLIC");
  const [priceUsd, setPriceUsd] = useState("");
  const [instantPriceUsd, setInstantPriceUsd] = useState("");
  const [payoutAccountRegistered, setPayoutAccountRegistered] = useState(true);
  const [paidMediaWarned, setPaidMediaWarned] = useState(false);
  const [contentRating, setContentRating] = useState<ContentRating>("GENERAL");
  const mediaComposerRef = useRef<PostMediaComposerHandle>(null);
  const mediaReady =
    media.length === 0 ||
    media.every(
      (m) =>
        !m.url.startsWith("blob:") &&
        !m.url.startsWith("data:") &&
        (m.url.startsWith("http") || m.url.startsWith("/"))
    );
  const submitBusy = loading || mediaUploading || !mediaReady;
  const canSubmit = content.trim().length > 0 || media.length > 0;
  const priceCents = parseUsdDollarsToCents(priceUsd);
  const instantPriceCents = parseUsdDollarsToCents(instantPriceUsd);
  const showInstantPurchase = visibility !== "PUBLIC" && contentRating !== "ADULT";
  const adultBlocksPaid = contentRating === "ADULT";
  const paidPriceIntent =
    !adultBlocksPaid &&
    (priceCents > 0 ||
      instantPriceCents > 0 ||
      priceUsd.trim().length > 0 ||
      instantPriceUsd.trim().length > 0);
  const showPaidMediaRequired = paidPriceIntent && media.length === 0;
  const sellingIntent = paidPriceIntent || visibility !== "PUBLIC";
  const showSettlementBanner = !payoutAccountRegistered && sellingIntent;
  const walletCallbackUrl = useMemo(
    () => (pathname?.startsWith("/") ? pathname : undefined),
    [pathname]
  );

  useEffect(() => {
    if (contentRating !== "ADULT") return;
    setPriceUsd("");
    setInstantPriceUsd("");
    if (visibility !== "PUBLIC") setVisibility("PUBLIC");
  }, [contentRating, visibility]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await getBankVerificationStatus();
      if (cancelled || !status.signedIn) {
        if (!cancelled) setPayoutAccountRegistered(false);
        return;
      }
      setPayoutAccountRegistered(status.payoutAccountRegistered);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    syncSettlementAccountToast(
      showSettlementBanner,
      showSettlementBanner ? walletSettlementPath(walletCallbackUrl) : undefined
    );
  }, [showSettlementBanner, walletCallbackUrl]);

  useEffect(() => {
    if (!showPaidMediaRequired) setPaidMediaWarned(false);
  }, [showPaidMediaRequired]);

  useEffect(() => {
    syncPaidMediaRequiredToast(paidMediaWarned && showPaidMediaRequired && !showSettlementBanner);
  }, [paidMediaWarned, showPaidMediaRequired, showSettlementBanner]);

  useEffect(() => {
    return () => {
      syncSettlementAccountToast(false);
      syncPaidMediaRequiredToast(false);
    };
  }, []);

  const toggleNsfw = () =>
    setContentRating((v) => (v === "ADULT" ? "GENERAL" : "ADULT"));

  const nsfwToggle = (
    <NsfwToggleButton
      active={contentRating === "ADULT"}
      onToggle={toggleNsfw}
      disabled={submitBusy}
    />
  );

  const salePriceField = adultBlocksPaid ? null : (
    <ComposeSalePriceField
      priceUsd={priceUsd}
      onChange={setPriceUsd}
      disabled={submitBusy}
      variant={variant === "inline" ? "toolbar" : "inline"}
    />
  );

  const mediaToolbarExtras = (
    <>
      {salePriceField}
      {nsfwToggle}
    </>
  );

  function handleComposePaste(event: React.ClipboardEvent) {
    mediaComposerRef.current?.handlePaste(event);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (showSettlementBanner) {
      router.push(walletSettlementPath(walletCallbackUrl));
      return;
    }

    if (showPaidMediaRequired) {
      setPaidMediaWarned(true);
      syncPaidMediaRequiredToast(true);
      setError("유료 판매를 하려면 사진 또는 영상을 첨부해 주세요.");
      return;
    }

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

    const pricingErr = validateSaleMediaPricing(priceCents, instantPriceCents);
    if (pricingErr) {
      setError(pricingErr);
      return;
    }

    const payload = {
      title: (form.get("title") as string) || undefined,
      content: contentText,
      communityId,
      contentRating,
      isNsfw: contentRating === "ADULT",
      visibility,
      instantPurchasePriceKrw: instantPriceCents,
      media: media.map((m) => ({
        url: m.url,
        type: m.type,
        priceKrw: priceCents > 0 ? priceCents : 0,
        width: m.width ?? null,
        height: m.height ?? null,
        duration: m.duration ?? null,
      })),
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
        code?: string;
        redirectTo?: string;
      };

      if (!res.ok) {
        if (result.code === SETTLEMENT_ACCOUNT_REQUIRED_CODE && result.redirectTo) {
          router.push(String(result.redirectTo));
          return;
        }
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
      <form onSubmit={handleSubmit} onPasteCapture={handleComposePaste} className="space-y-2">
        <div className="flex gap-3 items-start">
          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/40">
            <AvatarImage src={user?.image ?? undefined} alt="" />
            <AvatarFallback className="text-sm font-semibold bg-folk-cobalt/10 text-folk-cobalt">
              {avatarLabel.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            <ComposeRichTextarea
              name="content"
              value={content}
              onChange={setContent}
              placeholder={t("compose.placeholder")}
              rows={3}
              variant="inline"
              disabled={submitBusy}
            />

            <PostMediaComposer
              ref={mediaComposerRef}
              items={media}
              onChange={setMedia}
              maxImages={100}
              maxVideos={10}
              layout="toolbar"
              allowVideoCapture={false}
              watermarkCreditLabel={watermarkCreditLabel}
              onUploadingChange={setMediaUploading}
              afterVideoButton={salePriceField}
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
                  {nsfwToggle}
                </>
              }
              toolbarFooter={
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-full px-5 font-semibold shrink-0"
                  disabled={submitBusy || !canSubmit}
                >
                  {!mediaReady || mediaUploading
                    ? t("compose.uploading")
                    : loading
                      ? t("compose.posting")
                      : t("compose.post")}
                </Button>
              }
            />

            {poll && (
              <ComposePollEditor value={poll} onChange={setPoll} disabled={submitBusy} />
            )}

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
        </div>
        <input type="hidden" name="contentRating" value={contentRating} />
        {error && <p className="text-sm text-destructive pl-[52px]">{error}</p>}
      </form>
    );
  }

  const formBody = (
    <form onSubmit={handleSubmit} onPasteCapture={handleComposePaste} className="space-y-4">
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
        ref={mediaComposerRef}
        items={media}
        onChange={setMedia}
        watermarkCreditLabel={watermarkCreditLabel}
        maxImages={100}
        maxVideos={10}
        allowVideoCapture={false}
        onUploadingChange={setMediaUploading}
        afterVideoButton={mediaToolbarExtras}
      />
      <input
        name="title"
        defaultValue={defaultTitle}
        placeholder="제목 (선택)"
        className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm"
      />
      <ComposeRichTextarea
        name="content"
        value={content}
        onChange={setContent}
        placeholder="내용을 입력하세요... @멘션 #해시태그"
        variant="default"
        disabled={submitBusy}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ContentVisibilitySelect
          value={visibility}
          onChange={setVisibility}
          disabled={submitBusy}
        />
        {showInstantPurchase ? (
          <div className="space-y-1.5">
            <label htmlFor="compose-instant-price" className="text-xs font-medium text-muted-foreground">
              즉시 구매 (등급 미달 시)
            </label>
            <Input
              id="compose-instant-price"
              inputMode="decimal"
              placeholder="예: 80.00"
              value={instantPriceUsd}
              onChange={(e) => setInstantPriceUsd(sanitizeUsdDollarInput(e.target.value))}
              disabled={submitBusy}
              className="rounded-xl"
            />
          </div>
        ) : null}
      </div>
      {priceUsd.trim() && priceCents === 0 ? (
        <p className="text-xs text-muted-foreground -mt-2">
          유료 판매는 $1.00(1.00 USD) 이상부터 설정할 수 있습니다.
        </p>
      ) : null}
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
      <input type="hidden" name="contentRating" value={contentRating} />
      <Button type="submit" className="w-full rounded-xl" disabled={submitBusy}>
        {!mediaReady || mediaUploading
          ? t("compose.uploading")
          : loading
            ? t("compose.posting")
            : t("compose.post")}
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
