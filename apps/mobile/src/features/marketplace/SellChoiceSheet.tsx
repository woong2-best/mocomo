import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";

export function SellChoiceSheet({
  visible,
  bottom,
  onClose,
  onPhysical,
  onDigital,
}: {
  visible: boolean;
  bottom: number;
  onClose: () => void;
  onPhysical: () => void;
  onDigital: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.dock, { bottom }]}>
          <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Choice
              icon="cube-outline"
              label={t("m.studio.physical")}
              hint={t("m.studio.physical_hint")}
              onPress={onPhysical}
            />
            <View style={[styles.line, { backgroundColor: colors.hairline }]} />
            <Choice
              icon="color-palette-outline"
              label={t("m.studio.digital")}
              hint={t("m.studio.digital_hint")}
              onPress={onDigital}
            />
          </View>
          <Pressable
            style={[styles.close, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function Choice({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable style={styles.choice} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={colors.terracotta} />
      <View style={styles.choiceText}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.28)" },
  dock: { position: "absolute", right: 18, alignItems: "flex-end", gap: 10 },
  card: { width: 260, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  choice: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  choiceText: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: "800" },
  hint: { fontSize: 12, fontWeight: "600" },
  line: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
