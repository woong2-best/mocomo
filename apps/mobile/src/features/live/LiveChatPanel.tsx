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
import { commentDonationPinMs } from "@/lib/comment-donation";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { LiveSupportPanels } from "@/features/live/LiveSupportPanels";
import { LiveSupportSheet } from "@/features/live/LiveSupportSheet";
import { CommentDonationCard, CommentDonationTicker } from "@/features/live/CommentDonationCard";
import { CommentDonationSheet } from "@/features/live/CommentDonationSheet";
import { MocoTipButton } from "@/features/live/MocoTipButton";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { SupportTierBadge } from "@/ui/SupportTierBadge";
import { Image } from "expo-image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";
import { useMobileLiveChatSocket } from "@/lib/live-chat-socket";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";

type Props = {
  channelId: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  isHost?: boolean;
  paymentsEnabled?: boolean;
  hostDisplayName?: string;
  hostUserId?: string;
  hostUsername?: string;
  pinnedMessage?: string | null;
  currentUserId?: string;
  streamStartedAt?: string;
  /** Chzzk-style dark chat that fills remaining viewport under the player. */
  immersive?: boolean;
};

export function LiveChatPanel({
  channelId,
  viewerCount,
  onViewerCount,
  isHost,
  paymentsEnabled,
  hostDisplayName,
  hostUserId,
  hostUsername,
  pinnedMessage,
  currentUserId,
  streamStartedAt,
  immersive = false,
}: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const keyboardOpen = keyboardHeight > 80;
  const styles = useMemo(
    () => createStyles(colors, immersive),
    [colors, immersive]
  );
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);
  const [cheerOpen, setCheerOpen] = useState(false);
  const [missionOpen, setMissionOpen] = useState(false);
  const sinceRef = useRef(0);
  const alertSinceRef = useRef(
    streamStartedAt ? new Date(streamStartedAt).getTime() - 2000 : Date.now() - 60_000
  );
  const seenSupportRef = useRef(new Set<string>());
  const listRef = useRef<FlatList<LiveChatMessage>>(null);
  const pendingIdRef = useRef(0);
  const sendingRef = useRef(false);

  const mergeChatLine = useCallback((line: LiveChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === line.id)) return prev;
      const next = [...prev, line].sort((a, b) => a.at - b.at);
      const last = next[next.length - 1];
      if (last) sinceRef.current = Math.max(sinceRef.current, last.at);
      return next.slice(-120);
    });
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
  }, []);

  const { connected: socketConnected, relayMessage } = useMobileLiveChatSocket(
    channelId,
    mergeChatLine
  );

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
            // Drop pending lines once the real message arrives (same content + user).
            for (const [id, m] of [...map.entries()]) {
              if (!id.startsWith("pending-")) continue;
              const matched = res.messages.some(
                (r) =>
                  r.content === m.content &&
                  (!m.userId || !r.userId || r.userId === m.userId)
              );
              if (matched) map.delete(id);
            }
            const next = [...map.values()].sort((a, b) => a.at - b.at);
            const last = next[next.length - 1];
            if (last) sinceRef.current = Math.max(sinceRef.current, last.at);
            return next.slice(-120);
          });
        }
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
      const delayMs = socketConnected ? 8_000 : 900;
      timer = setTimeout(() => {
        void tick(false).finally(() => {
          if (!cancelled) loop();
        });
      }, delayMs);
    };
    loop();

    return () => {
      cancelled = true;
      ac.abort();
      if (timer) clearTimeout(timer);
    };
  }, [channelId, onViewerCount, socketConnected]);

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
    if (!content || sendingRef.current) return;

    const tempId = `pending-${++pendingIdRef.current}`;
    const meName = user?.username?.trim() || "me";
    const optimistic: LiveChatMessage = {
      id: tempId,
      userId: currentUserId ?? user?.id ?? "",
      username: meName,
      content,
      at: Date.now(),
      image: user?.image ?? null,
    };

    sendingRef.current = true;
    setSending(true);
    setDraft("");
    setError(null);
    mergeChatLine(optimistic);

    try {
      const res = await sendLiveChat(channelId, content);
      if (!res?.message?.id) {
        throw new Error("INVALID_CHAT_RESPONSE");
      }
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        if (without.some((m) => m.id === res.message.id)) return without;
        const next = [...without, res.message].sort((a, b) => a.at - b.at);
        sinceRef.current = Math.max(sinceRef.current, res.message.at);
        return next.slice(-120);
      });
      setError(null);
      relayMessage(res.message);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    } catch (e) {
      const timedOut = e instanceof ApiError && e.status === 408;
      if (timedOut) {
        // Server may still have saved the message — keep optimistic UI and reconcile via poll.
        setError(null);
        void fetchLiveChat(channelId, {
          since: Math.max(0, sinceRef.current - 5_000) || undefined,
        })
          .then((res) => {
            if (!res.messages.length) return;
            setMessages((prev) => {
              const map = new Map(prev.map((m) => [m.id, m]));
              for (const m of res.messages) map.set(m.id, m);
              for (const [id, m] of [...map.entries()]) {
                if (!id.startsWith("pending-")) continue;
                if (res.messages.some((r) => r.content === m.content)) map.delete(id);
              }
              const next = [...map.values()].sort((a, b) => a.at - b.at);
              const last = next[next.length - 1];
              if (last) sinceRef.current = Math.max(sinceRef.current, last.at);
              return next.slice(-120);
            });
          })
          .catch(() => undefined);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setDraft(content);
        let msg = "채팅 전송에 실패했습니다.";
        if (e instanceof ApiError) {
          msg =
            (e.body &&
            typeof e.body === "object" &&
            "error" in e.body &&
            typeof (e.body as { error: unknown }).error === "string"
              ? (e.body as { error: string }).error
              : null) ||
            (e.message && !e.message.startsWith("API ") ? e.message : null) ||
            msg;
        }
        setError(msg);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [channelId, currentUserId, draft, mergeChatLine, relayMessage, user?.id, user?.image, user?.username]);

  const onSupportRefresh = useCallback(() => {
    void fetchLiveAlerts(channelId, alertSinceRef.current)
      .then((res) => {
        for (const alert of res.alerts) mergeSupportLine(alertToChatLine(alert));
      })
      .catch(() => undefined);
  }, [channelId, mergeSupportLine]);

  const showDonationActions = !isHost && !!hostUserId;
  const canMoco = showDonationActions;

  const pinnedTip = useMemo(() => {
    const tips = messages.filter((m) => m.messageKind === "tip");
    if (tips.length === 0) return null;
    const latest = tips[tips.length - 1]!;
    const pinMs = commentDonationPinMs(latest.supportAmount ?? 0);
    if (Date.now() - latest.at > pinMs) return null;
    return latest;
  }, [messages]);

  const openMoco = useCallback(() => {
    setCheerOpen(true);
  }, []);

  // Android uses window resize; avoid double-offset. iOS needs KAV padding.
  const composerPadBottom = immersive
    ? Math.max(insets.bottom, 8) +
      (Platform.OS === "ios" && keyboardOpen ? Math.max(keyboardHeight - insets.bottom, 0) : 0)
    : 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={immersive ? 0 : 8}
    >
      {!immersive ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>채팅</Text>
          <Text style={styles.headerSub}>{viewerCount}명 시청</Text>
        </View>
      ) : null}

      {pinnedMessage?.trim() ? (
        <View style={styles.pinned}>
          <View style={styles.pinnedAccent} />
          <Ionicons name="pin" size={12} color={immersive ? "#86efac" : colors.cobalt} />
          <Text style={styles.pinnedText} numberOfLines={2}>
            {pinnedMessage.trim()}
          </Text>
        </View>
      ) : null}

      {!immersive ? (
        <LiveSupportPanels
          channelId={channelId}
          isHost={isHost}
          currentUserId={currentUserId}
          onSupportEvent={onSupportRefresh}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={immersive ? "#F5C518" : colors.terracotta} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={
            messages.length === 0
              ? [styles.emptyList, keyboardOpen ? { flexGrow: 0, paddingVertical: 12 } : null]
              : styles.listPad
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.empty}>아직 채팅이 없습니다. 첫 메시지를 남겨 보세요.</Text>
          }
          ListHeaderComponent={pinnedTip ? <CommentDonationTicker message={pinnedTip} /> : null}
          renderItem={({ item }) =>
            item.messageKind === "tip" ? (
              <CommentDonationCard message={item} />
            ) : item.messageKind ? (
              <SupportLine message={item} colors={colors} immersive={immersive} />
            ) : immersive ? (
              <ImmersiveChatLine message={item} />
            ) : (
              <View style={styles.row}>
                <FolkAvatar uri={item.image} name={item.username} size={28} framed={false} />
                <View style={styles.bubble}>
                  <View style={styles.userRow}>
                    <Text style={[styles.user, { color: roleColor(item) }]}>@{item.username}</Text>
                    {item.broadcastRole === "MANAGER" ? (
                      <Image
                        source={require("../../../assets/manager-badge.jpg")}
                        style={{ width: 18, height: 18 }}
                        contentFit="contain"
                      />
                    ) : item.broadcastRole && item.broadcastRole !== "VIEWER" ? (
                      <Text style={styles.roleTag}>
                        {item.broadcastRole === "OWNER"
                          ? "OWNER"
                          : item.broadcastRole === "MODERATOR"
                            ? "MOD"
                            : "VIP"}
                      </Text>
                    ) : (
                      <SupportTierBadge tier={item.supportTierSent ?? "SEED"} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.content,
                      item.broadcastRole === "MANAGER" ? { color: "#5CE1E6" } : undefined,
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
              </View>
            )
          }
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!immersive && showDonationActions ? (
        <View style={styles.actionRow}>
          {paymentsEnabled ? (
            <Pressable style={styles.actionBtn} onPress={() => setCommentOpen(true)}>
              <Ionicons name="logo-usd" size={14} color="#059669" />
              <Text style={styles.actionText}>댓글후원</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.actionBtn} onPress={() => setCheerOpen(true)}>
            <Ionicons name="heart" size={14} color="#eab308" />
            <Text style={styles.actionText}>응원 CP</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => setMissionOpen(true)}>
            <Ionicons name="flag" size={14} color={colors.terracotta} />
            <Text style={styles.actionText}>미션</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.composer,
          immersive ? { paddingBottom: composerPadBottom } : null,
          (cheerOpen || missionOpen || commentOpen) && styles.composerHidden,
        ]}
      >
        {immersive ? (
          <View style={styles.composerAvatar}>
            <Ionicons name="person" size={18} color="#9ca3af" />
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={immersive ? "채팅을 입력해 주세요." : "채팅 메시지..."}
          placeholderTextColor={immersive ? "#6b7280" : colors.textMuted}
          maxLength={200}
          editable={!sending}
          onSubmitEditing={() => void onSend()}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        {canMoco ? (
          immersive ? (
            <MocoTipButton onPress={openMoco} />
          ) : paymentsEnabled && hostUserId && hostUsername ? (
            <Pressable style={styles.dollarBtn} onPress={() => setCommentOpen(true)}>
              <Ionicons name="logo-usd" size={18} color="#059669" />
            </Pressable>
          ) : null
        ) : null}
        {!immersive ? (
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
        ) : (
          <Pressable
            style={[styles.sendImmersive, (!draft.trim() || sending) && styles.sendImmersiveDisabled]}
            onPress={() => void onSend()}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </Pressable>
        )}
      </View>

      {hostDisplayName && hostUserId && hostUsername ? (
        <>
          <CommentDonationSheet
            visible={commentOpen}
            onClose={() => setCommentOpen(false)}
            creatorId={hostUserId}
            username={hostUsername}
            displayName={hostDisplayName}
            channelId={channelId}
            onSuccess={onSupportRefresh}
          />
          <LiveSupportSheet
            visible={cheerOpen}
            onClose={() => setCheerOpen(false)}
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

function roleColor(item: LiveChatMessage): string {
  if (item.broadcastRole === "MANAGER") return "#5CE1E6";
  if (item.broadcastRole === "OWNER") return "#f59e0b";
  if (item.broadcastRole === "MODERATOR") return "#10b981";
  if (item.broadcastRole === "VIP") return "#8b5cf6";
  return "#60a5fa";
}

function ImmersiveChatLine({ message }: { message: LiveChatMessage }) {
  return (
    <View style={immersiveLine.row}>
      {message.broadcastRole === "MANAGER" ? (
        <Image
          source={require("../../../assets/manager-badge.jpg")}
          style={immersiveLine.badge}
          contentFit="contain"
        />
      ) : message.broadcastRole && message.broadcastRole !== "VIEWER" ? (
        <Text style={immersiveLine.role}>
          {message.broadcastRole === "OWNER"
            ? "OWNER"
            : message.broadcastRole === "MODERATOR"
              ? "MOD"
              : "VIP"}
        </Text>
      ) : (
        <SupportTierBadge tier={message.supportTierSent ?? "SEED"} />
      )}
      <Text style={[immersiveLine.user, { color: roleColor(message) }]}>
        {message.username}
      </Text>
      <Text style={immersiveLine.content}>{message.content}</Text>
    </View>
  );
}

const immersiveLine = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  badge: { width: 16, height: 16 },
  role: {
    fontSize: 9,
    fontWeight: "800",
    color: "#e2e8f0",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: "hidden",
  },
  user: { fontSize: 13, fontWeight: "800" },
  content: { fontSize: 13, fontWeight: "600", color: "#f3f4f6", lineHeight: 18, flexShrink: 1 },
});

function SupportLine({
  message,
  colors,
  immersive,
}: {
  message: LiveChatMessage;
  colors: ThemeColors;
  immersive?: boolean;
}) {
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
    <View
      style={[
        supportStyles.line,
        { backgroundColor: tone.bg, borderColor: tone.border },
        immersive ? supportStyles.lineImmersive : null,
      ]}
    >
      <Text style={[supportStyles.label, { color: immersive ? "#9ca3af" : colors.textMuted }]}>
        {kind === "tip"
          ? "MOCO 후원"
          : kind === "mission"
            ? "미션"
            : message.eventType === "ROULETTE"
              ? "룰렛"
              : "MOCO 응원"}
      </Text>
      <Text style={[supportStyles.content, { color: immersive ? "#f9fafb" : colors.text }]}>
        {message.content}
      </Text>
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
  lineImmersive: {
    marginBottom: 6,
    backgroundColor: "rgba(245,197,24,0.08)",
    borderColor: "rgba(245,197,24,0.28)",
  },
  label: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  content: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
});

function createStyles(colors: ThemeColors, immersive: boolean) {
  if (immersive) {
    return StyleSheet.create({
      root: {
        flex: 1,
        backgroundColor: "#0b0b0d",
        overflow: "hidden",
      },
      header: { display: "none" },
      headerTitle: {},
      headerSub: {},
      pinned: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginHorizontal: 0,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: "#16161a",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#222228",
      },
      pinnedAccent: {
        width: 3,
        alignSelf: "stretch",
        backgroundColor: "#22c55e",
        borderRadius: 2,
        marginRight: 2,
      },
      pinnedText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#e5e7eb", lineHeight: 17 },
      list: { flex: 1 },
      listPad: { paddingHorizontal: 10, paddingVertical: 8 },
      emptyList: { flexGrow: 1, justifyContent: "center", padding: 20 },
      empty: { textAlign: "center", color: "#6b7280", fontWeight: "600", fontSize: 13 },
      row: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "flex-start" },
      bubble: { flex: 1, minWidth: 0 },
      userRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 2 },
      user: { fontSize: 11, fontWeight: "700" },
      roleTag: {
        fontSize: 9,
        fontWeight: "800",
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.12)",
        color: "#e2e8f0",
      },
      content: { fontSize: 13, fontWeight: "600", color: "#f3f4f6", lineHeight: 18 },
      error: {
        color: "#f87171",
        fontSize: 12,
        fontWeight: "600",
        paddingHorizontal: 12,
        paddingBottom: 4,
      },
      actionRow: { display: "none" },
      actionBtn: {},
      actionText: {},
      composer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#1f1f24",
        backgroundColor: "#0b0b0d",
      },
      composerHidden: {
        opacity: 0,
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: "hidden",
        borderTopWidth: 0,
      },
      composerAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#1f1f24",
        alignItems: "center",
        justifyContent: "center",
      },
      input: {
        flex: 1,
        borderWidth: 0,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === "ios" ? 10 : 8,
        color: "#f3f4f6",
        fontWeight: "600",
        fontSize: 14,
        backgroundColor: "#1a1a1f",
      },
      send: {},
      sendDisabled: {},
      sendText: {},
      sendImmersive: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#2563eb",
        alignItems: "center",
        justifyContent: "center",
      },
      sendImmersiveDisabled: { opacity: 0.4 },
      dollarBtn: {},
    });
  }

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
    pinnedAccent: { display: "none" },
    pinnedText: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.text, lineHeight: 17 },
    list: { flex: 1 },
    listPad: { padding: 10, gap: 8 },
    emptyList: { flexGrow: 1, justifyContent: "center", padding: 20 },
    empty: { textAlign: "center", color: colors.textMuted, fontWeight: "600", fontSize: 13 },
    row: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "flex-start" },
    bubble: { flex: 1, minWidth: 0 },
    userRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 2 },
    user: { fontSize: 11, fontWeight: "700" },
    roleTag: {
      fontSize: 9,
      fontWeight: "800",
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.12)",
      color: "#e2e8f0",
    },
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
    composerHidden: {
      opacity: 0,
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      padding: 0,
      overflow: "hidden",
      borderTopWidth: 0,
    },
    composerAvatar: { display: "none" },
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
    sendImmersive: { display: "none" },
    sendImmersiveDisabled: {},
    dollarBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.md,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
  });
}
