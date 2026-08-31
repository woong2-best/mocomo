import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { FolkCard } from "@/ui/FolkCard";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import {
  loadMessageComposerPrefs,
  setFanArtSellHidden,
} from "@/lib/message-composer-prefs";

export function MessageComposerSettingsCard() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [fanArtSellHidden, setFanArtSellHiddenState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    void loadMessageComposerPrefs(user.id)
      .then((prefs) => setFanArtSellHiddenState(prefs.fanArtSellHidden))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const onToggleShowSellButton = useCallback(
    async (show: boolean) => {
      if (!user?.id) return;
      const hidden = !show;
      setFanArtSellHiddenState(hidden);
      try {
        await setFanArtSellHidden(user.id, hidden);
      } catch {
        setFanArtSellHiddenState(!hidden);
        Alert.alert("오류", "설정을 저장하지 못했습니다.");
      }
    },
    [user?.id]
  );

  if (!user?.id) return null;

  return (
    <FolkCard>
      <Text style={styles.cardTitle}>메시지</Text>
      <Text style={styles.cardDesc}>
        DM 입력창의 팬아트 판매 버튼(💵) 표시 여부입니다. 버튼을 길게 누르면 숨길 수 있으며,
        여기서 다시 켤 수 있습니다.
      </Text>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>팬아트 판매 버튼</Text>
          <Text style={styles.rowSub}>
            {fanArtSellHidden ? "숨김 — 아래 스위치로 복구" : "표시 중"}
          </Text>
        </View>
        <Switch
          value={!fanArtSellHidden}
          disabled={loading}
          onValueChange={(show) => void onToggleShowSellButton(show)}
          trackColor={{ false: colors.border, true: colors.cobalt }}
          thumbColor="#fff"
        />
      </View>
    </FolkCard>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingTop: 4,
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    rowSub: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  });
}
