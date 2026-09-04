import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "number-pad";
  editable?: boolean;
  prefix?: string;
  maxLength?: number;
};

export function AuthTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType = "default",
  editable = true,
  prefix,
  maxLength,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.field,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
        ]}
      >
        {prefix ? (
          <Text style={[styles.prefix, { color: colors.brand }]}>{prefix}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          editable={editable}
          maxLength={maxLength}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", marginLeft: 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  prefix: { fontSize: 17, fontWeight: "800", marginRight: 4 },
  input: { flex: 1, fontSize: 16, fontWeight: "600", paddingVertical: 12 },
});
