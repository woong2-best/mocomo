import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { fetchGemsWallet } from "@/api/gems";
import { ApiError } from "@/api/client";
import { isStripeAccountNotReady } from "@/lib/creator-payout";
import { showIslandError } from "@/ui/IslandToast";
import { transferMoco } from "@/api/moco-transfer";
import { appendMocoDecimalChar, formatMocoCount, parseSpendableMoco } from "@/lib/moco-amount";
import { ATM_LETTER_MESSAGE_MAX } from "@/lib/chat-atm-letter";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useI18n } from "@/i18n/I18nProvider";
import { spacing } from "@/theme/tokens";
import { useMoneyAgeGate } from "@/hooks/useMoneyAgeGate";

const EARTH_BG = require("../../../assets/live/moco-support-earth.png");
const LOGO = require("../../../assets/icon.png");
const DOT_COUNT = 5;

type Overlay = "success" | "failure" | null;

function TransferDots({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    let step = 0;
    timerRef.current = setInterval(() => {
      step = (step + 1) % (DOT_COUNT * 3);
      setPhase(step);
    }, 220);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active]);

  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: DOT_COUNT }, (_, i) => {
        const lit = active && phase % DOT_COUNT === i;
        const waveY = lit ? Math.sin(phase * 0.9) * 5 : Math.sin((phase + i) * 0.25) * 1.5;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              lit ? styles.dotLit : styles.dotIdle,
              { transform: [{ translateY: waveY }] },
            ]}
          />
        );
      })}
    </View>
  );
}

