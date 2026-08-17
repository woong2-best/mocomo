import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DEFAULT_TEXT_OVERLAY_COLOR,
  TEXT_OVERLAY_COLORS,
} from "@/features/compose/text-overlay-utils";
import type { ComposeEditorStyles } from "@/features/compose/compose-editor-styles";

type Props = {
  value?: string;
  onChange: (color: string) => void;
  styles: ComposeEditorStyles;
};

export function TextColorPicker({ value = DEFAULT_TEXT_OVERLAY_COLOR, onChange, styles }: Props) {
  const active = value || DEFAULT_TEXT_OVERLAY_COLOR;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.textColorRow}
    >
      {TEXT_OVERLAY_COLORS.map((color) => {
        const selected = active.toUpperCase() === color.toUpperCase();
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            style={[
              styles.textColorSwatch,
              { backgroundColor: color },
              selected && styles.textColorSwatchActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            {selected ? (
              <Ionicons
                name="checkmark"
                size={16}
                color={color === "#FFFFFF" || color === "#FFCC00" ? "#1B4A8C" : "#FFFFFF"}
              />
            ) : null}
          </Pressable>
        );
      })}
      <View style={styles.textColorSpacer} />
    </ScrollView>
  );
}
