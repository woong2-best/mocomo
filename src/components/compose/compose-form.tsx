"use client";


import { isAuthRequiredError } from "@/lib/error-codes";
import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ContentVisibility } from "@prisma/client";
import { PostMediaComposer, type PostMediaComposerHandle, type PostMediaItem } from "@/components/media/post-media-composer";
import { ComposePollEditor } from "@/components/compose/compose-poll-editor";
import {
  ComposeCollaboratorPicker,
  type CollabPickerUser,
} from "@/components/compose/compose-collaborator-picker";
import { ContentVisibilitySelect } from "@/components/monetization/content-visibility-select";
import { getBankVerificationStatus } from "@/actions/bank-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { QnaIdentityToggle } from "@/components/compose/qna-identity-toggle";
import type { ContentRating } from "@prisma/client";
import { ComposeQuotedPostPreview } from "@/components/compose/compose-quoted-post-preview";

function friendlyPostError(err: unknown, apiError?: string): string {
  if (apiError) return apiError;
  if (err instanceof Error) {
    if (err.message.includes("Server Components render")) {
      return t("compose.sjl124v");
    }
    return err.message;
  }
  return t("compose.s1o4lvs7");
}

export function ComposeForm({
  communityId,
  variant = "page",
  initialContent,
  initialTitle,
  quotedPostId,
  quotedAuthorUsername,
  quotedPreview,
  onPosted,
  onNeedSignIn,
}: {
  communityId?: string;
  variant?: "page" | "sheet" | "inline";
  initialContent?: string;
  initialTitle?: string;
  quotedPostId?: string;
  quotedAuthorUsername?: string;
  quotedPreview?: string;
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
  const [instantPriceUsd, setInstantPriceUsd] = useState("");
  const [payoutAccountRegistered, setPayoutAccountRegistered] = useState(true);
  const [paidMediaWarned, setPaidMediaWarned] = useState(false);
  const [contentRating, setContentRating] = useState<ContentRating>("GENERAL");
  const [isAnonymous, setIsAnonymous] = useState(false);
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
  const isQuoteCompose = Boolean(quotedPostId);
  const canSubmit =
    content.trim().length > 0 || media.length > 0 || (isQuoteCompose && !submitBusy);
  const instantPriceCents = parseUsdDollarsToCents(instantPriceUsd);
  const paidMediaCents = media.reduce((max, m) => Math.max(max, m.priceKrw ?? 0), 0);
  const showInstantPurchase = visibility !== "PUBLIC" && contentRating !== "ADULT";
  const adultBlocksPaid = contentRating === "ADULT";
  const paidAttachEnabled = !isQuoteCompose && !communityId && !adultBlocksPaid;
  const paidPriceIntent =
    !adultBlocksPaid &&
    (instantPriceCents > 0 || instantPriceUsd.trim().length > 0 || paidMediaCents > 0);
  const showPaidMediaRequired = paidPriceIntent && media.length === 0 && paidMediaCents === 0;
  const sellingIntent = paidPriceIntent || visibility !== "PUBLIC";
  const showSettlementBanner = !payoutAccountRegistered && sellingIntent;
  const walletCallbackUrl = useMemo(
    () => (pathname?.startsWith("/") ? pathname : undefined),
    [pathname]
  );

  useEffect(() => {
    if (contentRating !== "ADULT") return;
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

  const toggleNsfw = () => {
    if (contentRating !== "ADULT" && media.some((m) => (m.priceKrw ?? 0) > 0)) {
      setError(t("compose.attach.nsfwBlocked"));
      return;
    }
    setContentRating((v) => (v === "ADULT" ? "GENERAL" : "ADULT"));
  };

  const nsfwToggle = (
    <NsfwToggleButton
      active={contentRating === "ADULT"}
      onToggle={toggleNsfw}
      disabled={submitBusy}
    />
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
      setError(t("compose.s1ioviby"));
      return;
    }

    const invalidMedia = media.some(
      (m) =>
        m.url.startsWith("blob:") ||
        m.url.startsWith("data:") ||
        (!m.url.startsWith("http") && !m.url.startsWith("/"))
    );
    if (invalidMedia) {
      setError(t("compose.sm205eh"));
      return;
    }

    const form = new FormData(e.currentTarget);
    const contentText =
      content.trim() || String(form.get("content") ?? "").trim();

    if (!contentText && media.length === 0 && !quotedPostId) return;

    if (poll) {
      const pollErr = validatePostPollInput(poll);
      if (pollErr) {
        setError(pollErr);
        return;
      }
    }

    const pricingErr = validateSaleMediaPricing(paidMediaCents, instantPriceCents);
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
        priceKrw: communityId || contentRating === "ADULT" ? 0 : Math.max(0, Math.floor(m.priceKrw ?? 0)),
        width: m.width ?? null,
        height: m.height ?? null,
        duration: m.duration ?? null,
      })),
      poll: poll ?? undefined,
      collaboratorUserIds: isAnonymous ? [] : collaborators.map((c) => c.id),
      isAnonymous: Boolean(communityId) && isAnonymous,
      quotedPostId,
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
      userImage: communityId && isAnonymous ? null : authorAvatar?.image,
      userName: communityId && isAnonymous ? t("lib.tests.community.author.test.sf130c4ef01") : authorAvatar?.name,
      avatars:
        communityId && isAnonymous
          ? undefined
          : avatars.length > 0
            ? avatars
            : undefined,
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
        if (res.status === 401 || isAuthRequiredError(result.error)) {
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
      setError(errorText(result.error ?? t("toast.publishFailed")));
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
    return (
      <form onSubmit={handleSubmit} onPasteCapture={handleComposePaste} className="space-y-2">
        <div className="min-w-0 space-y-3">
          <ComposeRichTextarea
            name="content"
            value={content}
            onChange={setContent}
            placeholder={t("compose.placeholder")}
            rows={3}
            variant="inline"
            disabled={submitBusy}
          />
          {quotedPostId ? <ComposeQuotedPostPreview postId={quotedPostId} /> : null}

          <PostMediaComposer
            ref={mediaComposerRef}
            items={media}
            onChange={setMedia}
            maxImages={100}
            maxVideos={10}
            layout="toolbar"
            allowVideoCapture={false}
            enablePaidAttach={paidAttachEnabled}
            watermarkCreditLabel={watermarkCreditLabel}
            onUploadingChange={setMediaUploading}
            toolbarFooterStart={
              isQuoteCompose ? null : (
                <>
                  {!poll && (
                    <ComposePollEditor
                      value={poll}
                      onChange={setPoll}
                      disabled={submitBusy}
                      compact
                    />
                  )}
                  {!isAnonymous && (
                    <ComposeCollaboratorPicker
                      compact
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
                  {communityId ? (
                    <QnaIdentityToggle
                      anonymous={isAnonymous}
                      onChange={setIsAnonymous}
                      disabled={submitBusy}
                    />
                  ) : null}
                  {nsfwToggle}
                </>
              )
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

          {!isAnonymous && (
            <ComposeCollaboratorPicker
              chipsOnly
              selected={collaborators}
              onChange={setCollaborators}
            />
          )}
        </div>
        <input type="hidden" name="contentRating" value={contentRating} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    );
  }

  const formBody = (
    <form onSubmit={handleSubmit} onPasteCapture={handleComposePaste} className="space-y-4">
      {variant === "sheet" && !isQuoteCompose && (
        <p className="text-sm text-muted-foreground -mt-1">
          {t("compose.s1ckvxjo")}
        </p>
      )}
      {isQuoteCompose ? (
        <>
          <ComposeRichTextarea
            name="content"
            value={content}
            onChange={setContent}
            placeholder={t("compose.placeholder")}
            variant="default"
            disabled={submitBusy}
          />
          {quotedPostId ? <ComposeQuotedPostPreview postId={quotedPostId} /> : null}
          <PostMediaComposer
            ref={mediaComposerRef}
            items={media}
            onChange={setMedia}
            watermarkCreditLabel={watermarkCreditLabel}
            maxImages={100}
            maxVideos={10}
            allowVideoCapture={false}
            enablePaidAttach={paidAttachEnabled}
            onUploadingChange={setMediaUploading}
          />
        </>
      ) : (
        <>
          <PostMediaComposer
            ref={mediaComposerRef}
            items={media}
            onChange={setMedia}
            watermarkCreditLabel={watermarkCreditLabel}
            maxImages={100}
            maxVideos={10}
            allowVideoCapture={false}
            enablePaidAttach={paidAttachEnabled}
            onUploadingChange={setMediaUploading}
            afterVideoButton={nsfwToggle}
          />
          <input
            name="title"
            defaultValue={defaultTitle}
            placeholder={t("compose.sdvk5qv")}
            className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm"
          />
          <ComposeRichTextarea
            name="content"
            value={content}
            onChange={setContent}
            placeholder={t("compose.s1ndj4vm")}
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
                  {t("compose.s14qd7a6")}
                </label>
                <Input
                  id="compose-instant-price"
                  inputMode="decimal"
                  placeholder={t("compose.80_00")}
                  value={instantPriceUsd}
                  onChange={(e) => setInstantPriceUsd(sanitizeUsdDollarInput(e.target.value))}
                  disabled={submitBusy}
                  className="rounded-xl"
                />
              </div>
            ) : null}
          </div>
          <ComposePollEditor value={poll} onChange={setPoll} disabled={submitBusy} />
        </>
      )}
      {!isQuoteCompose && !isAnonymous && (
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
      {!isQuoteCompose && communityId ? (
        <QnaIdentityToggle
          anonymous={isAnonymous}
          onChange={setIsAnonymous}
          disabled={submitBusy}
        />
      ) : null}
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
        <h2 className="font-bold text-folk-cobalt">{t("feed.compose")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("compose.s1ckvxjo")}
        </p>
      </div>
      {formBody}
    </div>
  );
}
