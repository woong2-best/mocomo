import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { boostPost, fetchPostBoostStatus } from "@/api/post-boost";
import { API_BASE_URL } from "@/config/env";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { FolkButton } from "@/ui/FolkButton";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";

const DAY_ITEM = 56;
const DEFAULT_MAX_DAYS = 100;
const DEFAULT_MOCO_PER_DAY = 0.5;
const TERMS_URL = `${API_BASE_URL.replace(/\/$/, "")}/legal/sponsored-content`;

type Props = {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function PostBoostSheet({ visible, postId, onClose, onSuccess }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [days, setDays] = useState(1);
  const [maxDays, setMaxDays] = useState(DEFAULT_MAX_DAYS);
  const [mocoPerDay, setMocoPerDay] = useState(DEFAULT_MOCO_PER_DAY);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setAgreed(false);
    setError("");
    setDays(1);
    setLoading(true);
    void fetchPostBoostStatus(postId)
      .then((s) => {
        setMaxDays(s.maxDays || DEFAULT_MAX_DAYS);
        setMocoPerDay(s.mocoPerDay || DEFAULT_MOCO_PER_DAY);
        setBalance(s.purchasedMoco ?? s.purchasedMocoBalance ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("m.boost.load_failed")))
      .finally(() => setLoading(false));
  }, [visible, postId, t]);

  const cost = Math.round(days * mocoPerDay * 10) / 10;
  const canAfford = balance + 1e-9 >= cost;

  async function submit() {
    if (busy || !agreed || !canAfford) return;
    setBusy(true);
    setError("");
    try {
      await boostPost(postId, days);
      showIslandSuccess(t("m.boost.success"));
      onSuccess?.();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : t("m.boost.purchase_failed");
      setError(message);
      showIslandError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardSheet visible={visible} onClose={onClose} sheetStyle={{ backgroundColor: colors.surfaceRaised }}>
      <Text style={styles.title}>{t("m.boost.title")}</Text>
      <Text style={styles.sub}>{t("m.boost.intro")}</Text>

      <Text style={styles.durationLabel}>{t("m.boost.duration")}</Text>
      <BoostDayDial
        value={days}
        onChange={setDays}
        maxDays={maxDays}
        colors={colors}
        alignKey={`${visible}:${postId}`}
      />
      <Text style={styles.cost}>
        {t(days === 1 ? "m.boost.days" : "m.boost.days_plural", {
          days: String(days),
          moco: String(cost),
        })}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />
      ) : (
        <>
          <Text style={styles.balance}>
            {t("m.boost.balance", { balance: String(balance) })}
          </Text>
          {!canAfford ? (
            <Pressable onPress={() => navigation.navigate("Wallet", undefined)}>
              <Text style={styles.charge}>{t("m.boost.charge")}</Text>
            </Pressable>
          ) : null}
        </>
      )}

      <View style={styles.termsRow}>
        <Pressable onPress={() => setAgreed((v) => !v)} hitSlop={8}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]} />
        </Pressable>
        <Text style={styles.terms}>
          {t("m.boost.terms_before")}
          <Text
            style={styles.termsLink}
            onPress={() => void Linking.openURL(TERMS_URL)}
          >
            {t("m.boost.terms_link")}
          </Text>
          {t("m.boost.terms_after")}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <FolkButton label={t("m.common.close")} variant="ghost" onPress={onClose} />
        <FolkButton
          label={busy ? t("m.boost.busy") : t("m.boost.submit")}
          onPress={() => void submit()}
          loading={busy}
          disabled={loading || !agreed || !canAfford}
        />
      </View>
    </KeyboardSheet>
  );
}

function BoostDayDial({
  value,
  onChange,
  maxDays,
  colors,
  alignKey,
}: {
  value: number;
  onChange: (days: number) => void;
  maxDays: number;
  colors: ThemeColors;
  alignKey: string;
}) {
  const listRef = useRef<FlatList<number>>(null);
  const [width, setWidth] = useState(0);
  const days = useMemo(
    () => Array.from({ length: Math.max(1, maxDays) }, (_, i) => i + 1),
    [maxDays]
  );
  const pad = Math.max(0, (width - DAY_ITEM) / 2);

  useEffect(() => {
    if (!width) return;
    listRef.current?.scrollToOffset({
      offset: (value - 1) * DAY_ITEM,
      animated: false,
    });
    // Recenter when the sheet opens — not on every drag tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value is read once per align
  }, [alignKey, maxDays, width]);

  return (
    <View
      style={dialStyles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View
        pointerEvents="none"
        style={[dialStyles.center, { borderColor: colors.cobalt }]}
      />
      <FlatList
        ref={listRef}
        horizontal
        data={days}
        keyExtractor={(d) => String(d)}
        showsHorizontalScrollIndicator={false}
        snapToInterval={DAY_ITEM}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: pad }}
        getItemLayout={(_, index) => ({
          length: DAY_ITEM,
          offset: DAY_ITEM * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / DAY_ITEM);
          onChange(Math.min(maxDays, Math.max(1, idx + 1)));
        }}
        renderItem={({ item }) => {
          const active = item === value;
          return (
            <Pressable
              style={dialStyles.item}
              onPress={() => {
                onChange(item);
                listRef.current?.scrollToOffset({
                  offset: (item - 1) * DAY_ITEM,
                  animated: true,
                });
              }}
            >
              <Text
                style={[
                  dialStyles.num,
                  { color: active ? colors.cobalt : colors.textMuted },
                  active && dialStyles.numActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const dialStyles = StyleSheet.create({
  wrap: { height: 64, justifyContent: "center", marginBottom: 8 },
  center: {
    position: "absolute",
    alignSelf: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "rgba(30, 64, 175, 0.08)",
  },
  item: {
    width: DAY_ITEM,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  num: { fontSize: 16, fontWeight: "700" },
  numActive: { fontSize: 22, fontWeight: "800" },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 6 },
    sub: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md },
    durationLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: colors.textMuted,
      marginBottom: 6,
    },
    cost: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.cobalt,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    balance: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 6 },
    charge: { fontSize: 13, fontWeight: "700", color: colors.cobalt, marginBottom: spacing.sm },
    termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginVertical: spacing.sm },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginTop: 2,
    },
    checkboxOn: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    terms: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textMuted },
    termsLink: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      color: colors.terracotta,
      textDecorationLine: "underline",
    },
    error: { color: colors.terracotta, fontSize: 13, marginBottom: 8 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: spacing.sm },
  });
}
