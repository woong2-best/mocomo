import { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { MentionSearchHit } from "@/api/mention-search";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export function MentionSuggestBar({
  users,
  onSelect,
}: {
  users: MentionSearchHit[];
  onSelect: (username: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (users.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {users.map((user) => (
          <Pressable
            key={user.id}
            onPress={() => onSelect(user.username)}
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel={`@${user.username}`}
          >
            {user.image ? (
              <Image source={{ uri: user.image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>
                  {(user.name || user.username).slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={1}>
                {user.name || user.username}
              </Text>
              <Text style={styles.handle} numberOfLines={1}>
                @{user.username}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    row: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingRight: spacing.md,
      paddingVertical: 6,
      paddingLeft: 6,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 220,
    },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    avatarFallback: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.cobalt,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: { color: "#fff", fontWeight: "800", fontSize: 13 },
    meta: { minWidth: 0, flexShrink: 1 },
    name: { fontSize: 13, fontWeight: "700", color: colors.text },
    handle: { fontSize: 11, color: colors.textMuted },
  });
}