function AtmNumKey({
  label,
  disabled,
  wide,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  wide?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.numKeyWrap,
        wide && styles.numKeyWide,
        disabled && styles.keyDisabled,
        pressed && !disabled && styles.keyPressed,
      ]}
    >
      <LinearGradient colors={["#f4f5f7", "#e3e6ea", "#caced4"]} style={styles.numKeyFace}>
        <Text style={styles.numKeyLabel}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function AtmActionKey({
  label,
  subLabel,
  tone,
  disabled,
  tall,
  onPress,
}: {
  label: string;
  subLabel?: string;
  tone: "clear" | "confirm";
  disabled?: boolean;
  tall?: boolean;
  onPress: () => void;
}) {
  const isConfirm = tone === "confirm";
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionKeyWrap,
        tall && styles.actionKeyTall,
        disabled && styles.keyDisabled,
        pressed && !disabled && styles.keyPressed,
      ]}
    >
      <LinearGradient
        colors={
          isConfirm ? ["#3ecf7a", "#2db868", "#1a9a52"] : ["#ffe08a", "#f5c842", "#d9a820"]
        }
        style={styles.actionKeyFace}
      >
        <Text style={[styles.actionKeyLabel, isConfirm && styles.actionKeyLabelConfirm]}>{label}</Text>
        {subLabel ? (
          <Text style={[styles.actionKeySub, isConfirm && styles.actionKeySubConfirm]}>{subLabel}</Text>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

export function WalletTransferPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const moneyAge = useMoneyAgeGate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [letter, setLetter] = useState("");
  const [error, setError] = useState("");
  const [statusLine, setStatusLine] = useState(() =>
    t("m.wallet.enter_recipient_username_and_moco_amount")
  );
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAccepted, setConfirmAccepted] = useState(false);

  const gems = useQuery({
    queryKey: ["mobile-gems-wallet"],
    queryFn: fetchGemsWallet,
    staleTime: 30_000,
  });

  const held = gems.data?.balance ?? 0;
  const parsed = parseSpendableMoco(amount);
  const displayAmount = amount.endsWith(".")
    ? `${formatMocoCount(Number(amount.slice(0, -1) || "0"))}.`
    : amount
      ? formatMocoCount(Number(amount))
      : "0";

  const mutation = useMutation({
    mutationFn: () => transferMoco(username.trim(), parsed ?? 0, letter, true),
    onSuccess: async (res) => {
      setAmount("");
      setLetter("");
      setStatusLine(
        t("m.wallet.recorded_amount_moco_to_recipientusernam", { amount: String(res.amount.toLocaleString()), recipientUsername: String(res.recipientUsername) })
      );
      setError("");
      setOverlay("success");
      await queryClient.invalidateQueries({ queryKey: ["mobile-gems-wallet"] });
      await queryClient.invalidateQueries({ queryKey: ["mobile-settlement-status"] });
    },
    onError: (err) => {
      if (isStripeAccountNotReady(err)) {
        showIslandError(
          t("m.wallet.can_t_send"),
          t("m.wallet.this_creator_hasn_t_linked_a")
        );
        setError(t("m.wallet.this_creator_hasn_t_linked_a"));
        setStatusLine(t("m.wallet.this_creator_hasn_t_linked_a"));
        setOverlay("failure");
        return;
      }
      const msg = err instanceof ApiError ? err.message : t("m.wallet.transfer_failed");
      setError(msg);
      setStatusLine(msg);
      setOverlay("failure");
    },
  });

  const pending = mutation.isPending;

  function appendDigit(digit: string) {
    if (pending || overlay) return;
    const next = appendMocoDecimalChar(amount, digit);
    if (next === amount) return;
    setAmount(next);
    if (error) setError("");
    setStatusLine(t("m.wallet.confirm_amount_and_username_then_tap"));
  }

  function backspace() {
    if (pending || overlay || !amount) return;
    setAmount(amount.slice(0, -1));
    setStatusLine(t("m.wallet.enter_moco_amount_to_send"));
  }

  function send() {
    if (pending || overlay) return;
    if (moneyAge.blocked) {
      void moneyAge.ensureMoneyAge();
      return;
    }
    if (!username.trim() || parsed == null || parsed < 0.1) {
      const msg = t("m.wallet.enter_a_username_and_at_least");
      setError(msg);
      setStatusLine(msg);
      setOverlay("failure");
      return;
    }
    if (Math.round(parsed * 10) > Math.round(held * 10)) {
      const msg = t("m.wallet.not_enough_purchased_moco_only_checkout");
      setError(msg);
      setStatusLine(msg);
      setOverlay("failure");
      return;
    }
    setError("");
    setConfirmAccepted(false);
    setConfirmOpen(true);
  }

  function confirmSend() {
    if (!confirmAccepted) return;
    setConfirmOpen(false);
    setStatusLine(t("m.common.sending"));
    mutation.mutate();
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.intro}>
        {t("m.wallet.you_can_send_purchased_moco_from")}
      </Text>

      <LinearGradient colors={["#d1d5db", "#aeb4bd", "#8b939e"]} style={styles.atmShell}>
        <View style={styles.atmBody}>
          <View style={styles.atmHeader}>
            <View style={styles.atmHeaderLeft}>
              <View style={styles.statusDot} />
              <Text style={styles.atmBrand}>MoCoMo ATM</Text>
            </View>
            <View style={styles.atmHeaderRight}>
              <Ionicons name="shield-checkmark" size={14} color="#64748b" />
              <Text style={styles.atmMode}>TRANSFER</Text>
            </View>
          </View>

          <View style={styles.screenWrap}>
            {overlay ? (
              <Pressable style={styles.overlay} onPress={() => setOverlay(null)}>
                <View
                  style={[
                    styles.overlayIcon,
                    overlay === "success" ? styles.overlayIconOk : styles.overlayIconFail,
                  ]}
                >
                  <Ionicons
                    name={overlay === "success" ? "checkmark" : "close"}
                    size={36}
                    color={overlay === "success" ? "#6ee7b7" : "#fca5a5"}
                  />
                </View>
                <Text style={[styles.overlayTitle, overlay === "success" ? styles.overlayOk : styles.overlayFail]}>
                  {overlay === "success" ? t("m.common.sent") : t("m.wallet.failed")}
                </Text>
                <Text style={styles.overlayDismiss}>{t("m.common.close")}</Text>
              </Pressable>
            ) : null}

            <View style={styles.earthCard}>
              <View style={styles.earthHero}>
                <ImageBackground source={EARTH_BG} style={StyleSheet.absoluteFill} imageStyle={styles.earthImage}>
                  <View style={styles.transferRow}>
                    <View style={styles.iconBox}>
                      <FolkAvatar uri={user?.image ?? null} name={user?.username ?? "me"} size={44} framed={false} />
                    </View>
                    <TransferDots active={pending} />
                    <View style={[styles.iconBox, styles.iconLogoBox]}>
                      <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
                    </View>
                  </View>
                </ImageBackground>
              </View>

              <View style={styles.earthForm}>
                <Text style={styles.fieldKicker}>{t("m.wallet.purchased_moco_you_can_send")}</Text>
                <Text style={styles.balanceLine}>{formatMocoCount(held)} MOCO</Text>

                <Text style={[styles.fieldKicker, styles.fieldKickerSpaced]}>{t("m.wallet.recipient_username")}</Text>
                <TextInput
                  value={username}
                  editable={!pending && !overlay}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="@username"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  onChangeText={(v) => {
                    setUsername(v.replace(/\s/g, ""));
                    if (error) setError("");
                  }}
                  style={styles.usernameInput}
                />

                <Text style={[styles.fieldKicker, styles.fieldKickerSpaced]}>{t("m.wallet.letter")}</Text>
                <TextInput
                  value={letter}
                  editable={!pending && !overlay}
                  multiline
                  maxLength={ATM_LETTER_MESSAGE_MAX}
                  placeholder={t("m.wallet.message_for_the_letter")}
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  onChangeText={(v) => {
                    setLetter(v.slice(0, ATM_LETTER_MESSAGE_MAX));
                    if (error) setError("");
                  }}
                  style={styles.letterInput}
                />
                <Text style={styles.letterCount}>
                  {letter.length}/{ATM_LETTER_MESSAGE_MAX}
                </Text>

                <View style={styles.amountSlot}>
                  <Text style={styles.amountDisplay} numberOfLines={1}>
                    {displayAmount}
                  </Text>
                  <Text style={styles.amountUnit}>MOCO</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.ticker}>
            {pending ? (
              <View style={styles.tickerPending}>
                <ActivityIndicator size="small" color="#fcd34d" />
                <Text style={styles.tickerText}>{t("m.common.processing")}</Text>
              </View>
            ) : (
              <Text style={styles.tickerText}>{statusLine}</Text>
            )}
          </View>

          <LinearGradient colors={["#b8bcc4", "#9ca3af"]} style={styles.keypadWell}>
            <View style={styles.keypadRow}>
              <View style={styles.keypadMain}>
                <View style={styles.keyRow}>
                  <AtmNumKey label="1" disabled={pending || !!overlay} onPress={() => appendDigit("1")} />
                  <AtmNumKey label="2" disabled={pending || !!overlay} onPress={() => appendDigit("2")} />
                  <AtmNumKey label="3" disabled={pending || !!overlay} onPress={() => appendDigit("3")} />
                </View>
                <View style={styles.keyRow}>
                  <AtmNumKey label="4" disabled={pending || !!overlay} onPress={() => appendDigit("4")} />
                  <AtmNumKey label="5" disabled={pending || !!overlay} onPress={() => appendDigit("5")} />
                  <AtmNumKey label="6" disabled={pending || !!overlay} onPress={() => appendDigit("6")} />
                </View>
                <View style={styles.keyRow}>
                  <AtmNumKey label="7" disabled={pending || !!overlay} onPress={() => appendDigit("7")} />
                  <AtmNumKey label="8" disabled={pending || !!overlay} onPress={() => appendDigit("8")} />
                  <AtmNumKey label="9" disabled={pending || !!overlay} onPress={() => appendDigit("9")} />
                </View>
                <View style={styles.keyRow}>
                  <AtmNumKey label="." disabled={pending || !!overlay} onPress={() => appendDigit(".")} />
                  <AtmNumKey label="0" disabled={pending || !!overlay} onPress={() => appendDigit("0")} />
                  <View style={styles.numKeySpacer} />
                </View>
              </View>
              <View style={styles.keypadSide}>
                <AtmActionKey
                  label={t("m.wallet.clear")}
                  subLabel="←"
                  tone="clear"
                  disabled={pending || !!overlay || !amount}
                  tall
                  onPress={backspace}
                />
                <AtmActionKey
                  label={t("m.common.send")}
                  subLabel="SEND"
                  tone="confirm"
                  disabled={
                    pending ||
                    !!overlay ||
                    !username.trim() ||
                    parsed == null ||
                    parsed < 0.1
                  }
                  tall
                  onPress={send}
                />
              </View>
            </View>
          </LinearGradient>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.hint}>
              {t("m.wallet.example_sending_100_moco_adds_100")}
            </Text>
          )}
        </View>
      </LinearGradient>
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmBody}>
              Before you send: Transfers are final and cannot be refunded, reversed, or recalled (Section X.3). Messages must not contain profanity, harassment, hate speech, discrimination, sexual or obscene content, threats, defamation, or any unlawful content (Section X.4). By clicking Send, you confirm that you have read and agree to these Terms, including Section X (Section X.7).
            </Text>
            <Pressable style={styles.confirmCheckRow} onPress={() => setConfirmAccepted((v) => !v)}>
              <View style={[styles.confirmBox, confirmAccepted && styles.confirmBoxOn]} />
              <Text style={styles.confirmCheckLabel}>I understand and agree.</Text>
            </Pressable>
            <View style={styles.confirmActions}>
              <Pressable onPress={() => setConfirmOpen(false)} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmSend}
                disabled={!confirmAccepted || pending}
                style={[styles.confirmSend, (!confirmAccepted || pending) && { opacity: 0.45 }]}
              >
                <Text style={styles.confirmSendText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  confirmCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  confirmBody: { color: "#e2e8f0", fontSize: 13, lineHeight: 20 },
  confirmCheckRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  confirmBox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 4,
    marginTop: 2,
  },
  confirmBoxOn: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  confirmCheckLabel: { color: "#e2e8f0", fontSize: 14, flex: 1 },
  confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  confirmCancel: { paddingHorizontal: 14, paddingVertical: 8 },
  confirmCancelText: { color: "#94a3b8", fontWeight: "700" },
  confirmSend: {
    backgroundColor: "#6366f1",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confirmSendText: { color: "#fff", fontWeight: "800" },
  wrap: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  intro: {
    fontSize: 12,
    lineHeight: 18,
    color: "#94a3b8",
    paddingHorizontal: 2,
  },
  atmShell: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#6b7280",
    padding: 6,
  },
  atmBody: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#4b5563",
    backgroundColor: "#0b1018",
    overflow: "hidden",
  },
  atmHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  atmHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#34d399",
  },
  atmBrand: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    color: "#94a3b8",
  },
  atmHeaderRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  atmMode: {
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: "#64748b",
  },
  screenWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  overlayIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayIconOk: {
    borderColor: "#34d399",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  overlayIconFail: {
    borderColor: "#f87171",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  overlayTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
  },
  overlayOk: { color: "#a7f3d0" },
  overlayFail: { color: "#fecaca" },
  overlayDismiss: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "800",
    color: "#e2e8f0",
    textDecorationLine: "underline",
  },
  earthCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  earthHero: {
    width: "100%",
    height: 168,
    overflow: "hidden",
  },
  earthImage: {
    resizeMode: "cover",
  },
  transferRow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "36%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#1B3A6B",
    backgroundColor: "#D8D8D8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconLogoBox: {
    backgroundColor: "#fff",
    padding: 5,
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 72,
    justifyContent: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotIdle: { backgroundColor: "#9CA3AF" },
  dotLit: { backgroundColor: "#111" },
  earthForm: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f3f4f6",
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  fieldKicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#737373",
    textTransform: "uppercase",
  },
  fieldKickerSpaced: { marginTop: 6 },
  balanceLine: {
    fontSize: 20,
    fontWeight: "800",
    color: "#171717",
    fontVariant: ["tabular-nums"],
  },
  usernameInput: {
    marginTop: 4,
    borderWidth: 2,
    borderColor: "#1B3A6B",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    fontWeight: "800",
    color: "#171717",
    fontVariant: ["tabular-nums"],
  },
  letterInput: {
    marginTop: 4,
    minHeight: 72,
    maxHeight: 120,
    borderWidth: 2,
    borderColor: "#1B3A6B",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    lineHeight: 21,
    color: "#171717",
    textAlignVertical: "top",
  },
  letterCount: {
    alignSelf: "flex-end",
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "#a3a3a3",
    fontVariant: ["tabular-nums"],
  },
  amountSlot: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "baseline",
    borderWidth: 2,
    borderColor: "#1B3A6B",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  amountDisplay: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    color: "#171717",
    fontVariant: ["tabular-nums"],
  },
  amountUnit: {
    fontSize: 14,
    fontWeight: "900",
    color: "#E85D04",
  },
  ticker: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(120, 53, 15, 0.4)",
    backgroundColor: "#1a1205",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tickerPending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tickerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fcd34d",
    fontVariant: ["tabular-nums"],
  },
  keypadWell: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6b7280",
    padding: 10,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 8,
  },
  keypadMain: {
    flex: 3,
    gap: 8,
  },
  keypadSide: {
    flex: 1,
    gap: 8,
  },
  keyRow: {
    flexDirection: "row",
    gap: 8,
  },
  numKeyWrap: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8a9199",
    overflow: "hidden",
  },
  numKeyWide: {
    flex: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  numKeySpacer: {
    flex: 1,
  },
  numKeyFace: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  numKeyLabel: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1f26",
    fontVariant: ["tabular-nums"],
  },
  actionKeyWrap: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#9a7a12",
  },
  actionKeyTall: {
    flex: 1,
    minHeight: 112,
  },
  actionKeyFace: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  actionKeyLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: "#5c3d00",
  },
  actionKeyLabelConfirm: {
    color: "#0b2e18",
  },
  actionKeySub: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(92, 61, 0, 0.7)",
  },
  actionKeySubConfirm: {
    color: "rgba(11, 46, 24, 0.7)",
  },
  keyDisabled: { opacity: 0.45 },
  keyPressed: { transform: [{ translateY: 2 }] },
  error: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#fca5a5",
  },
  hint: {
    marginHorizontal: 16,
    marginBottom: 16,
    fontSize: 11,
    lineHeight: 16,
    color: "#94a3b8",
  },
});
