import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadLocalFile } from "@/api/upload-file";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { FolkButton } from "@/ui/FolkButton";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import {
  SALE_MEDIA_MIN_PRICE_KRW,
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  formatUsd,
} from "@/lib/money";

const PRESETS = [500, 1_000, 3_000, 5_000, 10_000];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSend: (payload: {
    url: string;
    type: "IMAGE" | "VIDEO";
    name?: string;
    priceKrw: number;
  }) => Promise<void>;
};

export function FanArtSellSheet({ visible, onClose, onSend }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [price, setPrice] = useState(1_000);
  const [customPrice, setCustomPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const effectivePrice = customPrice
    ? parseInt(customPrice.replace(/\D/g, ""), 10) || 0
    : price;

  async function pickAndSend() {
    if (effectivePrice < SALE_MEDIA_MIN_PRICE_KRW) {
      setError(`최소 ${formatUsd(SALE_MEDIA_MIN_PRICE_KRW)}부터 설정할 수 있습니다.`);
      return;
    }
    if (effectivePrice > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
      setError(`가격은 ${formatUsd(SALE_MEDIA_MAX_PRICE_USD_CENTS)} 이하로 설정해 주세요.`);
      return;
    }

    setError("");
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
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

      const url = await uploadLocalFile({
        uri: asset.uri,
        filename: asset.fileName || `fanart-${Date.now()}.${ext}`,
        contentType,
        category: isVideo ? "video" : "image",
      });

      await onSend({
        url,
        type: isVideo ? "VIDEO" : "IMAGE",
        name: asset.fileName ?? undefined,
        priceKrw: effectivePrice,
      });
      onClose();
    } catch (e) {
      Alert.alert("전송 실패", e instanceof Error ? e.message : "팬아트를 보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardSheet
      visible={visible}
      onClose={onClose}
      maxHeight="78%"
      sheetStyle={{ backgroundColor: colors.surface }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>당신의 팬 아트를 팔아보세요!</Text>
        <Text style={styles.sub}>
          사진이나 영상을 보내면 상대방은 결제 후에만 볼 수 있습니다.
        </Text>
      </View>

      <Text style={styles.label}>판매 가격</Text>
      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <Pressable
            key={p}
            onPress={() => {
              setPrice(p);
              setCustomPrice("");
            }}
            style={[styles.preset, !customPrice && price === p && styles.presetActive]}
          >
            <Text
              style={[
                styles.presetText,
                !customPrice && price === p && styles.presetTextActive,
              ]}
            >
              {formatUsd(p)}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.customInput}
        value={customPrice}
        onChangeText={setCustomPrice}
        placeholder="직접 입력"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FolkButton
        label={busy ? "업로드 중…" : "갤러리에서 선택 · 전송"}
        onPress={() => void pickAndSend()}
        disabled={busy}
      />
      {busy ? <ActivityIndicator color={colors.terracotta} style={{ marginTop: spacing.sm }} /> : null}
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { gap: 6, marginBottom: spacing.md },
    title: { fontSize: 18, fontWeight: "800", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, lineHeight: 18, fontWeight: "600" },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
      marginBottom: 8,
    },
    presets: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 10,
    },
    preset: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    presetActive: {
      backgroundColor: colors.cobalt,
      borderColor: colors.cobalt,
    },
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
      marginBottom: spacing.md,
    },
    error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  });
}
