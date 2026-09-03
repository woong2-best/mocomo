import { useMemo } from "react";
import { Modal, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/config/env";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export type LiveCardMenuTarget = {
  channelId: string;
  title: string;
  hostUsername: string;
};

type Props = {
  target: LiveCardMenuTarget | null;
  onClose: () => void;
  onOpenChannel: (username: string) => void;
};

/** ⋮ menu on live cards — 채널 보기 · 링크 공유. */
export function LiveCardOverflowMenu({ target, onClose, onOpenChannel }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const share = () => {
    if (!target) return;
    const url = `${API_BASE_URL}/voice/${target.channelId}`;
    onClose();
    void Share.share({ message: `${target.title}\n${url}`, url });
  };

  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.scrim} onPress={onClose}>
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={styles.heading} numberOfLines={1}>
            {target?.title ?? ""}
          </Text>
          <Pressable
            style={styles.row}
            onPress={() => {
              const username = target?.hostUsername;
              onClose();
              if (username) onOpenChannel(username);
            }}
          >
            <Ionicons name="person-outline" size={20} color={colors.text} />
            <Text style={styles.rowText}>채널 보기</Text>
          </Pressable>
          <View style={styles.sep} />
          <Pressable style={styles.row} onPress={share}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
            <Text style={styles.rowText}>링크 공유</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: 16,
      paddingHorizontal: spacing.md,
    },
    heading: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      marginBottom: 4,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
    rowText: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
    cancelBtn: { marginTop: 8, paddingVertical: 14, alignItems: "center" },
    cancelText: { fontSize: 16, fontWeight: "700", color: colors.textMuted },
  });
}
