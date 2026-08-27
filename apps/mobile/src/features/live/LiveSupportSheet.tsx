import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createLiveSupportMission, sendLiveSupportCheer } from "@/api/live";
import { ApiError } from "@/api/client";
import {
  CHEER_PRESETS,
  SUPPORT_MIN_AMOUNT,
  type SupportEventType,
} from "@/lib/live-support";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Tab = SupportEventType | "MISSION";

const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "GENERAL", label: "일반", icon: "heart" },
  { id: "TTS", label: "TTS", icon: "megaphone" },
  { id: "SOUND", label: "사운드", icon: "musical-notes" },
  { id: "ROULETTE", label: "룰렛", icon: "sync" },
  { id: "MISSION", label: "미션", icon: "flag" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  channelId: string;
  hostDisplayName: string;
  initialTab?: Tab;
  onSuccess?: () => void;
};

export function LiveSupportSheet({
  visible,
  onClose,
  channelId,
  hostDisplayName,
  initialTab = "GENERAL",
  onSuccess,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [amount, setAmount] = useState(1_000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [missionTitle, setMissionTitle] = useState("");
  const [missionReward, setMissionReward] = useState(3_000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const effectiveAmount = custom ? parseInt(custom.replace(/\D/g, ""), 10) || 0 : amount;

  async function submitCheer(type: SupportEventType) {
    setError("");
    setSuccess("");
    setLoading(true);
    const min = SUPPORT_MIN_AMOUNT[type];
    if (effectiveAmount < min) {
      setError(`최소 ${min.toLocaleString()} CP`);
      setLoading(false);
      return;
    }
    try {
      const res = await sendLiveSupportCheer(channelId, {
        type,
        amount: effectiveAmount,
        message: message.trim() || undefined,
        metadata: type === "SOUND" ? { soundId: "clap" } : undefined,
      });
      if (!res.ok || !res.event) {
        setError(res.error ?? "응원에 실패했습니다.");
        return;
      }
      const roulette =
        type === "ROULETTE" && typeof res.event.metadata?.rouletteLabel === "string"
          ? res.event.metadata.rouletteLabel
          : null;
      setSuccess(roulette ? `룰렛 결과: ${roulette}` : "응원을 보냈습니다!");
      setMessage("");
      onSuccess?.();
    } catch (e) {
      setError(
        e instanceof ApiError &&
          e.body &&
          typeof e.body === "object" &&
          "error" in e.body
          ? String((e.body as { error: string }).error)
          : "응원에 실패했습니다."
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
      setError("미션 내용을 입력해 주세요.");
      setLoading(false);
      return;
    }
    try {
      const res = await createLiveSupportMission(channelId, {
        title,
        rewardAmount: missionReward,
      });
      if (!res.ok || !res.mission) {
        setError(res.error ?? "미션 등록에 실패했습니다.");
        return;
      }
      setSuccess("미션이 등록되었습니다.");
      setMissionTitle("");
      onSuccess?.();
    } catch (e) {
      setError(
        e instanceof ApiError &&
          e.body &&
          typeof e.body === "object" &&
          "error" in e.body
          ? String((e.body as { error: string }).error)
          : "미션 등록에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardSheet visible={visible} onClose={onClose} sheetStyle={{ backgroundColor: colors.surface }}>
      <Text style={styles.title}>채팅후원 · CP</Text>
      <Text style={styles.sub}>@{hostDisplayName.replace(/^@/, "")} · 결제 없이 응원 포인트</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
          >
            <Ionicons
              name={t.icon}
              size={14}
              color={tab === t.id ? colors.cobalt : colors.textMuted}
            />
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === "MISSION" ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={missionTitle}
            onChangeText={setMissionTitle}
            placeholder="미션 내용 (예: 3연승)"
            placeholderTextColor={colors.textMuted}
            maxLength={120}
          />
          <Text style={styles.label}>보상 CP</Text>
          <View style={styles.presets}>
            {[500, 3_000, 10_000, 30_000].map((n) => (
              <Pressable
                key={n}
                style={[styles.preset, missionReward === n && styles.presetActive]}
                onPress={() => setMissionReward(n)}
              >
                <Text style={[styles.presetText, missionReward === n && styles.presetTextActive]}>
                  {n.toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.submit, loading && styles.submitDisabled]}
            disabled={loading}
            onPress={() => void submitMission()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>미션 등록</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>CP 금액</Text>
          <View style={styles.presets}>
            {CHEER_PRESETS.map((n) => (
              <Pressable
                key={n}
                style={[styles.preset, amount === n && !custom && styles.presetActive]}
                onPress={() => {
                  setAmount(n);
                  setCustom("");
                }}
              >
                <Text
                  style={[styles.presetText, amount === n && !custom && styles.presetTextActive]}
                >
                  {n.toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={custom}
            onChangeText={setCustom}
            placeholder="직접 입력"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />
          {(tab === "GENERAL" || tab === "TTS") && (
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder={tab === "TTS" ? "TTS로 읽을 메시지 (필수)" : "메시지 (선택)"}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={200}
            />
          )}
          <Pressable
            style={[styles.submit, loading && styles.submitDisabled]}
            disabled={loading}
            onPress={() => void submitCheer(tab)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {tab === "ROULETTE" ? "룰렛 돌리기" : "응원 보내기"}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    sub: { marginTop: 4, fontSize: 12, fontWeight: "600", color: colors.textMuted },
    tabs: { marginTop: spacing.md, marginBottom: spacing.sm },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginRight: 8,
      backgroundColor: colors.surfaceRaised,
    },
    tabActive: { borderColor: colors.cobalt, backgroundColor: `${colors.cobalt}14` },
    tabText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    tabTextActive: { color: colors.cobalt },
    form: { gap: 10, paddingBottom: spacing.md },
    label: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    preset: {
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.muted,
    },
    presetActive: { borderColor: colors.cobalt, backgroundColor: `${colors.cobalt}14` },
    presetText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    presetTextActive: { color: colors.cobalt },
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
    submit: {
      backgroundColor: colors.terracotta,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: "#fff", fontWeight: "800" },
    error: { color: colors.danger, fontWeight: "600", fontSize: 12 },
    success: { color: "#059669", fontWeight: "700", fontSize: 12 },
  });
}
