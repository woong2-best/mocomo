import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPickVideo: () => void;
  onPickSfx: () => void;
  hostDisplayName?: string;
};

export function LiveMocoDonationMenuSheet({
  visible,
  onClose,
  onPickVideo,
  onPickSfx,
  hostDisplayName,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <KeyboardSheet visible={visible} onClose={onClose} maxHeight="42%" sheetStyle={{ backgroundColor: colors.surface }}>
      <Text style={styles.title}>MOCO 후원</Text>
      <Text style={styles.sub}>
        {hostDisplayName ? `${hostDisplayName} · ` : ""}
        영상 또는 효과음으로 방송 화면(OBS)에 알림이 표시됩니다.
      </Text>

      <Pressable
        style={styles.row}
        onPress={() => {
          onClose();
          onPickVideo();
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#0d4d2c22" }]}>
          <Ionicons name="logo-youtube" size={22} color="#0d4d2c" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>YouTube 영상 후원</Text>
          <Text style={styles.rowSub}>URL · 재생 구간 · MOCO 자동 계산</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable
        style={styles.row}
        onPress={() => {
          onClose();
          onPickSfx();
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#E85D0418" }]}>
          <Ionicons name="musical-notes" size={22} color="#E85D04" />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>효과음 후원</Text>
          <Text style={styles.rowSub}>효과음 · MOCO · 화면 메시지(필수)</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    sub: { marginTop: 4, fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.md },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    rowSub: { marginTop: 2, fontSize: 11, fontWeight: "600", color: colors.textMuted },
  });
}
