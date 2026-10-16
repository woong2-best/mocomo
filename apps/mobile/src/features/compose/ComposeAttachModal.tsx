import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AttachBottomModal } from "@/features/compose/AttachBottomModal";
import { AttachImageCard, type ComposeAttachPreview } from "@/features/compose/AttachImageCard";
import { useI18n } from "@/i18n/I18nProvider";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { spacing, type ThemeColors } from "@/theme/tokens";

export type { ComposeAttachPreview };

/** Same portrait frame for one photo and for every photo in a strip. */
const CARD_ASPECT = 0.8;
const CARD_GAP = 8;
const HEADER_CLEARANCE = 52;
const LEFT_INSET_RATIO = 0.14;
const PEEK_RATIO = 0.18;

function portraitCardSize(maxWidth: number, maxHeight: number) {
  const cappedHeight = Math.max(1, maxHeight);
  const cappedWidth = Math.max(1, Math.round(maxWidth));
  let height = Math.min(cappedHeight, Math.round(cappedWidth / CARD_ASPECT));
  let width = Math.round(height * CARD_ASPECT);
  if (width > cappedWidth) {
    width = cappedWidth;
    height = Math.min(cappedHeight, Math.round(width / CARD_ASPECT));
  }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

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
  const [sheetHeight, setSheetHeight] = useState(270);
  const keyboardOpen = keyboardHeight > 0;
  const hasPreviews = previews.length > 0;
  const bottomPad = keyboardOpen ? keyboardHeight + spacing.sm : Math.max(insets.bottom, spacing.md);
  const topClearance = keyboardOpen ? insets.top + spacing.sm : insets.top + HEADER_CLEARANCE;
  const gapAboveSheet = hasPreviews ? 40 : 0;
  const maxCardHeight = windowHeight - topClearance - sheetHeight - gapAboveSheet - bottomPad;
  const leftInset = Math.round(windowWidth * LEFT_INSET_RATIO);
  const peek = Math.round(windowWidth * PEEK_RATIO);
  const card = portraitCardSize(windowWidth - leftInset - peek, maxCardHeight);
  const sheetMaxHeight = keyboardOpen
    ? Math.max(220, windowHeight - keyboardHeight - insets.top - 80)
    : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.root,
          {
            paddingBottom: bottomPad,
            backgroundColor: hasPreviews ? "transparent" : "rgba(0,0,0,0.45)",
          },
        ]}
      >
        {hasPreviews ? (
          <View style={[styles.gallery, { paddingTop: topClearance }]}>
            <ScrollView
              horizontal
              scrollEnabled={previews.length > 1}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToOffsets={previews.map((_, index) => index * (card.width + CARD_GAP))}
              disableIntervalMomentum
              keyboardShouldPersistTaps="handled"
              style={{ height: card.height, width: "100%" }}
              contentContainerStyle={{
                paddingLeft: leftInset,
                paddingRight: Math.max(spacing.md, windowWidth - leftInset - card.width),
              }}
            >
              {previews.map((item, index) => (
                <View
                  key={`${item.uri}-${index}`}
                  style={index < previews.length - 1 ? { marginRight: CARD_GAP } : null}
                >
                  <AttachImageCard
                    item={item}
                    width={card.width}
                    height={card.height}
                    previewLabel={t("m.common.preview")}
                    removeLabel={t("m.compose.remove_attachment")}
                    onRemove={() => onRemovePreview(index)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <Pressable style={styles.backdropFill} onPress={onClose} />
        )}
        <View style={{ marginTop: hasPreviews ? gapAboveSheet : spacing.sm }}>
          <AttachBottomModal
            visible={visible}
            colors={colors}
            busy={busy}
            hasMedia={hasPreviews}
            pickedLabel={pickedLabel}
            maxHeight={sheetMaxHeight}
            onClose={onClose}
            onPick={onPick}
            onConfirm={onConfirm}
            onLayoutHeight={(height) => {
              setSheetHeight((prev) => (Math.abs(prev - height) < 2 ? prev : height));
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropFill: {
    flex: 1,
  },
  gallery: {
    flex: 1,
    justifyContent: "flex-start",
  },
});
