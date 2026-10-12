import { useEffect, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  onRemovePreview,
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
  onRemovePreview: (index: number) => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardBottomInset();
  const previewScrollRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const [moco, setMoco] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [heroSize, setHeroSize] = useState({ width: 0, height: 0 });
  const keyboardOpen = keyboardHeight > 0;
  pageRef.current = page;
  const remainingAboveKeyboard = Math.min(
    windowHeight,
    Dimensions.get("screen").height - keyboardHeight
  );
  const sheetReserve = previews.length > 0 ? 132 : 24;
  const sheetMaxHeight = Math.max(220, remainingAboveKeyboard - sheetReserve);
  const pageWidth = heroSize.width > 0 ? heroSize.width : windowWidth;

  useEffect(() => {
    if (!visible) {
      setMoco("");
      setError("");
      setPage(0);
      return;
    }
    const next = Math.max(0, Math.min(pageRef.current, Math.max(0, previews.length - 1)));
    setPage(next);
    if (pageWidth <= 0) return;
    requestAnimationFrame(() => {
      previewScrollRef.current?.scrollTo({ x: next * pageWidth, animated: false });
    });
  }, [pageWidth, previews.length, visible]);

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
    if (previews.length === 0) {
      setError(t("m.compose.attach_need_file"));
      return;
    }
    onConfirm(cents);
    setMoco("");
    setError("");
    setPage(0);
  }

  function onPreviewScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setPage(Math.max(0, Math.min(previews.length - 1, next)));
  }

  function removeCurrent() {
    if (previews.length === 0) return;
    onRemovePreview(page);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View
        style={[
          styles.root,
          {
            paddingBottom: keyboardOpen
              ? keyboardHeight + spacing.sm
              : Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        {previews.length > 0 ? (
          <View
            style={styles.hero}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setHeroSize({ width, height });
            }}
          >
            {heroSize.height > 0 && heroSize.width > 0 ? (
              <ScrollView
                ref={previewScrollRef}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onPreviewScroll}
                keyboardShouldPersistTaps="handled"
              >
                {previews.map((item, index) => (
                  <View
                    key={`${item.uri}-${index}`}
                    style={{ width: pageWidth, height: heroSize.height }}
                    accessibilityLabel={t("m.common.preview")}
                  >
                    <Image source={{ uri: item.uri }} style={styles.heroMedia} contentFit="cover" />
                    {item.type === "VIDEO" ? (
                      <View style={styles.videoBadge} pointerEvents="none">
                        <Ionicons name="play" size={16} color="#fff" />
                      </View>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <Pressable
              style={[styles.removeBtn, { top: insets.top + 10 }]}
              onPress={removeCurrent}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("m.compose.remove_attachment")}
            >
              <Ionicons name="remove" size={22} color="#142848" />
            </Pressable>
            {previews.length > 1 ? (
              <View style={styles.pagePillWrap} pointerEvents="none">
                <View style={styles.pagePill}>
                  <Text style={styles.pagePillText}>
                    {page + 1}/{previews.length}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable style={styles.backdropFill} onPress={close} />
        )}
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
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  backdropFill: {
    flex: 1,
  },
  hero: {
    flex: 1,
    marginHorizontal: -16,
    backgroundColor: "#000",
  },
  heroMedia: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    right: 16,
    zIndex: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 240, 232, 0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  pagePillWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: "center",
  },
  pagePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  pagePillText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  videoBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 18,
    marginTop: 12,
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
