import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChatMessage } from "@/api/messages";
import { uploadLocalFile } from "@/api/upload-file";
import { useAuth } from "@/auth/AuthContext";
import { shouldShowMessageTime } from "@/features/messages/chat-display";
import { ChatReplyComposerBar } from "@/features/messages/ChatReplyComposerBar";
import { DmImageLightbox, type DmLightboxMeta } from "@/features/messages/DmImageLightbox";
import {
  MessageBubble,
  type DmOpenImagePayload,
} from "@/features/messages/MessageBubble";
import { MessageVoiceSession } from "@/features/messages/MessageVoiceSession";
import { useRoomMessages } from "@/features/messages/useRoomMessages";
import { CreatorCallBookingSheet } from "@/features/messages/CreatorCallBookingSheet";
import { FanArtSellSheet } from "@/features/messages/FanArtSellSheet";
import { FanArtSellComposerButton } from "@/features/messages/FanArtSellComposerButton";
import { SellButtonTrashOverlay } from "@/features/messages/SellButtonTrashOverlay";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { LetterDonationSheet } from "@/payments/LetterDonationSheet";
import { useAdultVerificationGate } from "@/hooks/useAdultVerificationGate";
import {
  loadMessageComposerPrefs,
  setFanArtSellHidden,
} from "@/lib/message-composer-prefs";
import { fetchCreatorCallSettings } from "@/api/call-bookings";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";

const MAX_VOICE_SEC = 120;
const NEAR_BOTTOM_PX = 140;

type VoiceControls = {
  start: () => Promise<void>;
  finish: (shouldSend: boolean) => Promise<void>;
};

type MessageRow = {
  message: ChatMessage;
  showTime: boolean;
};

