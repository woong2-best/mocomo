import { memo, useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import type { ChatMessage } from "@/api/messages";
import { ChatReplyQuote } from "@/features/messages/ChatReplyQuote";
import { ChatSharedPostCard } from "@/features/messages/ChatSharedPostCard";
import { ChatVoiceMessage } from "@/features/messages/ChatVoiceMessage";
import type { DmLightboxImage } from "@/features/messages/DmImageLightbox";
import { formatBubbleTime } from "@/features/messages/chat-display";
import { parseChatPostShare, splitTextWithUrls } from "@/lib/chat-post-share";
import { parseCallBookingMarker, stripCallBookingMarker } from "@/lib/chat-call-booking";
import { CallBookingCard } from "@/features/messages/CallBookingCard";
import { IMAGE_CACHE_POLICY, feedMediaDecodeWidth } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

const BUBBLE_IMAGE = 200;
const STANDALONE_W = 220;
const STANDALONE_H = 320;

export type DmOpenImagePayload = {
  images: DmLightboxImage[];
  index: number;
  senderName: string;
  senderImage: string | null;
  createdAt: string;
  selfLabel?: string;
};

type Props = {
  message: ChatMessage;
  mine: boolean;
  selfUserId?: string;
  showTime?: boolean;
  roomId?: string;
  peerId?: string | null;
  peerName?: string;
  peerImage?: string | null;
  onMessagesRefresh?: () => void;
  onReply?: (message: ChatMessage) => void;
  /** Instagram-style fullscreen when tapping DM photos */
  onOpenImage?: (payload: DmOpenImagePayload) => void;
};

function ChatMessageImage({
  image,
  frameStyle,
  decodeW,
  decodeH,
  onPress,
  onLongPress,
}: {
  image: { id: string; url: string };
  frameStyle: ViewStyle;
  decodeW: number;
  decodeH: number;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <View style={[frameStyle, styles.imageFrame]}>
      <Image
        source={{ uri: image.url, width: decodeW, height: decodeH }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy={IMAGE_CACHE_POLICY}
        recyclingKey={image.url}
        transition={0}
        pointerEvents="none"
      />
      {/* Native Image swallows taps — overlay hit target (same as feed). */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={280}
        accessibilityRole="button"
        accessibilityLabel="사진 크게 보기"
      />
    </View>
  );
}

function MessageText({
  text,
  mine,
  styles,
}: {
  text: string;
  mine: boolean;
  styles: ReturnType<typeof createThemedStyles>;
}) {
  const parts = splitTextWithUrls(text);
  return (
    <Text style={[styles.text, mine && styles.textMine]}>
      {parts.map((part, i) =>
        part.url ? (
          <Text
            key={`${i}-${part.url}`}
            style={[styles.link, mine && styles.linkMine]}
            onPress={() => void Linking.openURL(part.url!)}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={`${i}-t`}>{part.text}</Text>
        )
      )}
    </Text>
  );
}

function ReplyButton({
  onPress,
  styles,
}: {
  onPress: () => void;
  styles: ReturnType<typeof createThemedStyles>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.replyBtn} accessibilityLabel="답장">
      <Ionicons name="arrow-undo-outline" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function MessageBubbleInner({
  message,
  mine,
  selfUserId,
  showTime = true,
  roomId,
  peerId,
  peerName,
  peerImage,
  onMessagesRefresh,
  onReply,
  onOpenImage,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const images = (message.attachments ?? []).filter((a) => a.type === "IMAGE" || a.type === "GIF");
  const audios = (message.attachments ?? []).filter((a) => a.type === "AUDIO");
  const share = parseChatPostShare(message.content);
  const bookingId = parseCallBookingMarker(message.content);
  const bookingCaption = bookingId ? stripCallBookingMarker(message.content) : null;
  const visibleText = share ? share.note : bookingId ? bookingCaption : message.content;
  const imageOnly = images.length > 0 && !visibleText && !message.replyTo && !share && !bookingId;
  const hasTextBubble = !!(visibleText || message.replyTo) && !imageOnly;
  const timeLabel = formatBubbleTime(message.createdAt);
  const bubbleDecode = feedMediaDecodeWidth(BUBBLE_IMAGE);
  const standaloneDecodeW = feedMediaDecodeWidth(STANDALONE_W);
  const standaloneDecodeH = feedMediaDecodeWidth(STANDALONE_H);
  const lightboxImages = useMemo(
    () => images.map((img) => ({ id: img.id, url: img.url })),
    [images]
  );

  const senderName = message.sender.username;
  const selfLabel = mine ? "나" : undefined;

  const openImageAt = (index: number) => {
    if (!onOpenImage || lightboxImages.length === 0) return;
    onOpenImage({
      images: lightboxImages,
      index,
      senderName,
      senderImage: message.sender.image,
      createdAt: message.createdAt,
      selfLabel,
    });
  };

  const openSharedImage = (url: string, id: string) => {
    onOpenImage?.({
      images: [{ id, url }],
      index: 0,
      senderName,
      senderImage: message.sender.image,
      createdAt: message.createdAt,
      selfLabel,
    });
  };

  const reply = onReply ? <ReplyButton onPress={() => onReply(message)} styles={styles} /> : null;

  const content = (
    <View style={styles.stack}>
      {hasTextBubble || (images.length > 0 && !imageOnly) ? (
        <Pressable
          onLongPress={onReply ? () => onReply(message) : undefined}
          delayLongPress={280}
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
        >
          {message.replyTo ? (
            <ChatReplyQuote replyTo={message.replyTo} mine={mine} selfUserId={selfUserId} />
          ) : null}
          {!imageOnly &&
            images.map((image, imageIndex) => (
              <ChatMessageImage
                key={image.id}
                image={image}
                frameStyle={styles.imageInBubble}
                decodeW={bubbleDecode}
                decodeH={bubbleDecode}
                onPress={() => openImageAt(imageIndex)}
                onLongPress={onReply ? () => onReply(message) : undefined}
              />
            ))}
          {visibleText ? <MessageText text={visibleText} mine={mine} styles={styles} /> : null}
        </Pressable>
      ) : null}

      {imageOnly
        ? images.map((image, imageIndex) => (
            <ChatMessageImage
              key={image.id}
              image={image}
              frameStyle={styles.imageStandalone}
              decodeW={standaloneDecodeW}
              decodeH={standaloneDecodeH}
              onPress={() => openImageAt(imageIndex)}
              onLongPress={onReply ? () => onReply(message) : undefined}
            />
          ))
        : null}

      {audios.map((audio) => (
        <Pressable
          key={audio.id}
          onLongPress={onReply ? () => onReply(message) : undefined}
          delayLongPress={280}
        >
          <ChatVoiceMessage url={audio.url} mine={mine} />
        </Pressable>
      ))}

      {share ? (
        <ChatSharedPostCard
          postId={share.postId}
          mine={mine}
          onLongPress={onReply ? () => onReply(message) : undefined}
          onOpenImage={onOpenImage ? openSharedImage : undefined}
        />
      ) : null}

      {bookingId && roomId && selfUserId ? (
        <CallBookingCard
          bookingId={bookingId}
          selfUserId={selfUserId}
          peerId={peerId ?? null}
          peerName={peerName ?? "상대"}
          peerImage={peerImage}
          roomId={roomId}
          onRefresh={onMessagesRefresh}
        />
      ) : null}

      {showTime ? (
        <Text style={[styles.time, mine ? styles.timeMine : styles.timeOther]}>{timeLabel}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      {mine ? (
        <>
          {reply}
          {content}
        </>
      ) : (
        <>
          {content}
          {reply}
        </>
      )}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleInner);

const styles = StyleSheet.create({
  imageFrame: { overflow: "hidden" },
});

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: spacing.md,
      marginBottom: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    rowMine: { justifyContent: "flex-end" },
    rowOther: { justifyContent: "flex-start" },
    stack: { maxWidth: "72%", gap: 4 },
    replyBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      opacity: 0.85,
    },
    bubble: {
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      overflow: "hidden",
    },
    bubbleMine: {
      backgroundColor: colors.terracotta,
      borderBottomRightRadius: 5,
    },
    bubbleOther: {
      backgroundColor: "#FFFFFF",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderBottomLeftRadius: 5,
    },
    text: { fontSize: 15, lineHeight: 21, color: colors.text },
    textMine: { color: "#fff" },
    link: { color: colors.cobalt, textDecorationLine: "underline" },
    linkMine: { color: "#FFF3E8" },
    time: { fontSize: 11, color: colors.textMuted, marginTop: 2, marginBottom: 4 },
    timeMine: { alignSelf: "flex-end" },
    timeOther: { alignSelf: "flex-start" },
    imageInBubble: { width: BUBBLE_IMAGE, height: BUBBLE_IMAGE, borderRadius: 12, marginBottom: 4 },
    imageStandalone: {
      width: STANDALONE_W,
      maxWidth: "100%",
      height: STANDALONE_H,
      borderRadius: 14,
      backgroundColor: colors.muted,
    },
  });
}
