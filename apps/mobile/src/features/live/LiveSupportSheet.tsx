import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { createLiveSupportMission, sendLiveSupportCheer } from "@/api/live";
import { ApiError } from "@/api/client";
import {
  SUPPORT_MIN_AMOUNT,
  type SupportEventType,
} from "@/lib/live-support";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { spacing } from "@/theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { liveUi } from "@/features/live/live-ui";
import { useI18n } from "@/i18n/I18nProvider";

type Tab = SupportEventType | "MISSION";

type Props = {
  visible: boolean;
  onClose: () => void;
  channelId: string;
  hostDisplayName: string;
  initialTab?: Tab;
  onSuccess?: () => void;
};

const DOT_COUNT = 5;
const EARTH_BG = require("../../../assets/live/moco-support-earth.png");

/** Five dots — wave left→right: gray idle, black when pulse hits. */
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

export function LiveSupportSheet({
  visible,
  onClose,
  channelId,
  hostDisplayName,
  initialTab = "GENERAL",
  onSuccess,
}: Props) {
  const { t } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [amountText, setAmountText] = useState("1000");
  const [message, setMessage] = useState("");
  const [missionTitle, setMissionTitle] = useState("");
  const [missionRewardText, setMissionRewardText] = useState("3000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  const effectiveAmount = parseInt(amountText.replace(/\D/g, ""), 10) || 0;
  const missionReward = parseInt(missionRewardText.replace(/\D/g, ""), 10) || 0;
  const hostLabel = hostDisplayName.replace(/^@/, "");

  async function submitCheer(type: SupportEventType) {
    setError("");
    setSuccess("");
    setLoading(true);
    const min = SUPPORT_MIN_AMOUNT[type];
    if (effectiveAmount < min) {
      setError(t("m.live.minimum_min_moco", { min: String(min.toLocaleString()) }));
      setLoading(false);
      return;
    }
    try {
      const res = await sendLiveSupportCheer(channelId, {
        type,
        amount: effectiveAmount,
        message: message.trim() || undefined,
      });
      if (!res.ok || !res.event) {
        setError(res.error ?? t("m.live.could_not_send_cheer"));
        return;
      }
      const roulette =
        type === "ROULETTE" && typeof res.event.metadata?.rouletteLabel === "string"
          ? res.event.metadata.rouletteLabel
          : null;
      setSuccess(
        roulette
          ? t("m.live.roulette_roulette", { roulette: String(roulette) })
          : t("m.live.cheer_sent")
      );
      setMessage("");
      onSuccess?.();
    } catch (e) {
      setError(
        e instanceof ApiError &&
          e.body &&
          typeof e.body === "object" &&
          "error" in e.body
          ? String((e.body as { error: string }).error)
          : t("m.live.could_not_send_cheer")
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitMission() {
    setError("");
    setSuccess("");
    setLoading(true);
    const title = missionTitle.trim();
    if (!title) {
      setError(t("m.live.enter_a_mission_description"));
      setLoading(false);
      return;
    }
    if (missionReward < 500) {
      setError(t("m.live.minimum_500_moco"));
      setLoading(false);
      return;
    }
    try {
      const res = await createLiveSupportMission(channelId, {
        title,
        rewardAmount: missionReward,
      });
      if (!res.ok || !res.mission) {
        setError(res.error ?? t("m.live.could_not_create_mission"));
        return;
      }
      setSuccess(t("m.live.mission_created"));
      setMissionTitle("");
      onSuccess?.();
    } catch (e) {
      setError(
        e instanceof ApiError &&
          e.body &&
          typeof e.body === "object" &&
          "error" in e.body
          ? String((e.body as { error: string }).error)
          : t("m.live.could_not_create_mission")
      );
    } finally {
      setLoading(false);
    }
  }

  const tabs = useMemo(
    () =>
      [
        { id: "GENERAL" as const, label: copy.donation },
        { id: "ROULETTE" as const, label: copy.roulette },
        { id: "MISSION" as const, label: copy.mission },
      ] as const,
    [copy.donation, copy.mission, copy.roulette]
  );

  return (
    <KeyboardSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      sheetStyle={styles.sheetChrome}
    >
      <ImageBackground
        source={EARTH_BG}
        style={[styles.bg, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}
        imageStyle={styles.bgImage}
      >
        <View style={styles.topBar}>
          <Text style={styles.title}>MOCO</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#1a1a1a" />
          </Pressable>
        </View>

        <Text style={styles.hostLine}>@{hostLabel}</Text>

        <View style={styles.transferRow}>
          <View style={styles.iconBox}>
            <FolkAvatar uri={user?.image ?? null} name={user?.username ?? "me"} size={48} framed={false} />
          </View>

          <TransferDots active={loading} />

          <View style={[styles.iconBox, styles.iconLogoBox]}>
            <Image source={require("../../../assets/icon.png")} style={styles.logoImg} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.modeRow}>
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.modeChip, tab === t.id && styles.modeChipOn]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.modeText, tab === t.id && styles.modeTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "MISSION" ? (
          <View style={styles.form}>
            <View style={styles.atmSlot}>
              <TextInput
                style={[styles.atmInput, styles.atmMessage]}
                value={missionTitle}
                onChangeText={setMissionTitle}
                placeholder={t("m.live.mission_description")}
                placeholderTextColor="rgba(0,0,0,0.35)"
                maxLength={120}
              />
            </View>
            <View style={styles.atmSlot}>
              <TextInput
                style={styles.atmInput}
                value={missionRewardText}
                onChangeText={setMissionRewardText}
                placeholder="0"
                placeholderTextColor="rgba(0,0,0,0.35)"
                keyboardType="number-pad"
              />
              <Text style={styles.atmUnit}>MOCO</Text>
            </View>
            <Pressable
              style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
              disabled={loading}
              onPress={() => void submitMission()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>{t("m.live.create_mission")}</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.atmSlot}>
              <TextInput
                style={styles.atmInput}
                value={amountText}
                onChangeText={setAmountText}
                placeholder="0"
                placeholderTextColor="rgba(0,0,0,0.35)"
                keyboardType="number-pad"
                selectionColor="#E85D04"
              />
              <Text style={styles.atmUnit}>MOCO</Text>
            </View>

            {tab === "GENERAL" ? (
              <View style={[styles.atmSlot, styles.atmSlotTall]}>
                <TextInput
                  style={[styles.atmInput, styles.atmMessage]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t("m.live.message_optional")}
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  maxLength={200}
                />
              </View>
            ) : null}

            <Pressable
              style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
              disabled={loading}
              onPress={() => void submitCheer(tab)}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>
                  {tab === "ROULETTE" ? t("m.live.spin_roulette") : t("m.common.send")}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
      </ImageBackground>
    </KeyboardSheet>
  );
}

const styles = StyleSheet.create({
  sheetChrome: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingTop: 0,
    overflow: "hidden",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  bg: {
    width: "100%",
    minHeight: 420,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  bgImage: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    resizeMode: "cover",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  hostLine: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.45)",
  },
  transferRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#1B3A6B",
    backgroundColor: "#D8D8D8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconLogoBox: {
    backgroundColor: "#fff",
    padding: 6,
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 88,
    justifyContent: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotIdle: {
    backgroundColor: "#9CA3AF",
  },
  dotLit: {
    backgroundColor: "#111",
  },
  modeRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
  },
  modeChipOn: {
    backgroundColor: "#1B3A6B",
    borderColor: "#1B3A6B",
  },
  modeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
  modeTextOn: {
    color: "#fff",
  },
  form: {
    marginTop: 16,
    gap: 10,
  },
  atmSlot: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#1B3A6B",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  atmSlotTall: {
    height: 48,
  },
  atmInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    letterSpacing: 1,
    paddingVertical: 0,
  },
  atmMessage: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0,
  },
  atmUnit: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "900",
    color: "#E85D04",
    letterSpacing: 0.4,
  },
  sendBtn: {
    marginTop: 4,
    marginBottom: 4,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#E85D04",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.55 },
  sendBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  error: {
    marginTop: 10,
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  success: {
    marginTop: 10,
    color: "#059669",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },
});
