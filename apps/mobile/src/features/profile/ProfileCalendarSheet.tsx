import { useMemo } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileCalendarPanel } from "@/features/profile/ProfileCalendarPanel";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
  countryCode?: string | null;
  timeZone?: string | null;
};

/** Popup calendar — same memos as web profile calendar. */
export function ProfileCalendarSheet({
  visible,
  onClose,
  countryCode,
  timeZone,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sheetHeight = useMemo(
    () => Math.round(Dimensions.get("window").height * 0.88),
    []
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("m.profile.schedule_memos")}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollBody,
              { paddingBottom: spacing.lg + keyboardHeight },
            ]}
          >
            <ProfileCalendarPanel countryCode={countryCode} timeZone={timeZone} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    title: { fontSize: 17, fontWeight: "800", color: colors.text },
    closeBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: { flex: 1 },
    scrollBody: { flexGrow: 1 },
  });
}
