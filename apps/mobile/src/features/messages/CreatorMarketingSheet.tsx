import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCreatorMarketingSettings,
  saveCreatorWelcomeMessage,
  sendCreatorBulkMessage,
} from "@/api/creator-dm-marketing";
import { uploadLocalFile } from "@/api/upload-file";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { FolkButton } from "@/ui/FolkButton";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { showIslandToast, showIslandError } from "@/ui/IslandToast"
import {
  SALE_MEDIA_MIN_PRICE_KRW,
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  formatUsd,
} from "@/lib/money";

const PRESETS = [500, 1_000, 3_000, 5_000, 10_000];

type MediaDraft = {
  url: string;
  type: "IMAGE" | "VIDEO";
  name?: string;
  priceKrw: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

function PricePicker({
  price,
  customPrice,
  onPreset,
  onCustomChange,
  colors,
  styles,
}: {
  price: number;
  customPrice: string;
  onPreset: (p: number) => void;
  onCustomChange: (v: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useI18n();
  return (
    <>
      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <Pressable
            key={p}
            onPress={() => onPreset(p)}
            style={[styles.preset, !customPrice && price === p && styles.presetActive]}
          >
            <Text
              style={[styles.presetText, !customPrice && price === p && styles.presetTextActive]}
            >
              {formatUsd(p)}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.customInput}
        value={customPrice}
        onChangeText={onCustomChange}
        placeholder={t("m.messages.custom_price_unlocked_after_payment")}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
      />
    </>
  );
}

export function CreatorMarketingSheet({ visible, onClose }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["creator-dm-marketing"],
    queryFn: fetchCreatorMarketingSettings,
    enabled: visible,
  });

  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");
  const [welcomeMedia, setWelcomeMedia] = useState<MediaDraft | null>(null);
  const [welcomePrice, setWelcomePrice] = useState(1_000);
  const [welcomeCustomPrice, setWelcomeCustomPrice] = useState("");
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const [welcomeError, setWelcomeError] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [bulkMedia, setBulkMedia] = useState<MediaDraft | null>(null);
  const [bulkPrice, setBulkPrice] = useState(1_000);
  const [bulkCustomPrice, setBulkCustomPrice] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");

  useEffect(() => {
    if (!settingsQuery.data) return;
    const s = settingsQuery.data;
    setWelcomeEnabled(s.welcomeEnabled);
    setWelcomeText(s.welcomeText);
    if (s.welcomeMedia) {
      setWelcomeMedia({
        url: s.welcomeMedia.url,
        type: s.welcomeMedia.type === "VIDEO" ? "VIDEO" : "IMAGE",
        name: s.welcomeMedia.name ?? undefined,
        priceKrw: s.welcomeMedia.priceKrw,
      });
      setWelcomePrice(s.welcomeMedia.priceKrw);
    } else {
      setWelcomeMedia(null);
    }
  }, [settingsQuery.data]);

  const welcomeEffectivePrice = welcomeCustomPrice
    ? parseInt(welcomeCustomPrice.replace(/\D/g, ""), 10) || 0
    : welcomePrice;

  const bulkEffectivePrice = bulkCustomPrice
    ? parseInt(bulkCustomPrice.replace(/\D/g, ""), 10) || 0
    : bulkPrice;

  const pickMedia = useCallback(
    async (target: "welcome" | "bulk") => {
      const effectivePrice = target === "welcome" ? welcomeEffectivePrice : bulkEffectivePrice;
      if (effectivePrice < SALE_MEDIA_MIN_PRICE_KRW) {
        const msg = t("m.messages.minimum_price_is_formatusd", { formatUsd: String(formatUsd(SALE_MEDIA_MIN_PRICE_KRW)) });
        if (target === "welcome") setWelcomeError(msg);
        else setBulkError(msg);
        return;
      }
      if (effectivePrice > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
        const msg = t("m.messages.price_must_be_at_most_formatusd", { formatUsd: String(formatUsd(SALE_MEDIA_MAX_PRICE_USD_CENTS)) });
        if (target === "welcome") setWelcomeError(msg);
        else setBulkError(msg);
        return;
      }

      if (target === "welcome") setWelcomeError("");
      else setBulkError("");

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showIslandError(t("m.common.permission_required"), t("m.common.photo_library_access_is_required"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        allowsMultipleSelection: false,
        videoMaxDuration: 120,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const isVideo = asset.type === "video";
      const ext = isVideo ? "mp4" : "jpg";
      const contentType = isVideo ? "video/mp4" : asset.mimeType || "image/jpeg";

      try {
        const url = await uploadLocalFile({
          uri: asset.uri,
          filename: asset.fileName || `marketing-${Date.now()}.${ext}`,
          contentType,
          category: isVideo ? "video" : "image",
        });
        const draft: MediaDraft = {
          url,
          type: isVideo ? "VIDEO" : "IMAGE",
          name: asset.fileName ?? undefined,
          priceKrw: effectivePrice,
        };
        if (target === "welcome") setWelcomeMedia(draft);
        else setBulkMedia(draft);
      } catch (e) {
        showIslandError(
          t("m.common.upload_failed"),
          e instanceof Error ? e.message : t("m.messages.could_not_upload_media")
        );
      }
    },
    [bulkEffectivePrice, t, welcomeEffectivePrice]
  );

  async function handleSaveWelcome() {
    setWelcomeError("");
    setWelcomeBusy(true);
    try {
      const media = welcomeMedia
        ? { ...welcomeMedia, priceKrw: welcomeEffectivePrice }
        : null;
      await saveCreatorWelcomeMessage({
        enabled: welcomeEnabled,
        text: welcomeText,
        mediaUrl: media?.url ?? null,
        mediaType: media?.type ?? null,
        mediaName: media?.name ?? null,
        mediaPriceKrw: media?.priceKrw ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ["creator-dm-marketing"] });
      showIslandToast(
        t("m.common.saved"),
        welcomeEnabled
          ? t("m.messages.welcome_message_auto_send_is_on")
          : t("m.messages.settings_saved")
      );
    } catch (e) {
      setWelcomeError(e instanceof Error ? e.message : t("m.common.could_not_save"));
    } finally {
      setWelcomeBusy(false);
    }
  }

  async function handleBulkSend() {
    setBulkError("");
    setBulkBusy(true);
    try {
      const media = bulkMedia ? { ...bulkMedia, priceKrw: bulkEffectivePrice } : null;
      const result = await sendCreatorBulkMessage({
        text: bulkText,
        mediaUrl: media?.url ?? null,
        mediaType: media?.type ?? null,
        mediaName: media?.name ?? null,
        mediaPriceKrw: media?.priceKrw ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ["creator-dm-marketing"] });
      showIslandToast(
        t("m.messages.sending_started"),
        t("m.messages.started_sending_to_totalfollowers_follow", { totalFollowers: String(result.totalFollowers.toLocaleString()) })
      );
      setBulkText("");
      setBulkMedia(null);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : t("m.messages.could_not_send"));
    } finally {
      setBulkBusy(false);
    }
  }

  const activeJob = settingsQuery.data?.activeBulkJob;
  const followerCount = settingsQuery.data?.followerCount ?? 0;

  return (
    <KeyboardSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      sheetStyle={{ backgroundColor: colors.surface }}
    >
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{t("m.messages.creator_marketing")}</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {settingsQuery.isLoading ? (
        <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.lg }} />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("m.messages.welcome_message")}</Text>
            <Text style={styles.sectionSub}>
              {t("m.messages.sends_an_automatic_dm_to_new")}
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t("m.messages.enable_auto_send")}</Text>
              <Switch
                value={welcomeEnabled}
                onValueChange={setWelcomeEnabled}
                trackColor={{ false: colors.border, true: colors.terracotta }}
                thumbColor="#fff"
              />
            </View>

            <TextInput
              style={styles.textArea}
              value={welcomeText}
              onChangeText={setWelcomeText}
              placeholder={t("m.messages.welcome_message")}
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>{t("m.messages.paid_media_optional")}</Text>
            <PricePicker
              price={welcomePrice}
              customPrice={welcomeCustomPrice}
              onPreset={(p) => {
                setWelcomePrice(p);
                setWelcomeCustomPrice("");
              }}
              onCustomChange={setWelcomeCustomPrice}
              colors={colors}
              styles={styles}
            />

            {welcomeMedia ? (
              <View style={styles.mediaRow}>
                <Ionicons
                  name={welcomeMedia.type === "VIDEO" ? "videocam" : "image"}
                  size={18}
                  color={colors.terracotta}
                />
                <Text style={styles.mediaName} numberOfLines={1}>
                  {welcomeMedia.name ?? t("m.messages.attached")} · {formatUsd(welcomeEffectivePrice)}
                </Text>
                <Pressable onPress={() => setWelcomeMedia(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}

            <FolkButton
              label={t("m.messages.upload_photo_or_video")}
              variant="secondary"
              onPress={() => void pickMedia("welcome")}
            />

            {welcomeError ? <Text style={styles.error}>{welcomeError}</Text> : null}

            <FolkButton
              label={welcomeBusy ? t("m.common.saving") : t("m.messages.save_welcome_auto_send")}
              onPress={() => void handleSaveWelcome()}
              disabled={welcomeBusy}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("m.messages.message_all_followers")}</Text>
            <Text style={styles.sectionSub}>
              {t("m.messages.followercount_followers_sends_sequential", { followerCount: String(followerCount.toLocaleString()) })}
            </Text>

            {activeJob ? (
              <View style={styles.jobBanner}>
                <Text style={styles.jobText}>
                  {t("m.common.sending")} {activeJob.sentCount}/{activeJob.totalFollowers}
                  {activeJob.failedCount > 0
                    ? t("m.messages.failed_failedcount", { failedCount: String(activeJob.failedCount) })
                    : ""}
                </Text>
              </View>
            ) : null}

            <TextInput
              style={styles.textArea}
              value={bulkText}
              onChangeText={setBulkText}
              placeholder={t("m.messages.announcement_or_paid_content_promo")}
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>{t("m.messages.paid_media_optional")}</Text>
            <PricePicker
              price={bulkPrice}
              customPrice={bulkCustomPrice}
              onPreset={(p) => {
                setBulkPrice(p);
                setBulkCustomPrice("");
              }}
              onCustomChange={setBulkCustomPrice}
              colors={colors}
              styles={styles}
            />

            {bulkMedia ? (
              <View style={styles.mediaRow}>
                <Ionicons
                  name={bulkMedia.type === "VIDEO" ? "videocam" : "image"}
                  size={18}
                  color={colors.terracotta}
                />
                <Text style={styles.mediaName} numberOfLines={1}>
                  {bulkMedia.name ?? t("m.messages.attached")} · {formatUsd(bulkEffectivePrice)}
                </Text>
                <Pressable onPress={() => setBulkMedia(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}

            <FolkButton
              label={t("m.messages.upload_photo_or_video")}
              variant="secondary"
              onPress={() => void pickMedia("bulk")}
            />

            {bulkError ? <Text style={styles.error}>{bulkError}</Text> : null}

            <FolkButton
              label={
                bulkBusy ? t("m.messages.preparing_send") : t("m.messages.send_to_all_followers")
              }
              onPress={() => void handleBulkSend()}
              disabled={bulkBusy || !!activeJob || followerCount === 0}
            />
          </View>
        </ScrollView>
      )}
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
    scrollContent: { paddingBottom: spacing.lg, gap: spacing.md },
    section: { gap: 10 },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    sectionSub: { fontSize: 13, color: colors.textMuted, lineHeight: 18, fontWeight: "600" },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    switchLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
    textArea: {
      minHeight: 88,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
    },
    label: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginTop: 4 },
    presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    preset: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    presetActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    presetText: { fontSize: 13, fontWeight: "700", color: colors.text },
    presetTextActive: { color: "#fff" },
    customInput: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
    },
    mediaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 6,
    },
    mediaName: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.text },
    error: { color: colors.danger, fontSize: 13, fontWeight: "600" },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    jobBanner: {
      backgroundColor: colors.muted,
      borderRadius: 10,
      padding: 10,
    },
    jobText: { fontSize: 13, fontWeight: "700", color: colors.terracotta },
  });
}
