import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  isInstagramStoriesAvailable,
  shareToInstagramStories,
} from "mocomo-instagram-stories";
import { FACEBOOK_APP_ID } from "@/config/env";
import { useAuth } from "@/auth/AuthContext";
import { InstagramStoryCard } from "@/features/share/InstagramStoryCard";
import {
  storyPostUrl,
  type InstagramStoryPost,
} from "@/features/share/instagram-story-post";
import { ShareOutsideActions, type ShareOutsideId } from "@/features/share/ShareOutsideActions";
import { ShareRecipientRow } from "@/features/share/ShareRecipientRow";
import { ShareSheetFrame } from "@/features/share/ShareSheetFrame";
import {
  copyShareLink,
  sharePostViaDirectMessage,
  shareToSms,
  shareToWhatsApp,
  shareWithOs,
} from "@/features/share/share-sheet-actions";
import { useShareRecipients, type ShareRecipient } from "@/features/share/share-recipients";
import { SHARE_SHEET } from "@/features/share/share-sheet-theme";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useI18n } from "@/i18n/I18nProvider";

const STORY_TOP = "#142848";
const STORY_BOTTOM = "#1B4A8C";

type Props = {
  visible: boolean;
  onClose: () => void;
  post: InstagramStoryPost | null;
};

export function PostShareSheet({ visible, onClose, post }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const cardRef = useRef<View>(null);
  const [cardReady, setCardReady] = useState(false);
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [outsideBusy, setOutsideBusy] = useState<ShareOutsideId | null>(null);
  const instagramReady = isInstagramStoriesAvailable();
  const { recipients, pending } = useShareRecipients(visible && !!user, query);
  const shareUrl = post ? storyPostUrl(post.id) : "";

  useEffect(() => {
    if (!visible) {
      setCardReady(false);
      setQuery("");
      setSendingId(null);
      setOutsideBusy(null);
    }
  }, [visible, post?.id]);

  const close = useCallback(() => {
    if (sendingId || outsideBusy) return;
    onClose();
  }, [onClose, outsideBusy, sendingId]);

  const onShareToUser = useCallback(
    async (recipient: ShareRecipient) => {
      if (!post || sendingId) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSendingId(recipient.id);
      try {
        await sharePostViaDirectMessage({ userId: recipient.id, postId: post.id });
        showIslandSuccess(
          t("m.feed.shared_via_dm"),
          t("m.feed.sent_to_username", {
            username: recipient.name?.trim() || recipient.username,
          })
        );
        onClose();
      } catch (e) {
        showIslandError(
          t("m.common.error"),
          e instanceof Error ? e.message : t("m.feed.could_not_send_dm")
        );
      } finally {
        setSendingId(null);
      }
    },
    [onClose, post, sendingId, t]
  );

  const onInstagram = useCallback(async () => {
    if (!post || outsideBusy) return;
    setOutsideBusy("instagram");
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
        await shareWithOs(shareUrl);
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
      setOutsideBusy(null);
    }
  }, [cardReady, instagramReady, onClose, outsideBusy, post, shareUrl, t]);

  const onOutside = useCallback(
    async (id: ShareOutsideId) => {
      if (!post || outsideBusy) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (id === "instagram") {
        await onInstagram();
        return;
      }
      setOutsideBusy(id);
      try {
        if (id === "copy") {
          const result = await copyShareLink(shareUrl);
          if (result === "copied") {
            showIslandSuccess(t("m.feed.link_copied"));
          }
          onClose();
          return;
        }
        if (id === "whatsapp") {
          await shareToWhatsApp(shareUrl);
          onClose();
          return;
        }
        if (id === "sms") {
          await shareToSms(shareUrl);
          onClose();
          return;
        }
        await shareWithOs(shareUrl);
        onClose();
      } catch (e) {
        const fallback =
          id === "copy"
            ? t("m.feed.could_not_copy_link")
            : id === "whatsapp"
              ? t("m.feed.could_not_open_whatsapp")
              : id === "sms"
                ? t("m.feed.could_not_open_sms")
                : t("m.feed.could_not_share_post");
        showIslandError(t("m.common.error"), e instanceof Error ? e.message : fallback);
      } finally {
        setOutsideBusy(null);
      }
    },
    [onClose, onInstagram, outsideBusy, post, shareUrl, t]
  );

  return (
    <>
      <ShareSheetFrame visible={visible} onClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Text style={styles.title}>{t("m.feed.share_to")}</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={SHARE_SHEET.placeholder} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("m.feed.search_friends_groups")}
              placeholderTextColor={SHARE_SHEET.placeholder}
              style={styles.search}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel={t("m.common.close")}>
                <Ionicons name="close-circle" size={16} color={SHARE_SHEET.placeholder} />
              </Pressable>
            ) : null}
          </View>

          {user ? (
            <ShareRecipientRow
              recipients={recipients}
              pending={pending}
              sendingId={sendingId}
              emptyLabel={t("m.feed.no_people_to_share")}
              onSelect={(row) => void onShareToUser(row)}
            />
          ) : (
            <View style={styles.signIn}>
              <Text style={styles.signInText}>{t("m.feed.sign_in_to_share")}</Text>
            </View>
          )}

          <ShareOutsideActions
            title={t("m.feed.share_outside")}
            copyLabel={t("m.feed.copy_link")}
            instagramLabel={t("m.feed.instagram")}
            whatsappLabel={t("m.feed.whatsapp")}
            smsLabel={t("m.feed.sms")}
            moreLabel={t("m.feed.share_more")}
            busyId={outsideBusy}
            onPress={(id) => void onOutside(id)}
          />
        </KeyboardAvoidingView>
      </ShareSheetFrame>

      {visible && post ? (
        <View style={styles.host} pointerEvents="none">
          <View ref={cardRef} collapsable={false}>
            <InstagramStoryCard post={post} onReady={() => setCardReady(true)} />
          </View>
        </View>
      ) : null}

      {outsideBusy === "instagram" ? (
        <View style={styles.hiddenSpinner} pointerEvents="none">
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: SHARE_SHEET.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: SHARE_SHEET.elevated,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  search: {
    flex: 1,
    color: SHARE_SHEET.text,
    fontSize: 16,
    paddingVertical: 10,
  },
  signIn: {
    minHeight: 72,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  signInText: {
    color: SHARE_SHEET.muted,
    fontSize: 13,
    fontWeight: "500",
  },
  host: {
    position: "absolute",
    left: -10000,
    top: 0,
    opacity: 0.01,
  },
  hiddenSpinner: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
  },
});
