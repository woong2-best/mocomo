import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchLiveAlerts,
  fetchLiveChat,
  sendLiveChat,
  type LiveChatMessage,
} from "@/api/live";
import { ApiError } from "@/api/client";
import { alertToChatLine } from "@/lib/live-support";
import { LiveSupportPanels } from "@/features/live/LiveSupportPanels";
import { LiveSupportSheet } from "@/features/live/LiveSupportSheet";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { LinkifiedText } from "@/ui/LinkifiedText";
import { SupportTierBadge } from "@/ui/SupportTierBadge";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  channelId: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  isHost?: boolean;
  paymentsEnabled?: boolean;
  hostDisplayName?: string;
  hostUserId?: string;
  pinnedMessage?: string | null;
  currentUserId?: string;
  onTipPress?: () => void;
  streamStartedAt?: string;
};

export function LiveChatPanel({
  channelId,
  viewerCount,
  onViewerCount,
  isHost,
  paymentsEnabled,
  hostDisplayName,
  hostUserId,
  pinnedMessage,
  currentUserId,
  onTipPress,
  streamStartedAt,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportOpen, setSupportOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const sinceRef = useRef(0);
  const alertSinceRef = useRef(
    streamStartedAt ? new Date(streamStartedAt).getTime() - 2000 : Date.now() - 60_000
  );
  const seenSupportRef = useRef(new Set<string>());
  const listRef = useRef<FlatList<LiveChatMessage>>(null);

  const mergeSupportLine = useCallback((line: LiveChatMessage) => {
    if (seenSupportRef.current.has(line.id)) return;
    seenSupportRef.current.add(line.id);
    setMessages((prev) => {
      if (prev.some((m) => m.id === line.id)) return prev;
      return [...prev, line].sort((a, b) => a.at - b.at).slice(-120);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ac = new AbortController();

    async function tick(initial: boolean) {
      try {
        const res = await fetchLiveChat(channelId, {
          initial,
          since: initial ? undefined : sinceRef.current || undefined,
          signal: ac.signal,
        });
        if (cancelled) return;
        onViewerCount?.(res.viewerCount);
        if (res.messages.length) {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const m of res.messages) map.set(m.id, m);
            const next = [...map.values()].sort((a, b) => a.at - b.at);
            const last = next[next.length - 1];
            if (last) sinceRef.current = last.at;
            return next.slice(-120);
          });
        }
        setError(null);
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
        if (e instanceof ApiError && e.status === 403) {
          setError("채팅에 참여할 수 없습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void tick(true);
    const loop = () => {
      timer = setTimeout(() => {
        void tick(false).finally(() => {
          if (!cancelled) loop();
        });
      }, 2500);
    };
    loop();

    return () => {
      cancelled = true;
      ac.abort();
      if (timer) clearTimeout(timer);
    };
  }, [channelId, onViewerCount]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function pollAlerts() {
      try {
        const res = await fetchLiveAlerts(channelId, alertSinceRef.current);
        if (cancelled) return;
        for (const alert of res.alerts) {
          mergeSupportLine(alertToChatLine(alert));
          alertSinceRef.current = Math.max(
            alertSinceRef.current,
            new Date(alert.at).getTime()
          );
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) timer = setTimeout(pollAlerts, 3000);
    }

    void pollAlerts();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [channelId, mergeSupportLine]);

  const onSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    try {
      const res = await sendLiveChat(channelId, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        const next = [...prev, res.message];
        sinceRef.current = Math.max(sinceRef.current, res.message.at);
        return next.slice(-120);
      });
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      setDraft(content);
      const msg =
        e instanceof ApiError &&
        e.body &&
        typeof e.body === "object" &&
        "error" in e.body
          ? String((e.body as { error: string }).error)
          : "채팅 전송에 실패했습니다.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }, [channelId, draft, sending]);

  const onSupportRefresh = useCallback(() => {
    void fetchLiveAlerts(channelId, alertSinceRef.current)
      .then((res) => {
        for (const alert of res.alerts) mergeSupportLine(alertToChatLine(alert));
      })
      .catch(() => undefined);
  }, [channelId, mergeSupportLine]);

  const showDonationActions = !isHost && !!hostUserId;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={8}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
        <Text style={styles.headerSub}>{viewerCount}명 시청</Text>
      </View>

      {pinnedMessage?.trim() ? (
        <View style={styles.pinned}>
          <Ionicons name="pin" size={12} color={colors.cobalt} />
          <Text style={styles.pinnedText} numberOfLines={3}>
            {pinnedMessage.trim()}
          </Text>
        </View>
      ) : null}

      <LiveSupportPanels
        channelId={channelId}
        isHost={isHost}
        currentUserId={currentUserId}
        onSupportEvent={onSupportRefresh}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.terracotta} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.listPad}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.empty}>아직 채팅이 없습니다. 첫 메시지를 남겨 보세요.</Text>
          }
          renderItem={({ item }) =>
            item.messageKind ? (
              <SupportLine message={item} colors={colors} />
            ) : (
              <View style={styles.row}>
                <FolkAvatar uri={item.image} name={item.username} size={28} framed={false} />
                <View style={styles.bubble}>
                  <View style={styles.userRow}>
                    <Text style={[styles.user, { color: "#f97316" }]}>@{item.username}</Text>
                    <SupportTierBadge tier={item.supportTierSent ?? "SEED"} />
                  </View>
                  <LinkifiedText text={item.content} style={styles.content} />
                </View>
              </View>
            )
          }
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showDonationActions ? (
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => setSupportOpen(true)}>
            <Ionicons name="heart" size={14} color="#eab308" />
            <Text style={styles.actionText}>채팅후원</Text>
          </Pressable>
          {paymentsEnabled ? (
            <Pressable style={styles.actionBtn} onPress={onTipPress}>
              <Ionicons name="cash" size={14} color={colors.cobalt} />
              <Text style={styles.actionText}>후원</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.actionBtn} onPress={() => setMissionOpen(true)}>
            <Ionicons name="flag" size={14} color={colors.terracotta} />
            <Text style={styles.actionText}>미션</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="채팅 메시지..."
          placeholderTextColor={colors.textMuted}
          maxLength={200}
          editable={!sending}
          onSubmitEditing={() => void onSend()}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}
          disabled={!draft.trim() || sending}
          onPress={() => void onSend()}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>전송</Text>
          )}
        </Pressable>
      </View>

      {hostDisplayName ? (
        <>
          <LiveSupportSheet
            visible={supportOpen}
            onClose={() => setSupportOpen(false)}
            channelId={channelId}
            hostDisplayName={hostDisplayName}
            onSuccess={onSupportRefresh}
          />
          <LiveSupportSheet
            visible={missionOpen}
            onClose={() => setMissionOpen(false)}
            channelId={channelId}
            hostDisplayName={hostDisplayName}
            initialTab="MISSION"
            onSuccess={onSupportRefresh}
          />
        </>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function SupportLine({ message, colors }: { message: LiveChatMessage; colors: ThemeColors }) {
  const kind = message.messageKind ?? "support";
  const tone =
    kind === "tip"
      ? { bg: "#fef3c714", border: "#fbbf2433" }
      : kind === "mission"
        ? { bg: "#ede9fe33", border: "#a78bfa44" }
        : message.eventType === "ROULETTE"
          ? { bg: "#d1fae533", border: "#34d39944" }
          : { bg: "#fef9c314", border: "#eab30844" };

  return (
    <View style={[supportStyles.line, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[supportStyles.label, { color: colors.textMuted }]}>
        {kind === "tip" ? "후원" : kind === "mission" ? "미션" : message.eventType === "ROULETTE" ? "룰렛" : "응원"}
      </Text>
      <Text style={[supportStyles.content, { color: colors.text }]}>{message.content}</Text>
    </View>
  );
}

const supportStyles = StyleSheet.create({
  line: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  label: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  content: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      minHeight: 360,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontWeight: "800", color: colors.text, fontSize: 14 },
    headerSub: { fontWeight: "600", color: colors.textMuted, fontSize: 12 },
    pinned: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      marginHorizontal: 10,
      marginTop: 8,
      padding: 8,
      borderRadius: radii.md,
      backgroundColor: `${colors.cobalt}12`,
    },
    pinnedText: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.text, lineHeight: 17 },
    list: { flex: 1 },
    listPad: { padding: 10, gap: 8 },
    emptyList: { flexGrow: 1, justifyContent: "center", padding: 20 },
    empty: { textAlign: "center", color: colors.textMuted, fontWeight: "600", fontSize: 13 },
    row: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "flex-start" },
    bubble: { flex: 1, minWidth: 0 },
    userRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 2 },
    user: { fontSize: 11, fontWeight: "700" },
    content: { fontSize: 13, fontWeight: "600", color: colors.text, lineHeight: 18 },
    error: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 10,
      paddingBottom: 6,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    actionText: { fontSize: 11, fontWeight: "800", color: colors.text },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
      color: colors.text,
      fontWeight: "600",
      fontSize: 13,
      backgroundColor: colors.muted,
    },
    send: {
      backgroundColor: colors.cobalt,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      minWidth: 56,
      alignItems: "center",
    },
    sendDisabled: { opacity: 0.45 },
    sendText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  });
}
