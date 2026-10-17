import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AttachBottomModal } from "@/features/compose/AttachBottomModal";
import { AttachImageCard, type ComposeAttachPreview } from "@/features/compose/AttachImageCard";
import { useI18n } from "@/i18n/I18nProvider";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { spacing, type ThemeColors } from "@/theme/tokens";

export type { ComposeAttachPreview };

const CARD_ASPECT = 0.78;
const CARD_GAP = 12;
/** Neighbors stay smaller so the centered photo reads as the selection. */
const INACTIVE_SCALE = 0.7;
const SCRIM = "rgba(0,0,0,0.66)";

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

function ScaledAttachCard({
  item,
  index,
  card,
  interval,
  scrollX,
  marginRight,
  previewLabel,
  removeLabel,
  onRemove,
}: {
  item: ComposeAttachPreview;
  index: number;
  card: { width: number; height: number };
  interval: number;
  scrollX: Animated.Value;
  marginRight: number;
  previewLabel: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  const inputRange = [(index - 1) * interval, index * interval, (index + 1) * interval];
  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [INACTIVE_SCALE, 1, INACTIVE_SCALE],
    extrapolate: "clamp",
  });
  const edgeShift = ((1 - INACTIVE_SCALE) / 2) * card.width;
  const translateX = scrollX.interpolate({
    inputRange,
    outputRange: [-edgeShift, 0, edgeShift],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={{
        width: card.width,
        height: card.height,
        marginRight,
        transform: [{ translateX }, { scale }],
      }}
    >
      <AttachImageCard
        item={item}
        width={card.width}
        height={card.height}
        previewLabel={previewLabel}
        removeLabel={removeLabel}
        onRemove={onRemove}
      />
    </Animated.View>
  );
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
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const pendingPageRef = useRef<number | null>(null);
  const [sheetHeight, setSheetHeight] = useState(280);
  const keyboardOpen = keyboardHeight > 0;
  const hasPreviews = previews.length > 0;
  const bottomInset = keyboardOpen ? spacing.sm : Math.max(insets.bottom, spacing.sm);
  const sheetBottom = keyboardOpen ? keyboardHeight : 0;
  const sheetBlock = sheetHeight + sheetBottom;
  const maxCardHeight = Math.max(160, windowHeight - insets.top - 36 - sheetBlock - 28);
  const card = portraitCardSize(Math.round(windowWidth * 0.66), maxCardHeight);
  const interval = card.width + CARD_GAP;
  const sidePad = Math.max(0, (windowWidth - card.width) / 2);

  function snapToPage(page: number, animated: boolean) {
    const next = Math.max(0, Math.min(page, Math.max(0, previews.length - 1)));
    pageRef.current = next;
    const x = next * interval;
    scrollX.setValue(x);
    const node = listRef.current as unknown as {
      scrollTo?: (opts: { x: number; y?: number; animated?: boolean }) => void;
    } | null;
    node?.scrollTo?.({ x, y: 0, animated });
  }

  useEffect(() => {
    if (!visible) return;
    pendingPageRef.current = null;
    pageRef.current = 0;
    scrollX.setValue(0);
  }, [scrollX, visible]);

  useLayoutEffect(() => {
    if (!visible || previews.length === 0) return;
    const pending = pendingPageRef.current;
    pendingPageRef.current = null;
    const next =
      pending == null
        ? Math.min(pageRef.current, previews.length - 1)
        : Math.max(0, Math.min(pending, previews.length - 1));
    requestAnimationFrame(() => snapToPage(next, false));
  }, [interval, previews.length, visible]);

  function rememberPage(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (interval <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / interval);
    pageRef.current = Math.max(0, Math.min(previews.length - 1, next));
  }

  function removeAt(index: number) {
    const focused = pageRef.current;
    let nextPage = focused;
    if (index === focused) nextPage = Math.max(0, focused - 1);
    else if (index < focused) nextPage = Math.max(0, focused - 1);
    pendingPageRef.current = nextPage;
    onRemovePreview(index);
  }
  const sheetMaxHeight = keyboardOpen
    ? Math.max(220, windowHeight - keyboardHeight - insets.top - 48)
    : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.fill, { width: windowWidth, height: windowHeight }]}>
        <View style={styles.scrim} />
        {hasPreviews ? (
          <View
            style={[
              styles.gallery,
              {
                top: insets.top + 8,
                bottom: sheetBlock + 16,
              },
            ]}
          >
            <Animated.ScrollView
              ref={listRef}
              horizontal
              scrollEnabled={previews.length > 1}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToOffsets={previews.map((_, index) => index * interval)}
              disableIntervalMomentum
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              onMomentumScrollEnd={rememberPage}
              onScrollEndDrag={rememberPage}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              style={{ height: card.height, width: "100%" }}
              contentContainerStyle={{
                paddingLeft: sidePad,
                paddingRight: sidePad,
                alignItems: "center",
              }}
            >
              {previews.map((item, index) => (
                <ScaledAttachCard
                  key={`${item.uri}-${index}`}
                  item={item}
                  index={index}
                  card={card}
                  interval={interval}
                  scrollX={scrollX}
                  marginRight={index < previews.length - 1 ? CARD_GAP : 0}
                  previewLabel={t("m.common.preview")}
                  removeLabel={t("m.compose.remove_attachment")}
                  onRemove={() => removeAt(index)}
                />
              ))}
            </Animated.ScrollView>
          </View>
        ) : null}
        <View style={[styles.sheetDock, { bottom: sheetBottom }]}>
          <AttachBottomModal
            visible={visible}
            colors={colors}
            busy={busy}
            hasMedia={hasPreviews}
            pickedLabel={pickedLabel}
            maxHeight={sheetMaxHeight}
            bottomInset={bottomInset}
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
  fill: {
    flex: 1,
    backgroundColor: SCRIM,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SCRIM,
  },
  gallery: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
  },
  sheetDock: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
