import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  isInstagramStoriesAvailable,
  shareToInstagramStories,
} from "mocomo-instagram-stories";
import { FACEBOOK_APP_ID } from "@/config/env";
import { InstagramStoryCard } from "@/features/share/InstagramStoryCard";
import {
  storyPostUrl,
  type InstagramStoryPost,
} from "@/features/share/instagram-story-post";
import { showIslandError } from "@/ui/IslandToast";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const STORY_TOP = "#142848";
const STORY_BOTTOM = "#1B4A8C";

type Props = {
  visible: boolean;
  onClose: () => void;
  post: InstagramStoryPost | null;
};

export function PostShareSheet({ visible, onClose, post }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const cardRef = useRef<View>(null);
  const [cardReady, setCardReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const instagramReady = isInstagramStoriesAvailable();

  useEffect(() => {
    if (!visible) {
      setCardReady(false);
      setBusy(false);
    }
  }, [visible, post?.id]);

  const close = useCallback(() => {
    if (busy) return;
    onClose();
  }, [busy, onClose]);

  const shareUrl = post ? storyPostUrl(post.id) : "";

  const onMore = useCallback(() => {
    if (!post) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Share.share({ message: shareUrl, url: shareUrl })
      .then(() => onClose())
      .catch(() => {
        showIslandError(t("m.common.error"), t("m.feed.could_not_share_post"));
      });
  }, [onClose, post, shareUrl, t]);

  const onInstagramStories = useCallback(async () => {
    if (!post || busy) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBusy(true);
    try {
      if (!cardReady) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (!cardRef.current) {
        throw new Error(t("m.feed.could_not_prepare_story_card"));
      }
      const stickerUri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      if (!instagramReady) {
        await Share.share({ url: stickerUri, message: shareUrl });
        onClose();
        return;
      }
      await shareToInstagramStories({
        stickerImageUri: stickerUri,
        backgroundTopColor: STORY_TOP,
        backgroundBottomColor: STORY_BOTTOM,
        contentUrl: shareUrl,
        appId: FACEBOOK_APP_ID,
      });
      onClose();
    } catch (e) {
      showIslandError(
        t("m.common.error"),
        e instanceof Error ? e.message : t("m.feed.could_not_open_instagram_stories")
      );
    } finally {
      setBusy(false);
    }
  }, [busy, cardReady, instagramReady, onClose, post, shareUrl, t]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("m.feed.share")}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityLabel={t("m.common.close")}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <Pressable
            style={styles.row}
            onPress={() => void onInstagramStories()}
            disabled={busy || !post}
            accessibilityRole="button"
            accessibilityLabel={t("m.feed.instagram_stories")}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="logo-instagram" size={18} color={colors.text} />
            </View>
            <Text style={styles.rowText}>{t("m.feed.instagram_stories")}</Text>
            {busy ? <ActivityIndicator size="small" color={colors.cobalt} /> : null}
          </Pressable>

          <Pressable
            style={styles.row}
            onPress={onMore}
            disabled={busy || !post}
            accessibilityRole="button"
            accessibilityLabel={t("m.feed.share_more")}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
            </View>
            <Text style={styles.rowText}>{t("m.feed.share_more")}</Text>
          </Pressable>
        </View>
      </Pressable>

      {visible && post ? (
        <View style={styles.host} pointerEvents="none">
          <View ref={cardRef} collapsable={false}>
            <InstagramStoryCard post={post} onReady={() => setCardReady(true)} />
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingTop: spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: { fontSize: 18, fontWeight: "800", color: colors.text },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
    },
    rowText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
    host: {
      position: "absolute",
      left: -10000,
      top: 0,
      opacity: 0.01,
    },
  });
}
