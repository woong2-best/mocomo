import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { previewLiveVideoDonation, postLiveMocoDonation } from "@/api/live-donate";
import { ApiError } from "@/api/client";
import { fetchGemsWallet } from "@/api/gems";
import { formatSecLabel } from "@/lib/format-sec-label";
import { MOCO_PURCHASE_TERMS_COPY } from "@/lib/gems/constants";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
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
  segmentSec: number;
  maxPlaySec: number;
  mocoAmount: number;
};

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    const err = (e.body as { error: unknown }).error;
    if (typeof err === "string") return err;
  }
  return e instanceof Error ? e.message : fallback;
}

export function LiveMocoVideoDonationSheet({ visible, onClose, channelId, onSuccess }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<1 | 2>(1);
  const [urlInput, setUrlInput] = useState("");
  const [message, setMessage] = useState("");
  const [startSec, setStartSec] = useState("0");
  const [endSec, setEndSec] = useState("30");
  const [playToEnd, setPlayToEnd] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
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
      setEndSec("30");
      setPlayToEnd(false);
      setQuote(null);
      setError("");
      setTermsAccepted(false);
    }
  }, [visible]);

  async function loadQuote(mediaUrl: string): Promise<Quote | null> {
    setQuoteLoading(true);
    setError("");
    try {
      const start = Math.max(0, Math.floor(Number(startSec) || 0));
      const end = Math.max(start + 1, Math.floor(Number(endSec) || 0));
      const res = await previewLiveVideoDonation(channelId, {
        media_url: mediaUrl,
        start_sec: start,
        end_sec: playToEnd ? null : end,
        play_to_end: playToEnd,
      });
      if (!res.ok || !res.video_id) {
        setError(res.error ?? "영상을 확인할 수 없습니다.");
        setQuote(null);
        return null;
      }
      const next: Quote = {
        videoId: res.video_id,
        videoTitle: res.video_title ?? null,
        segmentSec: res.segment_sec ?? 0,
        maxPlaySec: res.max_play_sec ?? 60,
        mocoAmount: res.moco_amount ?? 0,
      };
      setQuote(next);
      return next;
    } catch (e) {
      setError(apiErrorMessage(e, "영상을 확인할 수 없습니다."));
      setQuote(null);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }

  async function goNext() {
    const url = urlInput.trim();
    if (!url) {
      setError("YouTube URL을 입력해 주세요.");
      return;
    }
    const q = await loadQuote(url);
    if (q) setStep(2);
  }

  async function submit() {
    if (!termsAccepted) {
      setError("후원 전 약관에 동의해 주세요.");
      return;
    }
    const url = urlInput.trim();
    if (!url || !quote) {
      setError("영상 견적을 다시 확인해 주세요.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const start = Math.max(0, Math.floor(Number(startSec) || 0));
      const end = Math.max(start + 1, Math.floor(Number(endSec) || 0));
      const res = await postLiveMocoDonation(channelId, {
        type: "VIDEO",
        media_url: url,
        message: message.trim() || undefined,
        start_sec: start,
        end_sec: playToEnd ? null : end,
        play_to_end: playToEnd,
      });
      if (!res.success) {
        setError(res.error ?? "후원에 실패했습니다.");
        return;
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        Alert.alert("MOCO 부족", "mocomo.net 웹사이트에서 MOCO를 충전한 뒤 다시 시도해 주세요.");
      } else {
        setError(apiErrorMessage(e, "후원에 실패했습니다."));
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
        <Text style={styles.title}>YouTube 영상 후원</Text>
        <Text style={styles.step}>{step === 1 ? "1/2 · URL" : "2/2 · 구간 · MOCO"}</Text>
        {typeof balance === "number" ? (
          <Text style={styles.balance}>보유 MOCO: {balance.toLocaleString()}</Text>
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
            <Text style={styles.label}>메시지 (선택)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={(t) => setMessage(t.slice(0, 500))}
              placeholder="방송 화면에 함께 표시"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.submit, styles.submitGreen, quoteLoading && styles.submitDisabled]} disabled={quoteLoading} onPress={() => void goNext()}>
              {quoteLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>다음</Text>}
            </Pressable>
          </>
        ) : (
          <>
            {quote ? (
              <>
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {quote.videoTitle ?? "YouTube 영상"}
                </Text>
                {thumbUri ? (
                  <Image source={{ uri: thumbUri }} style={styles.thumb} resizeMode="cover" />
                ) : null}

                <View style={styles.row2}>
                  <View style={styles.half}>
                    <Text style={styles.label}>시작(초)</Text>
                    <TextInput
                      style={styles.input}
                      value={startSec}
                      onChangeText={setStartSec}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>끝(초)</Text>
                    <TextInput
                      style={styles.input}
                      value={endSec}
                      onChangeText={setEndSec}
                      keyboardType="number-pad"
                      editable={!playToEnd}
                    />
                  </View>
                </View>

                <Pressable style={styles.playToEndRow} onPress={() => setPlayToEnd((v) => !v)}>
                  <View style={[styles.checkbox, playToEnd && styles.checkboxOn]} />
                  <Text style={styles.playToEndText}>끝까지 재생 (최대 {quote.maxPlaySec}초)</Text>
                </Pressable>

                <Pressable
                  style={styles.outlineBtn}
                  disabled={quoteLoading}
                  onPress={() => void loadQuote(urlInput.trim())}
                >
                  {quoteLoading ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.outlineBtnText}>구간 변경 후 MOCO 다시 계산</Text>
                  )}
                </Pressable>

                <View style={styles.quoteBox}>
                  <Text style={styles.quoteSub}>재생 {formatSecLabel(quote.segmentSec)}</Text>
                  <Text style={styles.quoteMoco}>{quote.mocoAmount.toLocaleString()} MOCO</Text>
                </View>
              </>
            ) : null}

            <Pressable style={styles.termsRow} onPress={() => setTermsAccepted((v) => !v)}>
              <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]} />
              <Text style={styles.termsText}>{MOCO_PURCHASE_TERMS_COPY}</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Pressable style={[styles.outlineBtn, styles.flex1]} onPress={() => setStep(1)}>
                <Text style={styles.outlineBtnText}>이전</Text>
              </Pressable>
              <Pressable
                style={[styles.submit, styles.submitGreen, styles.flex1, (busy || !quote) && styles.submitDisabled]}
                disabled={busy || !quote}
                onPress={() => void submit()}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>후원하기</Text>}
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
