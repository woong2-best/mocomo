import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";
import {
  EMPTY_WATERMARK_OPTIONS,
  type WatermarkOptions,
} from "@/lib/media-watermark";

type Props = {
  value: WatermarkOptions;
  onChange: (next: WatermarkOptions) => void;
  disabled?: boolean;
  creditLabel?: string;
};

export function WatermarkToggleRow({ value, onChange, disabled, creditLabel }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>워터마크</Text>
      <View style={styles.row}>
        <ToggleChip
          active={value.diagonal}
          disabled={disabled}
          label="사선"
          icon="grid-outline"
          onPress={() => onChange({ ...value, diagonal: !value.diagonal })}
          colors={colors}
        />
        <ToggleChip
          active={value.corner}
          disabled={disabled}
          label="하단"
          icon="bookmark-outline"
          onPress={() => onChange({ ...value, corner: !value.corner })}
          colors={colors}
        />
        {!value.diagonal && !value.corner ? (
          <Pressable
            disabled={disabled}
            onPress={() => onChange({ diagonal: true, corner: true })}
            hitSlop={6}
          >
            <Text style={styles.reset}>기본 켜기</Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={disabled}
            onPress={() => onChange(EMPTY_WATERMARK_OPTIONS)}
            hitSlop={6}
          >
            <Text style={styles.reset}>끄기</Text>
          </Pressable>
        )}
      </View>
      {creditLabel ? (
        <Text style={styles.preview} numberOfLines={1}>
          미리보기: {creditLabel}
        </Text>
      ) : null}
    </View>
  );
}

function ToggleChip({
  active,
  disabled,
  label,
  icon,
  onPress,
  colors,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: active ? colors.terracotta : colors.border,
          backgroundColor: active ? colors.terracotta : colors.surfaceRaised,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={active ? "#fff" : colors.textSecondary} />
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: active ? "#fff" : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginTop: 8, gap: 6 },
    label: { fontSize: 12, fontWeight: "800", color: colors.textMuted },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    reset: { fontSize: 12, fontWeight: "700", color: colors.terracotta },
    preview: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  });
}
