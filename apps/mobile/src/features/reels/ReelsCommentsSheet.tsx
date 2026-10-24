import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlatList, Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { pinPostComment, type CommentItem } from "@/api/social";
import {
  CommentThreadExtras,
  type CommentReplyTarget,
} from "@/features/feed/CommentThreadExtras";
import { CommentMediaBlock } from "@/features/feed/CommentMediaBlock";
import { TenorGifSheet } from "@/features/feed/TenorGifSheet";
import { uploadLocalFile } from "@/api/upload-file";
import * as ImagePicker from "expo-image-picker";
import {
  moveCommentPin,
  postCommentsQueryKey,
  type PostCommentsResponse,
} from "@/api/post-comments-query";
import { TranslatableText } from "@/ui/TranslatableText";
import { useI18n } from "@/i18n/I18nProvider";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import type { ReelsUi } from "@/features/reels/reels-ui";
import {
  REELS_COMMENT_DURATION_MS,
  reelsCommentKeyboardCover,
  reelsCommentKeyboardFrame,
  reelsCommentSheetTranslateY,
  reelsCommentShouldClose,
} from "@/features/reels/reels-comment-layout";

const TIMING = {
  duration: REELS_COMMENT_DURATION_MS,
  easing: Easing.out(Easing.cubic),
};

type Props = {
  progress: SharedValue<number>;
  sheetHeight: number;
  /** Comment layer onLayout height. Stays full-screen when the IME only overlays. */
  layerHeight: number;
  /** Live sheet box, so the video hit target stays above the keyboard sheet. */
  frameHeightSv: SharedValue<number>;
  frameLiftSv: SharedValue<number>;
  commentsPostId: string | null;
  comments: CommentItem[];
  commentTotal: number;
  showSpinner: boolean;
  draft: string;
  busy: boolean;
  canPin: boolean;
  copy: ReelsUi;
  onDraftChange: (text: string) => void;
  onSubmit: (
    media?: { mediaType: "PHOTO" | "GIF"; mediaUrl: string } | null,
    reply?: CommentReplyTarget | null
  ) => void;
  onClosed: () => void;
};

