import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { spacing } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** @default "78%" */
  maxHeight?: number | `${number}%`;
  sheetStyle?: ViewStyle;
  /** Stop taps on sheet from closing */
  stopPropagation?: boolean;
};

/**
 * Bottom sheet modal that lifts with the software keyboard so TextInputs stay visible.
 */
export function KeyboardSheet({
  visible,
  onClose,
  children,
  maxHeight = "78%",
  sheetStyle,
  stopPropagation = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();

  const sheet = (
    <View
      style={[
        styles.sheet,
        {
          maxHeight,
          marginBottom: keyboardHeight,
          paddingBottom: keyboardHeight > 0 ? spacing.md : spacing.md + insets.bottom,
        },
        sheetStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityRole="button" />
        {stopPropagation ? (
          <Pressable onPress={(e) => e.stopPropagation()}>{sheet}</Pressable>
        ) : (
          sheet
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dismiss: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
});