export function MessageRoomScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, "MessageRoom">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const keyboardOpen = keyboardHeight > 0;
  const { user } = useAuth();
  const { roomId } = route.params;
  const { room, messages, loading, error, sending, nextBefore, loadOlder, send, refresh } =
    useRoomMessages(roomId);
  const [bookingSheet, setBookingSheet] = useState<{
    callType: "AUDIO" | "VIDEO";
  } | null>(null);
  const [letterSheet, setLetterSheet] = useState(false);
  const [fanArtSheet, setFanArtSheet] = useState(false);
  const [fanArtSellHidden, setFanArtSellHiddenState] = useState(false);
  const [sellTrashOverlay, setSellTrashOverlay] = useState(false);
  const adultGate = useAdultVerificationGate("DM_PAID");
  const [peerBookable, setPeerBookable] = useState(false);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [voiceArmed, setVoiceArmed] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [lightbox, setLightbox] = useState<{
    images: DmOpenImagePayload["images"];
    index: number;
    meta: DmLightboxMeta;
  } | null>(null);
  const listRef = useRef<FlatList<MessageRow>>(null);
  const nearBottomRef = useRef(true);
  const voiceControlsRef = useRef<VoiceControls | null>(null);
  const pendingStartRef = useRef(false);
  const busy = sending || uploading;

  const title = route.params.title ?? room?.displayName ?? "대화";
  const peerImage = room?.displayImage ?? null;
  const peerId = room?.otherUserId ?? null;
  const peerUsername = room?.profileUsername ?? null;
  const composerBottomPad = keyboardOpen ? 8 : Math.max(insets.bottom, 8);
  const canSendText = !!draft.trim() && !busy && !recording;

  useEffect(() => {
    if (!peerId) {
      setPeerBookable(false);
      return;
    }
    void fetchCreatorCallSettings(peerId)
      .then((s) => setPeerBookable(s.bookable))
      .catch(() => setPeerBookable(false));
  }, [peerId]);

  useEffect(() => {
    if (!user?.id) return;
    void loadMessageComposerPrefs(user.id).then((prefs) => {
      setFanArtSellHiddenState(prefs.fanArtSellHidden);
    });
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void loadMessageComposerPrefs(user.id).then((prefs) => {
        setFanArtSellHiddenState(prefs.fanArtSellHidden);
      });
    }, [user?.id])
  );

  const onFanArtSellPress = useCallback(() => {
    void adultGate.ensureAdult().then((ok) => {
      if (ok) setFanArtSheet(true);
    });
  }, [adultGate]);

  const hideFanArtSellButton = useCallback(async () => {
    if (!user?.id) return;
    setSellTrashOverlay(false);
    setFanArtSellHiddenState(true);
    await setFanArtSellHidden(user.id, true);
  }, [user?.id]);

  const rows = useMemo<MessageRow[]>(
    () =>
      messages.map((message, index) => ({
        message,
        showTime: shouldShowMessageTime(messages, index),
      })),
    [messages]
  );

  const scrollEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    nearBottomRef.current =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - NEAR_BOTTOM_PX;
  }, []);

  const onSend = useCallback(async () => {
    const text = draft;
    const replyId = replyTo?.id;
    setDraft("");
    setReplyTo(null);
    nearBottomRef.current = true;
    await send(text, undefined, replyId);
    scrollEnd();
  }, [draft, replyTo, send, scrollEnd]);

  const pickAndSendImage = useCallback(
    async (source: "camera" | "gallery") => {
      try {
        const result =
          source === "camera"
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ["images"],
                quality: 0.85,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.85,
                allowsMultipleSelection: false,
              });

        if (result.canceled || !result.assets[0]) return;
        setUploading(true);
        const asset = result.assets[0];
        const url = await uploadLocalFile({
          uri: asset.uri,
          filename: asset.fileName || `chat-${Date.now()}.jpg`,
          contentType: asset.mimeType || "image/jpeg",
          category: "image",
        });
        const caption = draft.trim() || undefined;
        const replyId = replyTo?.id;
        if (caption) setDraft("");
        setReplyTo(null);
        nearBottomRef.current = true;
        await send(caption ?? "", [{ url, type: "IMAGE", name: asset.fileName ?? undefined }], replyId);
        scrollEnd();
      } catch (e) {
        Alert.alert("전송 실패", e instanceof Error ? e.message : "사진을 보내지 못했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [draft, replyTo, send, scrollEnd]
  );

  const registerVoiceControls = useCallback((controls: VoiceControls) => {
    voiceControlsRef.current = controls;
    if (pendingStartRef.current) {
      pendingStartRef.current = false;
      void controls.start();
    }
  }, []);

  const finishRecording = useCallback(async (shouldSend: boolean) => {
    await voiceControlsRef.current?.finish(shouldSend);
  }, []);

  const toggleRecording = useCallback(() => {
    if (busy) return;
    if (recording) {
      void finishRecording(true);
      return;
    }
    if (!voiceArmed) {
      pendingStartRef.current = true;
      setVoiceArmed(true);
      return;
    }
    void voiceControlsRef.current?.start();
  }, [busy, recording, finishRecording, voiceArmed]);

  const startCall = useCallback(
    (callType: "AUDIO" | "VIDEO") => {
      if (!peerId) {
        Alert.alert("통화 불가", "상대 정보를 아직 불러오지 못했습니다.");
        return;
      }
      navigation.navigate("DmCall", {
        roomId,
        calleeId: peerId,
        callType,
        displayName: title,
        displayImage: peerImage,
      });
    },
    [navigation, peerId, peerImage, roomId, title]
  );

  const openBooking = useCallback((callType: "AUDIO" | "VIDEO") => {
    if (!peerId) {
      Alert.alert("예약 불가", "상대 정보를 아직 불러오지 못했습니다.");
      return;
    }
    setBookingSheet({ callType });
  }, [peerId]);

  const openPeerProfile = useCallback(() => {
    if (peerUsername) {
      navigation.navigate("UserProfile", { username: peerUsername });
    }
  }, [navigation, peerUsername]);

  const onOpenImage = useCallback((payload: DmOpenImagePayload) => {
    setLightbox({
      images: payload.images,
      index: payload.index,
      meta: {
        senderName: payload.senderName,
        senderImage: payload.senderImage,
        createdAt: payload.createdAt,
        selfLabel: payload.selfLabel,
      },
    });
  }, []);

  const renderItem: ListRenderItem<MessageRow> = useCallback(
    ({ item }) => (
      <MessageBubble
        message={item.message}
        mine={item.message.sender.id === user?.id}
        selfUserId={user?.id}
        showTime={item.showTime}
        roomId={roomId}
        peerId={peerId}
        peerName={title}
        peerImage={peerImage}
        onMessagesRefresh={() => void refresh()}
        onReply={setReplyTo}
        onOpenImage={onOpenImage}
      />
    ),
    [onOpenImage, peerId, peerImage, refresh, roomId, title, user?.id]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {voiceArmed ? (
        <MessageVoiceSession
          active={voiceArmed}
          draft={draft}
          replyId={replyTo?.id}
          setDraft={setDraft}
          clearReply={() => setReplyTo(null)}
          send={send}
          onSent={() => {
            nearBottomRef.current = true;
            scrollEnd();
          }}
          onBusy={setUploading}
          recording={recording}
          setRecording={setRecording}
          recordSec={recordSec}
          setRecordSec={setRecordSec}
          registerControls={registerVoiceControls}
        />
      ) : null}

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.cobalt} />
        </Pressable>

        <Pressable style={styles.headerIdentity} onPress={openPeerProfile}>
          <FolkAvatar uri={peerImage} name={title} size={34} />
          <View style={styles.headerTextCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.presence}>오프라인</Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.callBtn}
            onPress={() => startCall("AUDIO")}
            onLongPress={peerBookable ? () => openBooking("AUDIO") : undefined}
            accessibilityLabel={peerBookable ? "음성 통화 (길게 누르면 예약)" : "음성 통화"}
          >
            <Ionicons name="call-outline" size={18} color={colors.cobalt} />
          </Pressable>
          <Pressable
            style={styles.callBtn}
            onPress={() => startCall("VIDEO")}
            onLongPress={peerBookable ? () => openBooking("VIDEO") : undefined}
            accessibilityLabel={peerBookable ? "영상 통화 (길게 누르면 예약)" : "영상 통화"}
          >
            <Ionicons name="videocam-outline" size={19} color={colors.cobalt} />
          </Pressable>
          {peerId ? (
            <Pressable
              style={styles.callBtn}
              onPress={() => setLetterSheet(true)}
              accessibilityLabel="편지 후원"
            >
              <Ionicons name="mail-outline" size={18} color={colors.terracotta} />
            </Pressable>
          ) : null}
          {peerBookable ? (
            <Pressable
              style={styles.callBtn}
              onPress={() => openBooking("AUDIO")}
              accessibilityLabel="통화 예약"
            >
              <Ionicons name="calendar-outline" size={18} color={colors.terracotta} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          ref={listRef}
          style={styles.list}
          data={rows}
          keyExtractor={(item) => item.message.id}
          renderItem={renderItem}
          contentContainerStyle={
            rows.length === 0 ? styles.emptyList : { paddingTop: spacing.sm, paddingBottom: 8 }
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.empty}>
                <ActivityIndicator color={colors.terracotta} />
                <Text style={styles.emptySub}>대화 불러오는 중…</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>아직 메시지가 없어요</Text>
                <Text style={styles.emptySub}>인사를 건네 보세요</Text>
              </View>
            )
          }
          onScroll={onScroll}
          scrollEventThrottle={64}
          onContentSizeChange={() => {
            if (rows.length && nearBottomRef.current) {
              scrollEnd(false);
            }
          }}
          onStartReached={() => {
            if (nextBefore) void loadOlder();
          }}
          onStartReachedThreshold={0.2}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          windowSize={5}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          removeClippedSubviews={Platform.OS === "android"}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      )}

      <View
        style={[
          styles.composerWrap,
          {
            paddingBottom: composerBottomPad,
            marginBottom: keyboardHeight,
          },
        ]}
      >
        {replyTo ? (
          <ChatReplyComposerBar
            target={replyTo}
            selfUserId={user?.id}
            onCancel={() => setReplyTo(null)}
          />
        ) : null}

        {recording ? (
          <View style={styles.recordingBar}>
            <View style={styles.recDot} />
            <Text style={styles.recordingText}>
              녹음 중 {recordSec}s / {MAX_VOICE_SEC}s
            </Text>
            <Pressable onPress={() => void finishRecording(false)} style={styles.cancelRec}>
              <Text style={styles.cancelRecText}>취소</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composer}>
          <View style={styles.leftBtns}>
            {!fanArtSellHidden ? (
              <Animated.View
                entering={FadeIn.duration(240)}
                exiting={FadeOut.duration(200)}
                layout={Layout.springify().damping(16).stiffness(180)}
              >
                <FanArtSellComposerButton
                  disabled={busy || recording || adultGate.busy}
                  onPress={onFanArtSellPress}
                  onHoldComplete={() => setSellTrashOverlay(true)}
                />
              </Animated.View>
            ) : null}
            <Pressable
              style={styles.cameraBtn}
              disabled={busy || recording}
              onPress={() => void pickAndSendImage("camera")}
              accessibilityLabel="카메라"
            >
              <Ionicons name="camera" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.inputPill}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="메시지 보내기..."
              placeholderTextColor={colors.textMuted}
              multiline
              editable={!recording}
            />
            {!canSendText ? (
              <>
                <Pressable
                  onPress={toggleRecording}
                  hitSlop={8}
                  style={styles.pillIcon}
                  accessibilityLabel={recording ? "녹음 완료·전송" : "음성 녹음"}
                >
                  <Ionicons
                    name={recording ? "stop-circle" : "mic"}
                    size={22}
                    color={recording ? colors.terracotta : colors.cobalt}
                  />
                </Pressable>
                {!recording ? (
                  <Pressable
                    onPress={() => void pickAndSendImage("gallery")}
                    disabled={busy}
                    hitSlop={8}
                    style={styles.pillIcon}
                    accessibilityLabel="갤러리"
                  >
                    <Ionicons name="image-outline" size={22} color={colors.cobalt} />
                  </Pressable>
                ) : null}
                {!recording ? (
                  <Pressable
                    onPress={() => navigation.navigate("GamesHub")}
                    disabled={busy}
                    hitSlop={8}
                    style={styles.pillIcon}
                    accessibilityLabel="게임"
                  >
                    <Ionicons name="game-controller-outline" size={22} color={colors.cobalt} />
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Pressable
                onPress={() => void onSend()}
                disabled={busy || recording}
                hitSlop={8}
                style={styles.sendBtn}
                accessibilityLabel="전송"
              >
                {busy && !recording ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <DmImageLightbox
        visible={!!lightbox}
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.index ?? 0}
        meta={lightbox?.meta ?? null}
        onClose={() => setLightbox(null)}
      />

      {bookingSheet && peerId ? (
        <CreatorCallBookingSheet
          visible
          onClose={() => setBookingSheet(null)}
          creatorId={peerId}
          roomId={roomId}
          callType={bookingSheet.callType}
          displayName={title}
          onSuccess={() => void refresh()}
        />
      ) : null}

      {letterSheet && peerId ? (
        <LetterDonationSheet
          visible
          onClose={() => setLetterSheet(false)}
          creatorId={peerId}
          username={peerUsername ?? peerId}
          displayName={title}
          roomId={roomId}
          onSuccess={() => void refresh()}
        />
      ) : null}

      <FanArtSellSheet
        visible={fanArtSheet}
        onClose={() => setFanArtSheet(false)}
        onSend={async (payload) => {
          setUploading(true);
          try {
            const replyId = replyTo?.id;
            setReplyTo(null);
            nearBottomRef.current = true;
            await send("", [payload], replyId);
            scrollEnd();
          } finally {
            setUploading(false);
          }
        }}
      />

      <SellButtonTrashOverlay
        visible={sellTrashOverlay}
        onDismiss={() => setSellTrashOverlay(false)}
        onConfirmHide={() => void hideFanArtSellButton()}
      />
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      gap: 4,
    },
    headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    headerIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
    headerTextCol: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: "800", color: colors.text },
    presence: { fontSize: 12, color: colors.textMuted, marginTop: 1, fontWeight: "600" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    callBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    error: { color: colors.danger, padding: spacing.md, fontWeight: "600" },
    list: { flex: 1 },
    emptyList: { flexGrow: 1, justifyContent: "center" },
    empty: { alignItems: "center", padding: spacing.xl, gap: 6 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    emptySub: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    composerWrap: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
      backgroundColor: colors.background,
      paddingTop: 8,
      paddingHorizontal: 10,
    },
    recordingBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    recDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.terracotta,
    },
    recordingText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    cancelRec: { paddingHorizontal: 8, paddingVertical: 4 },
    cancelRecText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
    composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    leftBtns: { gap: 6, marginBottom: 2 },
    cameraBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.cobalt,
      alignItems: "center",
      justifyContent: "center",
    },
    inputPill: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-end",
      minHeight: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingLeft: 14,
      paddingRight: 8,
      paddingVertical: 6,
      gap: 2,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
      paddingVertical: Platform.OS === "ios" ? 8 : 4,
    },
    pillIcon: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.terracotta,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 1,
    },
  });
}
