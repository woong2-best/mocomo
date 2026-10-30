import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { CommentAvatar } from "@/features/feed/CommentAvatar";
import { SHARE_SHEET } from "@/features/share/share-sheet-theme";
import type { ShareRecipient } from "@/features/share/share-recipients";

type Props = {
  recipients: ShareRecipient[];
  pending?: boolean;
  sendingId?: string | null;
  emptyLabel: string;
  onSelect: (user: ShareRecipient) => void;
};

export function ShareRecipientRow({
  recipients,
  pending,
  sendingId,
  emptyLabel,
  onSelect,
}: Props) {
  if (pending && recipients.length === 0) {
    return (
      <View style={styles.pending}>
        <ActivityIndicator color={SHARE_SHEET.muted} />
      </View>
    );
  }

  if (recipients.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {recipients.map((user) => {
        const label = user.name?.trim() || user.username;
        const busy = sendingId === user.id;
        return (
          <Pressable
            key={user.id}
            style={styles.item}
            onPress={() => onSelect(user)}
            disabled={!!sendingId}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <View>
              <CommentAvatar uri={user.image} name={label} size={64} />
              {busy ? (
                <View style={styles.busy}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : null}
            </View>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pending: {
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    minHeight: 72,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  emptyText: {
    color: SHARE_SHEET.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  row: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 14,
  },
  item: {
    width: 72,
    alignItems: "center",
    gap: 8,
  },
  name: {
    width: "100%",
    color: SHARE_SHEET.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  busy: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
});
