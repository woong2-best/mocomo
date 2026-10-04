import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { fetchCreatorPayoutReady, isStripeAccountNotReady } from "@/lib/creator-payout";
import { useQuery } from "@tanstack/react-query";
import { previewLiveVideoDonation, postLiveMocoDonation } from "@/api/live-donate";
import { ApiError } from "@/api/client";
import { fetchGemsWallet } from "@/api/gems";
import { mocoPurchaseTermsCopy } from "@/lib/gems/constants";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  channelId: string;
  onSuccess?: () => void;
};

type Quote = {
  videoId: string;
  videoTitle: string | null;
  durationSec: number;
  playSec: number;
  maxPlaySec: number;
  mocoLabel: string;
  usdCents: number;
};

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    const err = (e.body as { error: unknown }).error;
    if (typeof err === "string") return err;
  }
  return e instanceof Error ? e.message : fallback;
}

export function LiveMocoVideoDonationSheet({ visible, onClose, channelId, onSuccess }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const payoutBlockedMsg = t("m.live.this_creator_has_not_linked_a");
  const payoutToastMsg = t("m.live.this_creator_has_not_linked_a_2");
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<1 | 2>(1);
  const [urlInput, setUrlInput] = useState("");
  const [message, setMessage] = useState("");
  const [startSec, setStartSec] = useState("0");
  const [playSec, setPlaySec] = useState("10");
  const [noRefundAccepted, setNoRefundAccepted] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const payout = useQuery({
    queryKey: ["payout-ready", channelId],
    queryFn: () => fetchCreatorPayoutReady(channelId),
    enabled: visible && !!channelId,
  });
  const payoutBlocked = payout.data?.payoutsEnabled === false;
  const [error, setError] = useState("");

  const wallet = useQuery({
    queryKey: ["gems-wallet"],
    queryFn: fetchGemsWallet,
    enabled: visible,
  });

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setUrlInput("");
      setMessage("");
      setStartSec("0");
      setPlaySec("10");
      setNoRefundAccepted(false);
      setQuote(null);
      setError("");
      setTermsAccepted(false);
    }
  }, [visible]);

  async function loadQuote(mediaUrl: string, nextPlay = playSec, nextStart = startSec): Promise<Quote | null> {
    setQuoteLoading(true);
    setError("");
    try {
      const start = Math.max(0, Math.floor(Number(nextStart) || 0));
      const seconds = Math.max(1, Math.floor(Number(nextPlay) || 1));
      const res = await previewLiveVideoDonation(channelId, {
        media_url: mediaUrl,
        play_sec: seconds,
        start_sec: start,
      });
      if (!res.ok || !res.video_id) {
        setError(res.error ?? t("m.live.could_not_load_the_video"));
        setQuote(null);
        return null;
      }
      const next: Quote = {
        videoId: res.video_id,
        videoTitle: res.video_title ?? null,
        durationSec: res.duration_sec ?? seconds,
        playSec: res.play_sec ?? seconds,
        maxPlaySec: res.max_play_sec ?? 60,
        mocoLabel: res.moco_label ?? "",
        usdCents: res.usd_cents ?? 0,
      };
      setQuote(next);
      setPlaySec(String(next.playSec));
      return next;
    } catch (e) {
      setError(apiErrorMessage(e, t("m.live.could_not_load_the_video")));
      setQuote(null);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }

  async function goNext() {
    const url = urlInput.trim();
    if (!url) {
      setError(t("m.live.enter_a_youtube_url"));
      return;
    }
    const q = (await loadQuote(url, "10", "0")) ?? (await loadQuote(url, "1", "0"));
    if (q) setStep(2);
  }

  async function submit() {
    if (!termsAccepted || !noRefundAccepted) {
      setError(t("m.live.accept_the_terms_before_tipping"));
      return;
    }
    const url = urlInput.trim();
    if (!url || !quote) {
      setError(t("m.live.recheck_the_video_quote"));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const start = Math.max(0, Math.floor(Number(startSec) || 0));
      const seconds = Math.max(1, Math.floor(Number(playSec) || 1));
      const res = await postLiveMocoDonation(channelId, {
        type: "VIDEO",
        media_url: url,
        message: message.trim() || undefined,
        play_sec: seconds,
        start_sec: start,
      });
      if (!res.success) {
        setError(res.error ?? t("m.live.tip_failed"));
        return;
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      if (isStripeAccountNotReady(e)) {
        showIslandError(t("m.live.tip_unavailable"), payoutToastMsg);
        setError(payoutBlockedMsg);
      } else if (e instanceof ApiError && e.status === 402) {
        showIslandError(
          t("m.live.not_enough_moco"),
          t("m.live.top_up_moco_on_mocomo_net")
        );
      } else {
        setError(apiErrorMessage(e, t("m.live.tip_failed")));
      }
    } finally {
      setBusy(false);
    }
  }

  const balance = wallet.data?.balance;
  const thumbUri = quote ? `https://i.ytimg.com/vi/${quote.videoId}/hqdefault.jpg` : null;

  return (
    <KeyboardSheet visible={visible} onClose={onClose} maxHeight="92%" sheetStyle={{ backgroundColor: colors.surface }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t("m.live.youtube_video_tip")}</Text>
        <Text style={styles.step}>
          {step === 1 ? "1/2 · URL" : "2/2 · Length and amount"}
        </Text>
        {typeof balance === "number" ? (
          <Text style={styles.balance}>
            {t("m.live.moco_balance")} {balance.toLocaleString()}
          </Text>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={styles.label}>YouTube URL</Text>
            <TextInput
              style={styles.input}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://www.youtube.com/watch?v=…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.label}>{t("m.live.message_optional")}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={(t) => setMessage(t.slice(0, 500))}
              placeholder={t("m.live.shown_on_stream")}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.submit, styles.submitGreen, quoteLoading && styles.submitDisabled]} disabled={quoteLoading} onPress={() => void goNext()}>
              {quoteLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t("m.common.next")}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {quote ? (
              <>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {quote.videoTitle ?? t("m.live.youtube_video")}
                </Text>
                {thumbUri ? (
                  <Image source={{ uri: thumbUri }} style={styles.thumb} resizeMode="cover" />
                ) : null}

                <View style={styles.row2}>
                  <View style={styles.half}>
                    <Text style={styles.label}>{t("m.live.start_sec")}</Text>
                    <TextInput
                      style={styles.input}
                      value={startSec}
                      onChangeText={setStartSec}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>{t("m.live.playback_seconds")}</Text>
                    <TextInput
                      style={styles.input}
                      value={playSec}
                      onChangeText={(value) => {
                        const cap = Math.min(quote.maxPlaySec, Math.max(1, quote.durationSec - Math.floor(Number(startSec) || 0)));
                        const n = Math.floor(Number(value.replace(/\D/g, "")) || 0);
                        if (!value) {
                          setPlaySec("");
                          return;
                        }
                        setPlaySec(String(Math.min(cap, Math.max(1, n))));
                      }}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <Text style={styles.quoteSub}>
                  Video {quote.durationSec}s · creator max {quote.maxPlaySec}s
                </Text>

                <Pressable
                  style={styles.outlineBtn}
                  disabled={quoteLoading}
                  onPress={() => void loadQuote(urlInput.trim())}
                >
                  {quoteLoading ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.outlineBtnText}>
                      {t("m.live.recalculate_moco_after_segment_change")}
                    </Text>
                  )}
                </Pressable>

                <View style={styles.quoteBox}>
                  <Text style={styles.quoteSub}>Amount due</Text>
                  <Text style={styles.quoteMoco}>{quote.mocoLabel} MOCO</Text>
                  <Text style={styles.quoteSub}>${(quote.usdCents / 100).toFixed(2)}</Text>
                </View>
              </>
            ) : null}

            <Pressable style={styles.termsRow} onPress={() => setNoRefundAccepted((v) => !v)}>
              <View style={[styles.checkbox, noRefundAccepted && styles.checkboxOn]} />
              <Text style={styles.termsText}>{t("m.live.video_donation_no_refund")}</Text>
            </Pressable>

            <Pressable style={styles.termsRow} onPress={() => setTermsAccepted((v) => !v)}>
              <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]} />
              <Text style={styles.termsText}>{mocoPurchaseTermsCopy()}</Text>
            </Pressable>

            {payoutBlocked ? <Text style={styles.error}>{payoutBlockedMsg}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Pressable style={[styles.outlineBtn, styles.flex1]} onPress={() => setStep(1)}>
                <Text style={styles.outlineBtnText}>{t("m.common.back")}</Text>
              </Pressable>
              <Pressable
                style={[styles.submit, styles.submitGreen, styles.flex1, (busy || !quote || payoutBlocked) && styles.submitDisabled]}
                disabled={busy || !quote || payoutBlocked}
                onPress={() => void submit()}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t("m.live.youtube_video_tip")}</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    step: { fontSize: 11, fontWeight: "700", color: colors.textMuted, marginTop: 2 },
    balance: { marginTop: 6, fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm },
    label: { fontSize: 12, fontWeight: "800", color: colors.textMuted, marginTop: 8, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontWeight: "600",
      backgroundColor: colors.muted,
    },
    textarea: { minHeight: 72, textAlignVertical: "top" },
    videoTitle: { fontSize: 14, fontWeight: "800", color: colors.text, marginTop: 8 },
    thumb: { width: "100%", aspectRatio: 16 / 9, borderRadius: radii.md, marginTop: 8, backgroundColor: colors.muted },
    row2: { flexDirection: "row", gap: 10, marginTop: 8 },
    half: { flex: 1 },
    playToEndRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    playToEndText: { fontSize: 13, fontWeight: "600", color: colors.text },
    outlineBtn: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.muted,
    },
    outlineBtnText: { fontWeight: "800", color: colors.text, fontSize: 13 },
    quoteBox: {
      marginTop: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: "#E85D0444",
      backgroundColor: "#FFF8F0",
      padding: 12,
      alignItems: "center",
    },
    quoteSub: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
    quoteMoco: { fontSize: 22, fontWeight: "900", color: "#E85D04", marginTop: 4 },
    termsRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginVertical: 12 },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      marginTop: 2,
    },
    checkboxOn: { backgroundColor: "#0d4d2c", borderColor: "#0d4d2c" },
    termsText: { flex: 1, fontSize: 10, lineHeight: 15, color: colors.textMuted, fontWeight: "600" },
    actions: { flexDirection: "row", gap: 10, marginBottom: spacing.lg },
    flex1: { flex: 1 },
    submit: {
      backgroundColor: "#E85D04",
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 12,
    },
    submitGreen: { backgroundColor: "#0d4d2c", marginTop: 0 },
    submitDisabled: { opacity: 0.55 },
    submitText: { color: "#fff", fontWeight: "900", fontSize: 15 },
    error: { color: colors.danger, fontWeight: "600", fontSize: 12, marginTop: 8 },
  });
}
