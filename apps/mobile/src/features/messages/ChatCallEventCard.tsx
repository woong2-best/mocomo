import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ParsedCallEvent } from "@/lib/chat-call-event";

function formatCallEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatCallEventCard({
  event,
  createdAt,
}: {
  event: ParsedCallEvent;
  createdAt: string;
}) {
  const isVideo = event.callType === "VIDEO";
  const started = event.phase === "started";
  const icon = isVideo
    ? started
      ? "videocam"
      : "videocam-off"
    : started
      ? "call"
      : "call-outline";

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={18} color="#fff" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{event.label}</Text>
          <Text style={styles.time}>{formatCallEventTime(createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  time: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: "500", marginTop: 2 },
});
