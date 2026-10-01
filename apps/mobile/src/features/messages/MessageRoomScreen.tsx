import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { DirectTradeCard } from "@/features/marketplace/DirectTradeCard";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
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
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { PeerLocalClock, PeerMemberClocks } from "@/features/messages/PeerLocalClock";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { requestUsedTrade } from "@/api/marketplace";
import { UsedTradeMeetCompletionCard } from "@/features/messages/UsedTradeMeetCompletionCard";
import type { Locale } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { uiText } from "@/i18n/ui-text";
import { PostReportSheet } from "@/features/feed/PostReportSheet";

const MAX_VOICE_SEC = 120;
const MEET_DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

function parseMeetTimeInput(text: string): { hours: number; minutes: number } | null {
  const m = text.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function meetDayLabel(offset: number, locale: Locale) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  if (offset === 0) return uiText(locale, "오늘", "Today");
  if (offset === 1) return uiText(locale, "내일", "Tomorrow");
  const daysKo = ["일", "월", "화", "수", "목", "금", "토"];
  const daysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = locale === "ko" ? daysKo[date.getDay()] : daysEn[date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()} (${dayName})`;
}
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
  const { locale, t, u } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, "MessageRoom">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardBottomInset();
  const keyboardOpen = keyboardHeight > 0;
  const { user } = useAuth();
  const { roomId } = route.params;
  const {
    room,
    messages,
    loading,
    error,
    sending,
    nextBefore,
    loadOlder,
    send,
    refresh,
    messagingBlocked,
    blockMessage,
  } = useRoomMessages(roomId);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [voiceArmed, setVoiceArmed] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
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

  const title = room?.displayName ?? route.params.title ?? u("대화", "Chat");
  const peerImage = room?.displayImage ?? null;
  const peerId = room?.otherUserId ?? null;
  const peerUsername = room?.profileUsername ?? null;
  const isGroup = room?.type === "GROUP";
  const memberCount = room?.memberCount ?? room?.members?.length ?? 0;
  const composerBottomPad = keyboardOpen ? 8 : Math.max(insets.bottom, 8);
  const canSendText = !!draft.trim() && !busy && !recording;
  const usedTrade = room?.usedTrade ?? null;
  const [tradeRequestBusy, setTradeRequestBusy] = useState(false);
  const [meetDayOffset, setMeetDayOffset] = useState(1);
  const [meetCustomDate, setMeetCustomDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [meetTimeText, setMeetTimeText] = useState("15:00");
  const [reportOpen, setReportOpen] = useState(false);
  const [roomLockedLocal, setRoomLockedLocal] = useState(false);

  const onRequestUsedTrade = useCallback(async () => {
    if (!usedTrade?.canRequestTrade || tradeRequestBusy) return;
    const parsedTime = parseMeetTimeInput(meetTimeText);
    if (!parsedTime) {
      showIslandError(u("시간", "Time"), u("거래 시간을 HH:MM 형식으로 입력해 주세요.", "Enter trade time as HH:MM."));
      return;
    }
    const meetAt = meetCustomDate ? new Date(meetCustomDate) : new Date();
    if (!meetCustomDate) meetAt.setDate(meetAt.getDate() + meetDayOffset);
    meetAt.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    if (meetAt.getTime() < Date.now()) {
      showIslandError(u("일정", "Schedule"), u("지금보다 이후 시간을 선택해 주세요.", "Pick a time later than now."));
      return;
    }
    setTradeRequestBusy(true);
    try {
      await requestUsedTrade(usedTrade.listingId, roomId, meetAt.toISOString());
      await refresh();
      showIslandSuccess(
        u("거래 요청", "Trade request"),
        usedTrade.isSeller
          ? u("구매자에게 거래 일정을 보냈습니다.", "Trade schedule sent to the buyer.")
          : u("판매자에게 거래 일정을 보냈습니다.", "Trade schedule sent to the seller.")
      );
    } catch (e) {
      showIslandError(u("오류", "Error"), e instanceof Error ? e.message : u("거래 요청에 실패했습니다.", "Could not send trade request."));
    } finally {
      setTradeRequestBusy(false);
    }
  }, [meetCustomDate, meetDayOffset, meetTimeText, refresh, roomId, tradeRequestBusy, u, usedTrade]);

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
        showIslandError(u("전송 실패", "Send failed"), e instanceof Error ? e.message : u("사진을 보내지 못했습니다.", "Could not send photo."));
      } finally {
        setUploading(false);
      }
    },
    [draft, replyTo, send, scrollEnd, u]
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

  const startCall = useCallback(() => {
    if (!peerId) {
      showIslandError(u("통화 불가", "Cannot call"), u("상대 정보를 아직 불러오지 못했습니다.", "Peer info is not loaded yet."));
      return;
    }
    navigation.navigate("DmCall", {
      roomId,
      calleeId: peerId,
      callType: "AUDIO",
      displayName: title,
      displayImage: peerImage,
    });
  }, [navigation, peerId, peerImage, roomId, title, u]);

  const serverLocked = room?.isLocked === true;
  const roomLocked = roomLockedLocal || serverLocked;
  const canSend =
    !roomLocked &&
    !messagingBlocked &&
    (room?.type !== "DM" || room.canMessage !== false);
  const composerLockNote = roomLocked
    ? u(
        "신고가 접수되어 대화가 잠겼습니다.",
        "This conversation was locked after a report was filed."
      )
    : messagingBlocked
      ? (blockMessage ??
        u("차단된 사용자와는 메시지를 주고받을 수 없습니다.", "You cannot message this user because of a block."))
      : u(
          "이 사용자는 자신이 팔로우한 사람에게만 메시지를 받습니다.",
          "This user only accepts messages from people they follow."
        );
  const canCallPeer = room?.canCall !== false;

  const peerProfileSeed = useMemo(
    () =>
      peerUsername
        ? { username: peerUsername, name: title, image: peerImage }
        : null,
    [peerImage, peerUsername, title]
  );

  const prefetchPeerProfile = useCallback(() => {
    if (isGroup || !peerProfileSeed) return;
    prefetchUserProfile(peerProfileSeed);
  }, [isGroup, peerProfileSeed, prefetchUserProfile]);

  const openPeerProfile = useCallback(() => {
    if (isGroup || !peerProfileSeed) return;
    openUserProfile(peerProfileSeed);
  }, [isGroup, openUserProfile, peerProfileSeed]);

  const jumpToQuotedMessage = useCallback(
    (messageId: string) => {
      const index = rows.findIndex((row) => row.message.id === messageId);
      if (index < 0) return;
      nearBottomRef.current = false;
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightMessageId(messageId);
      setTimeout(() => setHighlightMessageId(null), 1500);
    },
    [rows]
  );

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
    ({ item, index }) => {
      const mine = item.message.sender.id === user?.id;
      const prev = index > 0 ? rows[index - 1]?.message : null;
      const showSenderName =
        isGroup && !mine && (!prev || prev.sender.id !== item.message.sender.id);
      return (
        <MessageBubble
          message={item.message}
          mine={mine}
          selfUserId={user?.id}
          selfUsername={user?.username ?? ""}
          showTime={item.showTime}
          roomId={roomId}
          onMessagesRefresh={() => void refresh()}
          onReply={setReplyTo}
          onJumpToQuoted={jumpToQuotedMessage}
          highlighted={highlightMessageId === item.message.id}
          onOpenImage={onOpenImage}
          showSenderName={showSenderName}
        />
      );
    },
    [
      highlightMessageId,
      isGroup,
      jumpToQuotedMessage,
      onOpenImage,
      refresh,
      roomId,
      rows,
      user?.id,
      user?.username,
    ]
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

        <Pressable
          style={styles.headerIdentity}
          onPressIn={isGroup ? undefined : prefetchPeerProfile}
          onPress={isGroup ? () => setAddMemberOpen(true) : openPeerProfile}
        >
          <FolkAvatar uri={peerImage} name={title} size={34} />
          <View style={styles.headerTextCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.presence} numberOfLines={1}>
              {isGroup
                ? u(`${memberCount}명`, `${memberCount} members`)
                : u("오프라인", "Offline")}
              {isGroup ? (
                <>
                  {" · "}
                  <PeerMemberClocks
                    viewerId={user?.id}
                    members={(room?.members ?? []).map((m) => ({
                      id: m.id,
                      name: m.name?.trim() || m.username,
                      timeZone: m.timeZone,
                    }))}
                  />
                </>
              ) : (
                <>
                  {" · "}
                  <PeerLocalClock timeZone={room?.otherTimeZone} />
                </>
              )}
            </Text>
          </View>
        </Pressable>

        <View style={styles.headerActions}>
          {!isGroup && peerId && !roomLocked ? (
            <Pressable
              style={styles.headerBtn}
              onPress={() => setReportOpen(true)}
              accessibilityLabel={u("신고하기", "Report")}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.cobalt} />
            </Pressable>
          ) : null}
          {!isGroup && canCallPeer ? (
            <Pressable
              style={styles.callBtn}
              onPress={startCall}
              accessibilityLabel={u("음성 통화", "Voice call")}
            >
              <Ionicons name="call-outline" size={18} color={colors.cobalt} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!isGroup && peerId ? (
        <PostReportSheet
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          postId={roomId}
          authorId={peerId}
          authorUsername={peerUsername ?? undefined}
          reportTarget="chat_room"
          roomId={roomId}
          productId={usedTrade?.listingId}
          onSubmitted={() => {
            setRoomLockedLocal(true);
            void refresh();
          }}
        />
      ) : null}

      {usedTrade?.directTrade ? (
        <DirectTradeCard view={usedTrade.directTrade} onUpdated={() => void refresh()} />
      ) : null}

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          ref={listRef}
          style={styles.list}
          data={rows}
          extraData={highlightMessageId}
          keyExtractor={(item) => item.message.id}
          renderItem={renderItem}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              });
            }, 120);
          }}
          contentContainerStyle={
            rows.length === 0 ? styles.emptyList : { paddingTop: spacing.sm, paddingBottom: 8 }
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.empty}>
                <ActivityIndicator color={colors.terracotta} />
                <Text style={styles.emptySub}>{t("common.loading")}</Text>
              </View>
            ) : messagingBlocked ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{composerLockNote}</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{u("아직 메시지가 없어요", "No messages yet")}</Text>
                <Text style={styles.emptySub}>{u("인사를 건네 보세요", "Say hello")}</Text>
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
        {!canSend ? <Text style={styles.lockedNote}>{composerLockNote}</Text> : null}

        {canSend && usedTrade?.approvedMeet?.showCompletionPrompt ? (
          <UsedTradeMeetCompletionCard
            requestId={usedTrade.approvedMeet.requestId}
            selfUserId={user?.id ?? ""}
            isBuyer={usedTrade.isBuyer}
            buyerMeetConfirmedAt={usedTrade.approvedMeet.buyerMeetConfirmedAt}
            sellerMeetConfirmedAt={usedTrade.approvedMeet.sellerMeetConfirmedAt}
            onRefresh={() => void refresh()}
          />
        ) : null}

        {canSend && usedTrade?.canRequestTrade ? (
          <View style={styles.usedTradeSchedule}>
            <Text style={styles.usedTradeScheduleLabel}>{u("거래 날짜", "Trade date")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {MEET_DAY_OFFSETS.map((offset) => {
                const isCalendarSlot = offset === 6;
                const selected = isCalendarSlot
                  ? meetCustomDate != null
                  : meetCustomDate == null && meetDayOffset === offset;
                const label = isCalendarSlot
                  ? meetCustomDate
                    ? `${meetCustomDate.getMonth() + 1}/${meetCustomDate.getDate()}`
                    : u("날짜 선택", "Pick date")
                  : meetDayLabel(offset, locale);
                return (
                  <Pressable
                    key={offset}
                    style={[styles.chip, selected && styles.chipOn]}
                    onPress={() => {
                      if (isCalendarSlot) {
                        setCalendarOpen(true);
                        return;
                      }
                      setMeetCustomDate(null);
                      setMeetDayOffset(offset);
                    }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.usedTradeScheduleLabel}>{u("거래 시간", "Trade time")}</Text>
            <TextInput
              style={styles.timeInput}
              value={meetTimeText}
              onChangeText={setMeetTimeText}
              placeholder="15:00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
            <Pressable
              style={styles.usedTradeBar}
              disabled={tradeRequestBusy}
              onPress={() => void onRequestUsedTrade()}
            >
              {tradeRequestBusy ? (
                <ActivityIndicator color={colors.cobalt} size="small" />
              ) : (
                <Text style={styles.usedTradeBarText}>{u("거래 요청하기", "Request trade meetup")}</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {canSend && replyTo ? (
          <ChatReplyComposerBar
            target={replyTo}
            selfUserId={user?.id}
            onCancel={() => setReplyTo(null)}
          />
        ) : null}

        {canSend && recording ? (
          <View style={styles.recordingBar}>
            <View style={styles.recDot} />
            <Text style={styles.recordingText}>
              {u("녹음 중", "Recording")} {recordSec}s / {MAX_VOICE_SEC}s
            </Text>
            <Pressable onPress={() => void finishRecording(false)} style={styles.cancelRec}>
              <Text style={styles.cancelRecText}>{u("취소", "Cancel")}</Text>
            </Pressable>
          </View>
        ) : null}

        {canSend ? <View style={styles.composer}>
          <View style={styles.leftBtns}>
            <Pressable
              style={styles.cameraBtn}
              disabled={busy || recording}
              onPress={() => void pickAndSendImage("camera")}
              accessibilityLabel={u("카메라", "Camera")}
            >
              <Ionicons name="camera" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.inputPill}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={u("메시지 보내기...", "Message…")}
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
                  accessibilityLabel={
                    recording ? u("녹음 완료·전송", "Stop and send") : u("음성 녹음", "Voice message")
                  }
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
                    accessibilityLabel={u("갤러리", "Gallery")}
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
                    accessibilityLabel={t("nav.games")}
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
                accessibilityLabel={u("전송", "Send")}
              >
                {busy && !recording ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </Pressable>
            )}
          </View>
        </View> : null}
      </View>

      <DmImageLightbox
        visible={!!lightbox}
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.index ?? 0}
        meta={lightbox?.meta ?? null}
        onClose={() => setLightbox(null)}
      />

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.calBackdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.calSheet} onPress={() => undefined}>
            <Text style={styles.calTitle}>{u("거래 날짜 선택", "Pick trade date")}</Text>
            <ScrollView style={styles.calScroll} keyboardShouldPersistTaps="handled">
              {Array.from({ length: 60 }, (_, i) => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() + i);
                const label = meetDayLabel(i, locale);
                return (
                  <Pressable
                    key={i}
                    style={styles.calRow}
                    onPress={() => {
                      setMeetCustomDate(d);
                      setCalendarOpen(false);
                    }}
                  >
                    <Text style={styles.calRowText}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
    usedTradeSchedule: { marginBottom: 8, gap: 6 },
    usedTradeScheduleLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
    chipRow: { gap: 6, paddingVertical: 2 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surfaceRaised,
    },
    chipOn: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    chipText: { color: colors.text, fontWeight: "700", fontSize: 12 },
    chipTextOn: { color: colors.textOnAccent },
    timeInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
    },
    calBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    calSheet: {
      maxHeight: "70%",
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: spacing.md,
    },
    calTitle: { fontWeight: "800", fontSize: 16, color: colors.text, marginBottom: 8 },
    calScroll: { maxHeight: 360 },
    calRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    calRowText: { fontSize: 15, fontWeight: "600", color: colors.text },
    usedTradeBar: {
      marginBottom: 8,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.cobalt,
      alignItems: "center",
      justifyContent: "center",
    },
    usedTradeBarText: {
      color: colors.textOnAccent,
      fontWeight: "800",
      fontSize: 15,
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
    lockedNote: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: spacing.sm,
    },
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
