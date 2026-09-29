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
  const { u } = useI18n();
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
        placeholder={u("직접 입력 (결제 후 열람 가격)", "Custom price (unlocked after payment)")}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
      />
    </>
  );
}

export function CreatorMarketingSheet({ visible, onClose }: Props) {
  const { u } = useI18n();
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
        const msg = u(
          `최소 ${formatUsd(SALE_MEDIA_MIN_PRICE_KRW)}부터 설정할 수 있습니다.`,
          `Minimum price is ${formatUsd(SALE_MEDIA_MIN_PRICE_KRW)}.`
        );
        if (target === "welcome") setWelcomeError(msg);
        else setBulkError(msg);
        return;
      }
      if (effectivePrice > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
        const msg = u(
          `가격은 ${formatUsd(SALE_MEDIA_MAX_PRICE_USD_CENTS)} 이하로 설정해 주세요.`,
          `Price must be at most ${formatUsd(SALE_MEDIA_MAX_PRICE_USD_CENTS)}.`
        );
        if (target === "welcome") setWelcomeError(msg);
        else setBulkError(msg);
        return;
      }

      if (target === "welcome") setWelcomeError("");
      else setBulkError("");

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showIslandError(u("권한 필요", "Permission required"), u("갤러리 접근 권한이 필요합니다.", "Photo library access is required."));
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
          u("업로드 실패", "Upload failed"),
          e instanceof Error ? e.message : u("미디어를 업로드하지 못했습니다.", "Could not upload media.")
        );
      }
    },
    [bulkEffectivePrice, u, welcomeEffectivePrice]
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
        u("저장됨", "Saved"),
        welcomeEnabled
          ? u("웰컴 메시지 자동 발송이 활성화되었습니다.", "Welcome message auto-send is on.")
          : u("설정이 저장되었습니다.", "Settings saved.")
      );
    } catch (e) {
      setWelcomeError(e instanceof Error ? e.message : u("저장하지 못했습니다.", "Could not save."));
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
        u("발송 시작", "Sending started"),
        u(
          `팔로워 ${result.totalFollowers.toLocaleString()}명에게 순차 발송을 시작했습니다.`,
          `Started sending to ${result.totalFollowers.toLocaleString()} followers.`
        )
      );
      setBulkText("");
      setBulkMedia(null);
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : u("발송하지 못했습니다.", "Could not send."));
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
        <Text style={styles.sheetTitle}>{u("크리에이터 마케팅", "Creator marketing")}</Text>
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
            <Text style={styles.sectionTitle}>{u("웰컴 메시지", "Welcome message")}</Text>
            <Text style={styles.sectionSub}>
              {u(
                "새 팔로워에게 자동으로 1:1 메시지를 보냅니다. 유료 미디어는 잠금·블러 처리 후 결제 시 열람됩니다.",
                "Sends an automatic DM to new followers. Paid media stays locked and blurred until purchase."
              )}
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{u("자동 발송 활성화", "Enable auto-send")}</Text>
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
              placeholder={u("Welcome 인사말", "Welcome message")}
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>{u("유료 미디어 (선택)", "Paid media (optional)")}</Text>
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
                  {welcomeMedia.name ?? u("첨부됨", "Attached")} · {formatUsd(welcomeEffectivePrice)}
                </Text>
                <Pressable onPress={() => setWelcomeMedia(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}

            <FolkButton
              label={u("사진·동영상 업로드", "Upload photo or video")}
              variant="secondary"
              onPress={() => void pickMedia("welcome")}
            />

            {welcomeError ? <Text style={styles.error}>{welcomeError}</Text> : null}

            <FolkButton
              label={welcomeBusy ? u("저장 중…", "Saving…") : u("자동 발송 활성화 저장", "Save welcome auto-send")}
              onPress={() => void handleSaveWelcome()}
              disabled={welcomeBusy}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{u("전체 팔로워 단체 발송", "Message all followers")}</Text>
            <Text style={styles.sectionSub}>
              {u(
                `현재 팔로워 ${followerCount.toLocaleString()}명 · 백그라운드에서 순차 발송됩니다.`,
                `${followerCount.toLocaleString()} followers · sends sequentially in the background.`
              )}
            </Text>

            {activeJob ? (
              <View style={styles.jobBanner}>
                <Text style={styles.jobText}>
                  {u("발송 진행 중…", "Sending…")} {activeJob.sentCount}/{activeJob.totalFollowers}
                  {activeJob.failedCount > 0
                    ? u(` (실패 ${activeJob.failedCount})`, ` (failed ${activeJob.failedCount})`)
                    : ""}
                </Text>
              </View>
            ) : null}

            <TextInput
              style={styles.textArea}
              value={bulkText}
              onChangeText={setBulkText}
              placeholder={u("공지 및 유료 콘텐츠 홍보 문구", "Announcement or paid content promo")}
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>{u("유료 미디어 (선택)", "Paid media (optional)")}</Text>
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
                  {bulkMedia.name ?? u("첨부됨", "Attached")} · {formatUsd(bulkEffectivePrice)}
                </Text>
                <Pressable onPress={() => setBulkMedia(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}

            <FolkButton
              label={u("사진·동영상 업로드", "Upload photo or video")}
              variant="secondary"
              onPress={() => void pickMedia("bulk")}
            />

            {bulkError ? <Text style={styles.error}>{bulkError}</Text> : null}

            <FolkButton
              label={
                bulkBusy ? u("발송 준비 중…", "Preparing send…") : u("전체 팔로워에게 발송하기", "Send to all followers")
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
