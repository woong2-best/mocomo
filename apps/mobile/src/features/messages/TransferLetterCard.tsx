import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatAtmLetterDate } from "@/lib/chat-atm-letter";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  amount: number;
  message: string;
  senderName: string;
  createdAt: string;
};

function EnvelopeGraphic({ width }: { width: number }) {
  const height = width * (165 / 240);
  const heart = Math.round(width * 0.14);
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 240 165">
        <Path d="M3 6 H237 V160 H3 Z" fill="#f3f3f3" />
        <Polygon points="3,160 120,28 237,160" fill="rgba(0,0,0,0.045)" />
        <Polygon points="3,6 120,118 237,6" fill="#fbfbfb" />
      </Svg>
      <View style={{ position: "absolute", top: height * 0.46, left: (width - heart) / 2 }}>
        <Svg width={heart} height={heart} viewBox="0 0 24 24">
          <Path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="#e85a71"
          />
        </Svg>
      </View>
    </View>
  );
}

function LetterPaper({
  amount,
  message,
  senderName,
  createdAt,
  maxHeight,
}: Props & { maxHeight: number }) {
  const dateLabel = formatAtmLetterDate(createdAt);
  return (
    <View style={[styles.letter, { maxHeight }]}>
      <View style={[styles.corner, styles.cornerTl]} />
      <View style={[styles.corner, styles.cornerTr]} />
      <View style={[styles.corner, styles.cornerBl]} />
      <View style={[styles.corner, styles.cornerBr]} />
      <View style={styles.marginLine} />
      <ScrollView
        style={{ maxHeight: maxHeight - 8 }}
        contentContainerStyle={styles.letterInner}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>
          {dateLabel}
          {"\n"}
          {amount.toLocaleString()} MOCO
        </Text>
        <Text style={styles.body}>{message || " "}</Text>
        <Text style={styles.footer}>— {senderName}</Text>
      </ScrollView>
    </View>
  );
}

function LetterStage({
  onClose,
  ...props
}: Props & { onClose: () => void }) {
  const { u } = useI18n();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const envelopeW = Math.min(240, width * 0.62);
  const letterW = Math.min(420, width * 0.92);
  const letterMaxH = Math.min(680, height * 0.74);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 1100,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  function close() {
    Animated.timing(slide, {
      toValue: 0,
      duration: 420,
      easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }

  const letterY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });
  const envOpacity = slide.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel={u("편지 닫기", "Close letter")}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.envFloat, { opacity: envOpacity, top: insets.top + height * 0.22 }]}
        >
          <EnvelopeGraphic width={envelopeW} />
        </Animated.View>
        <Animated.View
          style={{
            zIndex: 2,
            width: letterW,
            transform: [{ translateY: letterY }],
            marginBottom: Math.max(insets.bottom, 16),
          }}
        >
          <LetterPaper {...props} maxHeight={letterMaxH} />
        </Animated.View>
      </View>
    </Modal>
  );
}

export function TransferLetterCard(props: Props) {
  const { u } = useI18n();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const inlineW = Math.min(210, Math.max(160, width * 0.58));

  return (
    <View style={styles.inlineWrap}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={u("편지 열기", "Open letter")}
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
      >
        <EnvelopeGraphic width={inlineW} />
      </Pressable>
      <Text style={styles.hint}>{u("봉투를 눌러 편지를 여세요", "Tap the envelope to open the letter")}</Text>
      {open ? <LetterStage {...props} onClose={() => setOpen(false)} /> : null}
    </View>
  );
}

const serif = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

const styles = StyleSheet.create({
  inlineWrap: { alignItems: "center", paddingVertical: 4 },
  hint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#8a8178",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 16, 12, 0.28)",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  envFloat: {
    position: "absolute",
    top: "28%",
  },
  letter: {
    backgroundColor: "#fdf8f0",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(139, 90, 43, 0.15)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  letterInner: {
    paddingTop: 36,
    paddingBottom: 40,
    paddingLeft: 36,
    paddingRight: 22,
    minHeight: 280,
  },
  marginLine: {
    position: "absolute",
    left: 28,
    top: 24,
    bottom: 24,
    width: 1.5,
    backgroundColor: "rgba(200, 80, 80, 0.35)",
  },
  corner: {
    position: "absolute",
    width: 22,
    height: 22,
    borderColor: "rgba(139, 90, 43, 0.35)",
    zIndex: 2,
  },
  cornerTl: { top: 10, left: 10, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTr: { top: 10, right: 10, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBl: { bottom: 10, left: 10, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBr: { bottom: 10, right: 10, borderBottomWidth: 2, borderRightWidth: 2 },
  header: {
    textAlign: "right",
    color: "#5c4a3a",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: serif,
    marginBottom: 22,
  },
  body: {
    color: "#3d2f24",
    fontSize: 16,
    lineHeight: 28,
    fontFamily: serif,
    minHeight: 72,
  },
  footer: {
    marginTop: 28,
    textAlign: "right",
    color: "#5c4a3a",
    fontSize: 17,
    fontStyle: "italic",
    fontFamily: serif,
  },
});
