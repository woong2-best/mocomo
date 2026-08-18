"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ContentVisibility } from "@prisma/client";
import { DollarSign } from "lucide-react";
import { PostMediaComposer, type PostMediaItem } from "@/components/media/post-media-composer";
import { ComposePollEditor } from "@/components/compose/compose-poll-editor";
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
  const [showOptions, setShowOptions] = useState(false);
  const [collaborators, setCollaborators] = useState<CollabPickerUser[]>([]);
  const [visibility, setVisibility] = useState<ContentVisibility>("PUBLIC");
  const [priceUsd, setPriceUsd] = useState("");
  const [instantPriceUsd, setInstantPriceUsd] = useState("");
  const [payoutAccountRegistered, setPayoutAccountRegistered] = useState(true);
  const [paidMediaWarned, setPaidMediaWarned] = useState(false);
  const submitBusy = loading || mediaUploading;
  const canSubmit = content.trim().length > 0 || media.length > 0;
  const priceCents = parseUsdDollarsToCents(priceUsd);
  const instantPriceCents = parseUsdDollarsToCents(instantPriceUsd);
  const showInstantPurchase = visibility !== "PUBLIC";
  const paidPriceIntent =
    priceCents > 0 ||
    instantPriceCents > 0 ||
    priceUsd.trim().length > 0 ||
    instantPriceUsd.trim().length > 0;
  const showPaidMediaRequired = paidPriceIntent && media.length === 0;
  const sellingIntent = paidPriceIntent || visibility !== "PUBLIC";
  const showSettlementBanner = !payoutAccountRegistered && sellingIntent;
  const walletCallbackUrl = useMemo(
    () => (pathname?.startsWith("/") ? pathname : undefined),
    [pathname]
  );

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

  const salePriceField = (
    <div
      className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-2.5 py-1.5"
      title="유료 판매 (USD, $1.00~)"
    >
      <DollarSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <Input
        inputMode="decimal"
        placeholder="0"
        value={priceUsd}
        onChange={(e) => setPriceUsd(sanitizeUsdDollarInput(e.target.value))}
        disabled={submitBusy}
        className="h-7 w-[4.5rem] border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
        aria-label="유료 판매 가격 (USD)"
      />
      <span className="text-[10px] font-medium text-muted-foreground shrink-0">USD</span>
    </div>
  );

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

    const pricingErr = validateSaleMediaPricing(priceCents, instantPriceCents);
    if (pricingErr) {
      setError(pricingErr);
      return;
    }

    const payload = {
      title: (form.get("title") as string) || undefined,
      content: contentText,
      communityId,
      isNsfw: form.get("isNsfw") === "on",
      tagNames: tags,
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
        maxVideos={10}
        allowVideoCapture={false}
        onUploadingChange={setMediaUploading}
        afterVideoButton={salePriceField}
      />
      <input
        name="title"
        defaultValue={defaultTitle}
        placeholder="제목 (선택)"
        className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm"
      />
      <textarea
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요..."
        className="w-full min-h-[160px] rounded-xl border border-border bg-background/50 p-3 text-sm resize-y"
      />
      <input
        name="tags"
        placeholder="태그 (쉼표로 구분) 예: 원신, 코스프레"
        className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm"
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
