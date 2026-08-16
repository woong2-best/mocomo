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
import {
  fetchLiveChat,
  sendLiveChat,
  type LiveChatMessage,
} from "@/api/live";
import { ApiError } from "@/api/client";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { LinkifiedText } from "@/ui/LinkifiedText";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  channelId: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
};

export function LiveChatPanel({ channelId, viewerCount, onViewerCount }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sinceRef = useRef(0);
  const listRef = useRef<FlatList<LiveChatMessage>>(null);

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
          renderItem={({ item }) => (
            <View style={styles.row}>
              <FolkAvatar uri={item.image} name={item.username} size={28} framed={false} />
              <View style={styles.bubble}>
                <Text style={styles.user}>@{item.username}</Text>
                <LinkifiedText text={item.content} style={styles.content} />
              </View>
            </View>
          )}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

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
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      minHeight: 320,
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
    list: { flex: 1 },
    listPad: { padding: 10, gap: 8 },
    emptyList: { flexGrow: 1, justifyContent: "center", padding: 20 },
    empty: { textAlign: "center", color: colors.textMuted, fontWeight: "600", fontSize: 13 },
    row: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "flex-start" },
    bubble: { flex: 1, minWidth: 0 },
    user: { fontSize: 11, fontWeight: "700", color: colors.cobalt, marginBottom: 2 },
    content: { fontSize: 13, fontWeight: "600", color: colors.text, lineHeight: 18 },
    error: {
      color: colors.danger,
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
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
