import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toggleMuteUser, togglePostProfileFeature } from "@/api/social";
import { PostReportSheet } from "@/features/feed/PostReportSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  authorId: string;
  authorUsername: string;
  featuredOnProfile?: boolean;
  onFeaturedChange?: (featured: boolean) => void;
  onMuted?: (muted: boolean) => void;
  onBlocked?: () => void;
};

export function FeedPostOverflowMenu({
  visible,
  onClose,
  postId,
  authorId,
  authorUsername,
  featuredOnProfile = false,
  onFeaturedChange,
  onMuted,
  onBlocked,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [featured, setFeatured] = useState(featuredOnProfile);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOnlyOpen, setReportOnlyOpen] = useState(false);
  const [blockReportOpen, setBlockReportOpen] = useState(false);

  const closeAll = useCallback(() => {
    setReportOnlyOpen(false);
    setBlockReportOpen(false);
    onClose();
  }, [onClose]);

  const onFeature = useCallback(async () => {
    if (busy) return;
    setBusy("feature");
    try {
      const res = await togglePostProfileFeature(postId);
      setFeatured(res.featured);
      onFeaturedChange?.(res.featured);
      closeAll();
      Alert.alert(
        res.featured ? "프로필 메인에 올렸습니다" : "프로필 메인에서 내렸습니다"
      );
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }, [busy, closeAll, onFeaturedChange, postId]);

  const onMute = useCallback(async () => {
    if (busy) return;
    setBusy("mute");
    try {
      const res = await toggleMuteUser(authorId, authorUsername);
      setMuted(res.muted);
      onMuted?.(res.muted);
      closeAll();
      Alert.alert(res.muted ? "뮤트했습니다" : "뮤트를 해제했습니다");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "뮤트 처리에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }, [authorId, authorUsername, busy, closeAll, onMuted]);

  return (
    <>
      <Modal
        visible={visible && !reportOnlyOpen && !blockReportOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAll}
      >
        <Pressable style={styles.scrim} onPress={closeAll}>
          <View
            style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
            onStartShouldSetResponder={() => true}
          >
            <Pressable style={styles.row} onPress={() => void onFeature()} disabled={!!busy}>
              <Ionicons name={featured ? "pin-outline" : "pin"} size={20} color={colors.text} />
              <Text style={styles.rowText}>
                {featured ? "프로필 메인에서 내리기" : "내 프로필 메인에 올리기"}
              </Text>
              {busy === "feature" ? <ActivityIndicator size="small" color={colors.cobalt} /> : null}
            </Pressable>
            <View style={styles.sep} />
            <Pressable style={styles.row} onPress={() => void onMute()} disabled={!!busy}>
              <Ionicons
                name={muted ? "volume-high-outline" : "volume-mute-outline"}
                size={20}
                color={colors.text}
              />
              <Text style={styles.rowText}>{muted ? "뮤트 해제" : "뮤트"}</Text>
              {busy === "mute" ? <ActivityIndicator size="small" color={colors.cobalt} /> : null}
            </Pressable>
            <View style={styles.sep} />
            <Pressable
              style={styles.row}
              onPress={() => setReportOnlyOpen(true)}
              disabled={!!busy}
            >
              <Ionicons name="flag-outline" size={20} color={colors.text} />
              <Text style={styles.rowText}>신고하기</Text>
            </Pressable>
            <Pressable
              style={styles.row}
              onPress={() => setBlockReportOpen(true)}
              disabled={!!busy}
            >
              <Ionicons name="ban-outline" size={20} color={colors.terracotta} />
              <Text style={[styles.rowText, styles.dangerText]}>차단 및 신고하기</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={closeAll}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <PostReportSheet
        visible={reportOnlyOpen}
        onClose={closeAll}
        postId={postId}
        authorId={authorId}
        authorUsername={authorUsername}
        mode="report"
      />

      <PostReportSheet
        visible={blockReportOpen}
        onClose={closeAll}
        postId={postId}
        authorId={authorId}
        authorUsername={authorUsername}
        mode="block-report"
        onSubmitted={() => onBlocked?.()}
      />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: 8,
      paddingHorizontal: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 16,
    },
    rowText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" },
    dangerText: { color: colors.terracotta },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    cancelBtn: {
      marginTop: 4,
      marginBottom: 4,
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelText: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  });
}
