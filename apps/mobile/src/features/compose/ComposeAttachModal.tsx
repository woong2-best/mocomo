import { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n/I18nProvider";
import { parseSpendableMoco, sanitizeMocoDecimalInput } from "@/lib/moco-amount";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import {
  SALE_MEDIA_MAX_PRICE_USD_CENTS,
  SALE_MEDIA_MIN_PRICE_USD_CENTS,
  saleCentsFromMoco,
} from "@/lib/money";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export type ComposeAttachPreview = {
  uri: string;
  type: "IMAGE" | "VIDEO";
};

export function ComposeAttachModal({
  visible,
  colors,
  busy,
  onClose,
  onPick,
  onConfirm,
  pickedLabel,
  previews,
}: {
  visible: boolean;
  colors: ThemeColors;
  busy?: boolean;
  pickedLabel: string | null;
  previews: ComposeAttachPreview[];
  onClose: () => void;
  onPick: () => void;
  onConfirm: (priceKrw: number) => void;
}) {
  const { t } = useI18n();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardBottomInset();
  const [moco, setMoco] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [previewWidth, setPreviewWidth] = useState(0);
  const keyboardOpen = keyboardHeight > 0;
  // Modal overlays the IME; use screen height so a resized activity window
  // cannot collapse the remaining space and clip the amount field.
  const remainingAboveKeyboard = Math.min(
    windowHeight,
    Dimensions.get("screen").height - keyboardHeight
  );
  const sheetMaxHeight = Math.max(220, remainingAboveKeyboard - spacing.xl * 2);
  const previewHeight = Math.round(
    Math.min(
      keyboardOpen ? 118 : 152,
      Math.max(96, windowWidth * (keyboardOpen ? 0.26 : 0.34))
    )
  );

  useEffect(() => {
    setPage(0);
  }, [previews.length, visible]);

  function close() {
    setMoco("");
    setError("");
    setPage(0);
    onClose();
  }

  function confirm() {
    const amount = parseSpendableMoco(moco);
    if (amount == null) {
      setError(t("m.compose.attach_need_moco"));
      return;
    }
    const cents = saleCentsFromMoco(amount);
    if (cents < SALE_MEDIA_MIN_PRICE_USD_CENTS) {
      setError(t("m.compose.attach_need_moco"));
      return;
    }
    if (cents > SALE_MEDIA_MAX_PRICE_USD_CENTS) {
      setError(t("m.compose.attach_too_high"));
      return;
    }
    if (!pickedLabel) {
      setError(t("m.compose.attach_need_file"));
      return;
    }
    onConfirm(cents);
    setMoco("");
    setError("");
    setPage(0);
  }

  function onPreviewScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (previewWidth <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / previewWidth);
    setPage(Math.max(0, Math.min(previews.length - 1, next)));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View
        style={[
          styles.backdrop,
          keyboardOpen
            ? { justifyContent: "flex-end", paddingBottom: keyboardHeight + spacing.sm }
            : null,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
              maxHeight: sheetMaxHeight,
            },
          ]}
          onPress={() => undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetBody}
          >
            <Text style={[styles.title, { color: colors.text }]}>{t("m.compose.attach_title")}</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>{t("m.compose.attach_hint")}</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t("m.compose.attach_moco")}</Text>
            <TextInput
              value={moco}
              onChangeText={(value) => {
                setMoco(sanitizeMocoDecimalInput(value));
                setError("");
              }}
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              editable={!busy}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.background },
              ]}
            />
            <Pressable
              style={[styles.uploadBtn, { borderColor: colors.brand }]}
              disabled={busy}
              onPress={onPick}
            >
              <Text style={[styles.uploadText, { color: colors.brand }]}>
                {pickedLabel ?? t("m.compose.attach_upload")}
              </Text>
            </Pressable>
            {previews.length > 0 ? (
              <View style={styles.previewBlock}>
                <View
                  onLayout={(event) => setPreviewWidth(event.nativeEvent.layout.width)}
                  style={[
                    styles.previewFrame,
                    { height: previewHeight, backgroundColor: colors.background, borderColor: colors.hairline },
                  ]}
                >
                  {previewWidth > 0 ? (
                    <ScrollView
                      horizontal
                      pagingEnabled
                      nestedScrollEnabled
                      decelerationRate="fast"
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={onPreviewScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {previews.map((item, index) => (
                        <View
                          key={`${item.uri}-${index}`}
                          style={[styles.previewPage, { width: previewWidth, height: previewHeight }]}
                          accessibilityLabel={t("m.common.preview")}
                        >
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.previewMedia}
                            contentFit="contain"
                          />
                          {item.type === "VIDEO" ? (
                            <View style={styles.videoBadge} pointerEvents="none">
                              <Ionicons name="play" size={14} color="#fff" />
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
                {previews.length > 1 ? (
                  <View style={styles.dots}>
                    {previews.map((item, index) => (
                      <View
                        key={`${item.uri}-dot-${index}`}
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              index === page ? colors.brand : colors.hairline,
                          },
                        ]}
                      />
                    ))}
                    <Text style={[styles.pageLabel, { color: colors.textMuted }]}>
                      {page + 1}/{previews.length}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable onPress={close} hitSlop={8} disabled={busy}>
                <Text style={[styles.cancel, { color: colors.textMuted }]}>{t("m.common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirm, { backgroundColor: colors.terracotta }, busy && styles.disabled]}
                disabled={busy}
                onPress={confirm}
              >
                <Text style={styles.confirmText}>{t("m.compose.attach_confirm")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  sheet: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 18,
  },
  sheetBody: {
    gap: 8,
    flexGrow: 1,
  },
  title: { fontSize: 18, fontWeight: "800" },
  hint: { fontSize: 12, lineHeight: 17 },
  label: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
  },
  previewBlock: { gap: 8, marginTop: 4 },
  previewFrame: {
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  previewPage: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewMedia: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pageLabel: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  uploadBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  uploadText: { fontSize: 14, fontWeight: "800" },
  error: { color: "#c80000", fontSize: 12, fontWeight: "600" },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
  },
  cancel: { fontSize: 14, fontWeight: "700" },
  confirm: {
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  disabled: { opacity: 0.45 },
});
