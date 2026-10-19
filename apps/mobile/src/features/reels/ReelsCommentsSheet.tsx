import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
  moveCommentPin,
  postCommentsQueryKey,
  type PostCommentsResponse,
} from "@/api/post-comments-query";
import { TranslatableText } from "@/ui/TranslatableText";
import { useI18n } from "@/i18n/I18nProvider";
import { useKeyboardLift } from "@/lib/use-keyboard-inset";
import type { ReelsUi } from "@/features/reels/reels-ui";
import {
  REELS_COMMENT_DURATION_MS,
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
  commentsPostId: string | null;
  comments: CommentItem[];
  commentTotal: number;
  showSpinner: boolean;
  draft: string;
  busy: boolean;
  canPin: boolean;
  copy: ReelsUi;
  onDraftChange: (text: string) => void;
  onSubmit: () => void;
  onClosed: () => void;
};

export function ReelsCommentsSheet({
  progress,
  sheetHeight,
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
  const { keyboardLift } = useKeyboardLift();
  const scrollY = useSharedValue(0);
  const dragStart = useSharedValue(1);

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
          const next = dragStart.value - e.translationY / sheetHeight;
          progress.value = Math.min(1, Math.max(0, next));
        })
        .onEnd((e) => {
          runOnJS(settle)(reelsCommentShouldClose(progress.value, e.velocityY));
        }),
    [dragStart, progress, settle, sheetHeight]
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
          const next = dragStart.value - e.translationY / sheetHeight;
          progress.value = Math.min(1, Math.max(0, next));
        })
        .onEnd((e) => {
          if (scrollY.value > 2 && e.translationY > 0 && progress.value > 0.92) return;
          runOnJS(settle)(reelsCommentShouldClose(progress.value, e.velocityY));
        }),
    [dragStart, progress, scrollY, settle, sheetHeight]
  );

  const listGesture = useMemo(
    () => Gesture.Simultaneous(listPan, Gesture.Native()),
    [listPan]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reelsCommentSheetTranslateY(progress.value, sheetHeight) }],
  }));

  const closeFromButton = useCallback(() => {
    settle(true);
  }, [settle]);

  return (
    <Animated.View
      pointerEvents={commentsPostId ? "auto" : "none"}
      style={[
        styles.sheet,
        { height: sheetHeight, paddingBottom: 10 + keyboardLift },
        sheetStyle,
      ]}
    >
      <GestureDetector gesture={handlePan}>
        <View>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{copy.comments(commentTotal)}</Text>
            <Pressable onPress={closeFromButton} hitSlop={10}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
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
                <View style={styles.commentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentUser}>
                      {item.author.username}
                      {item.isPinned ? (
                        <Text style={styles.commentMeta}> · {t("m.feed.pinned_comments")}</Text>
                      ) : null}
                    </Text>
                    <TranslatableText text={item.content} style={styles.commentBody} lightLinks />
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
      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          placeholder={copy.commentPh}
          placeholderTextColor="rgba(255,255,255,0.45)"
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
        />
        <Pressable onPress={onSubmit} disabled={busy}>
          <Text style={styles.commentSend}>{copy.postComment}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    elevation: 2,
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
  commentSend: { color: "#6BA3E8", fontWeight: "800" },
});
