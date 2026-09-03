import { StyleSheet, Text, View } from "react-native";
import type { LiveChatMessage } from "@/api/live";
import { commentDonationTier } from "@/lib/comment-donation";
import { formatUsd } from "@/lib/money";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { radii } from "@/theme/tokens";

export function CommentDonationCard({ message }: { message: LiveChatMessage }) {
  const amount = message.supportAmount ?? 0;
  const tier = commentDonationTier(amount);
  const displayMessage = message.tipMessage?.trim() || message.content;
  const username = message.username.startsWith("@") ? message.username.slice(1) : message.username;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { backgroundColor: tier.headerBg }]}>
        <FolkAvatar uri={message.image} name={username} size={28} framed={false} />
        <Text style={styles.username} numberOfLines={1}>
          @{username}
        </Text>
        <Text style={styles.amount}>{formatUsd(amount)}</Text>
      </View>
      {displayMessage ? (
        <View style={[styles.body, { backgroundColor: tier.bodyBg }]}>
          <Text style={[styles.message, { color: tier.textColor }]}>{displayMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function CommentDonationTicker({ message }: { message: LiveChatMessage | null }) {
  if (!message || message.messageKind !== "tip") return null;
  const amount = message.supportAmount ?? 0;
  const tier = commentDonationTier(amount);
  const username = message.username.startsWith("@") ? message.username.slice(1) : message.username;

  return (
    <View style={[styles.ticker, { backgroundColor: tier.headerBg }]}>
      <FolkAvatar uri={message.image} name={username} size={20} framed={false} />
      <Text style={styles.tickerUser} numberOfLines={1}>
        @{username}
      </Text>
      <Text style={styles.tickerAmount}>{formatUsd(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  username: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  amount: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
  },
  body: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  ticker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  tickerUser: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },
  tickerAmount: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
  },
});