export function ReelsCommentsSheet({
  progress,
  sheetHeight,
  layerHeight,
  frameHeightSv,
  frameLiftSv,
  commentsPostId,
  comments,
  commentTotal,
  showSpinner,
  draft,
  busy,
  canPin,
  copy,
  onDraftChange,
  onSubmit,
  onClosed,
}: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const [replyTarget, setReplyTarget] = useState<CommentReplyTarget | null>(null);
  const [expandNonceById, setExpandNonceById] = useState<Record<string, number>>({});
  const [attach, setAttach] = useState<{ mediaType: "PHOTO" | "GIF"; mediaUrl: string } | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const insets = useSafeAreaInsets();
  const keyboardOverlap = useKeyboardBottomInset();
  const restingLayerRef = useRef(layerHeight);
  // Commit resting height only after the IME event has had time to arrive.
  // A resize that shows up before keyboardDidShow must not become the new baseline,
  // or the sheet stays glued to the physical bottom and the field slides under the keys.
  useEffect(() => {
    if (keyboardOverlap > 0 || layerHeight <= 0) return;
    const t = setTimeout(() => {
      restingLayerRef.current = layerHeight;
    }, 800);
    return () => clearTimeout(t);
  }, [keyboardOverlap, layerHeight]);
  const restingLayer = Math.max(layerHeight, restingLayerRef.current);
  const keyboardCover = reelsCommentKeyboardCover(
    keyboardOverlap,
    layerHeight,
    restingLayer
  );
  const frame = reelsCommentKeyboardFrame(
    sheetHeight,
    restingLayer,
    layerHeight,
    keyboardCover
  );
  const frameHeight = frame.height > 0 ? frame.height : sheetHeight;
  const scrollY = useSharedValue(0);
  const dragStart = useSharedValue(1);
  frameHeightSv.value = frameHeight;
  frameLiftSv.value = frame.lift;

  const settle = useCallback(
    (close: boolean) => {
      if (close) {
        progress.value = withTiming(0, TIMING, (finished) => {
          if (finished) runOnJS(onClosed)();
        });
      } else {
        progress.value = withTiming(1, TIMING);
      }
    },
    [onClosed, progress]
  );

  const handlePan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .onStart(() => {
          dragStart.value = progress.value;
        })
        .onUpdate((e) => {
          const next = dragStart.value - e.translationY / frameHeight;
          progress.value = Math.min(1, Math.max(0, next));
        })
        .onEnd((e) => {
          runOnJS(settle)(reelsCommentShouldClose(progress.value, e.velocityY));
        }),
    [dragStart, frameHeight, progress, settle]
  );

  const listPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(12)
        .onStart(() => {
          dragStart.value = progress.value;
        })
        .onUpdate((e) => {
          if (scrollY.value > 2 && e.translationY > 0) return;
          if (e.translationY < 0 && progress.value >= 0.995) return;
          const next = dragStart.value - e.translationY / frameHeight;
          progress.value = Math.min(1, Math.max(0, next));
        })
        .onEnd((e) => {
          if (scrollY.value > 2 && e.translationY > 0 && progress.value > 0.92) return;
          runOnJS(settle)(reelsCommentShouldClose(progress.value, e.velocityY));
        }),
    [dragStart, frameHeight, progress, scrollY, settle]
  );

  const listGesture = useMemo(
    () => Gesture.Simultaneous(listPan, Gesture.Native()),
    [listPan]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: reelsCommentSheetTranslateY(progress.value, frameHeight) },
    ],
  }));

  const canSend = Boolean(draft.trim() || attach) && !busy && !uploading;

  return (
    <Animated.View
      pointerEvents={commentsPostId ? "auto" : "none"}
      style={[
        styles.sheet,
        {
          height: frameHeight,
          bottom: frame.lift,
          paddingBottom:
            keyboardOverlap > 0 ? 10 : Math.max(10, insets.bottom),
        },
        sheetStyle,
      ]}
    >
      <GestureDetector gesture={handlePan}>
        <View>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{copy.comments(commentTotal)}</Text>
          </View>
          <Text style={styles.sheetSort}>{copy.sortNewest}</Text>
        </View>
      </GestureDetector>
      {showSpinner ? (
        <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />
      ) : (
        <GestureDetector gesture={listGesture}>
          <Animated.View style={styles.listWrap}>
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScroll={(e) => {
                scrollY.value = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              bounces={false}
              overScrollMode="never"
              renderItem={({ item }) => (
                <View style={styles.commentRow} nativeID={`comment-${item.id}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentUser}>
                      {item.author.username}
                      {item.isPinned ? (
                        <Text style={styles.commentMeta}> · {t("m.feed.pinned_comments")}</Text>
                      ) : null}
                    </Text>
                    {item.content ? (
                      <TranslatableText text={item.content} style={styles.commentBody} lightLinks />
                    ) : null}
                    <CommentMediaBlock mediaType={item.mediaType} mediaUrl={item.mediaUrl} />
                    <CommentThreadExtras
                      comment={item}
                      rootId={item.id}
                      light
                      expandNonce={expandNonceById[item.id]}
                      onReply={(target) => {
                        setReplyTarget(target);
                        onDraftChange(`@${target.username} `);
                        requestAnimationFrame(() => inputRef.current?.focus());
                      }}
                    />
                  </View>
                  {canPin && commentsPostId ? (
                    <Pressable
                      onPress={() => {
                        const next = !item.isPinned;
                        queryClient.setQueryData<PostCommentsResponse>(
                          postCommentsQueryKey(commentsPostId),
                          (old) => moveCommentPin(old, item.id, next)
                        );
                        void pinPostComment(item.id, next).catch(() => {
                          queryClient.setQueryData<PostCommentsResponse>(
                            postCommentsQueryKey(commentsPostId),
                            (old) => moveCommentPin(old, item.id, !next)
                          );
                        });
                      }}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={item.isPinned ? "pin" : "pin-outline"}
                        size={16}
                        color="rgba(255,255,255,0.55)"
                      />
                    </Pressable>
                  ) : null}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.muted}>{copy.noComments}</Text>}
            />
          </Animated.View>
        </GestureDetector>
      )}
      {attach ? (
        <View style={{ paddingBottom: 8 }}>
          <CommentMediaBlock mediaType={attach.mediaType} mediaUrl={attach.mediaUrl} />
        </View>
      ) : null}
      {replyTarget ? (
        <View style={styles.replyBar}>
          <Text style={styles.replyBarText}>
            {t("m.feed.replying_to", { username: replyTarget.username })}
          </Text>
          <Pressable
            onPress={() => {
              if (
                draft === `@${replyTarget.username} ` ||
                /^@[A-Za-z0-9_]+\s*$/.test(draft)
              ) {
                onDraftChange("");
              }
              setReplyTarget(null);
            }}
            hitSlop={8}
            accessibilityLabel={t("m.feed.cancel_reply")}
          >
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.commentInputRow}>
        <Pressable
          onPress={() => {
            void (async () => {
              if (attach || uploading) return;
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) return;
              const picked = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.85,
              });
              if (picked.canceled || !picked.assets[0]) return;
              const asset = picked.assets[0];
              setUploading(true);
              try {
                const url = await uploadLocalFile({
                  uri: asset.uri,
                  filename: asset.fileName ?? `comment-${Date.now()}.jpg`,
                  contentType: asset.mimeType ?? "image/jpeg",
                  category: "image",
                });
                setAttach({ mediaType: "PHOTO", mediaUrl: url });
              } finally {
                setUploading(false);
              }
            })();
          }}
          disabled={!!attach || uploading}
          hitSlop={8}
        >
          <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Pressable onPress={() => setGifOpen(true)} disabled={!!attach || uploading} hitSlop={8}>
          <Ionicons name="happy-outline" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <TextInput
          ref={inputRef}
          style={styles.commentInput}
          placeholder={replyTarget ? t("m.feed.write_a_reply") : copy.commentPh}
          placeholderTextColor="rgba(255,255,255,0.45)"
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={() => {
            const reply = replyTarget;
            if (reply) {
              setExpandNonceById((prev) => ({
                ...prev,
                [reply.rootId]: (prev[reply.rootId] ?? 0) + 1,
              }));
            }
            onSubmit(attach, reply);
            setAttach(null);
            setReplyTarget(null);
          }}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => {
            const reply = replyTarget;
            if (reply) {
              setExpandNonceById((prev) => ({
                ...prev,
                [reply.rootId]: (prev[reply.rootId] ?? 0) + 1,
              }));
            }
            onSubmit(attach, reply);
            setAttach(null);
            setReplyTarget(null);
          }}
          disabled={!canSend}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("m.common.send")}
        >
          {busy || uploading ? (
            <ActivityIndicator size="small" color="#6BA3E8" />
          ) : (
            <Ionicons
              name="paper-plane"
              size={22}
              color={canSend ? "#6BA3E8" : "rgba(255,255,255,0.28)"}
            />
          )}
        </Pressable>
      </View>
      <TenorGifSheet
        visible={gifOpen}
        onClose={() => setGifOpen(false)}
        onPick={(url) => setAttach({ mediaType: "GIF", mediaUrl: url })}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 8,
    elevation: 8,
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  sheetSort: { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 4, marginBottom: 8 },
  listWrap: { flex: 1, minHeight: 80 },
  muted: { color: "rgba(255,255,255,0.7)", textAlign: "center", padding: 24 },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  commentUser: { color: "#fff", fontWeight: "800", marginBottom: 4 },
  commentMeta: { color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  commentBody: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  replyBarText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 10,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
  },
});
