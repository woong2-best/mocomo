import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from "react-native";
import * as Haptics from "expo-haptics";
import type { ThemeColors } from "@/theme/tokens";
import { spacing } from "@/theme/tokens";
import { WalletCardFace } from "@/features/wallet/WalletCardFace";
import {
  CARD_BORDER_RADIUS,
  CARD_GAP,
  CARD_HORIZONTAL_INSET,
  CARD_PEEK,
  cardHeightFromWidth,
  collapsedHeight,
  expandedHeight,
  type WalletCardModel,
} from "@/features/wallet/wallet-card-layout";

const SWIPE_THRESHOLD = 72;
const EXPAND_TRAVEL = 200;

type Props = {
  cards: WalletCardModel[];
  colors: ThemeColors;
  onFrontCardPress?: (cardId: string) => void;
  hint?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type StackCardProps = {
  card: WalletCardModel;
  depth: number;
  cardCount: number;
  cardH: number;
  cardW: number;
  expanded: boolean;
  panX: Animated.Value;
  expandAnim: Animated.Value;
  dragY: Animated.Value;
};

const StackCard = memo(function StackCard({
  card,
  depth,
  cardCount,
  cardH,
  cardW,
  expanded,
  panX,
  expandAnim,
  dragY,
}: StackCardProps) {
  const isFront = depth === 0;

  const translateY = Animated.add(
    expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [depth * CARD_PEEK, depth * (cardH + CARD_GAP)],
    }),
    isFront
      ? dragY.interpolate({
          inputRange: [-EXPAND_TRAVEL, 0, EXPAND_TRAVEL],
          outputRange: [-EXPAND_TRAVEL * 0.35, 0, EXPAND_TRAVEL * 0.2],
          extrapolate: "clamp",
        })
      : 0
  );

  const scale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1 - depth * 0.045, 1 - depth * 0.012],
  });

  const opacity =
    depth === 0 ? 1 : depth === 1 ? 0.96 : depth === 2 ? 0.9 : 0.84;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: card.backgroundColor,
          height: cardH,
          width: cardW,
          left: CARD_HORIZONTAL_INSET,
          opacity,
          zIndex: cardCount - depth,
          transform: [
            { translateY },
            { translateX: isFront ? panX : 0 },
            { scale },
          ],
        },
      ]}
    >
      <WalletCardFace card={card} expanded={expanded && isFront} />
    </Animated.View>
  );
});

export const WalletCardStack = memo(function WalletCardStack(props: Props) {
  const { cards, colors, onFrontCardPress, hint } = props;
  const { width: screenWidth } = useWindowDimensions();
  const cardH = cardHeightFromWidth(screenWidth);
  const cardW = screenWidth - CARD_HORIZONTAL_INSET * 2;
  const cardCount = Math.max(1, cards.length);

  const collapsedH = collapsedHeight(cardH, cardCount);
  const expandedH = expandedHeight(cardH, cardCount);

  const [activeIdx, setActiveIdx] = useState(0);
  const [expandedUi, setExpandedUi] = useState(false);

  const panX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const stackHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedH, expandedH],
  });

  const frontCardId = cards[activeIdx]?.id;

  const toggleExpanded = useCallback(() => {
    if (frontCardId && onFrontCardPress) {
      onFrontCardPress(frontCardId);
      return;
    }
    const next = !expandedUi;
    setExpandedUi(next);
    Animated.spring(expandAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      friction: 9,
      tension: 70,
    }).start();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [activeIdx, cards, expandAnim, expandedUi, frontCardId, onFrontCardPress]);

  const cycleCard = useCallback(
    (direction: 1 | -1) => {
      setActiveIdx((prev) => (prev + direction + cardCount) % cardCount);
      setExpandedUi(false);
      expandAnim.setValue(0);
      panX.setValue(0);
      dragY.setValue(0);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [cardCount, dragY, expandAnim, panX]
  );

  const settleGesture = useCallback(
    (_: GestureResponderEvent, g: PanResponderGestureState) => {
      const absX = Math.abs(g.dx);
      const absY = Math.abs(g.dy);

      if (absX > absY + 8 && absX > SWIPE_THRESHOLD) {
        const direction = g.dx < 0 ? 1 : -1;
        const out = screenWidth * 0.55 * direction;
        Animated.timing(panX, {
          toValue: out,
          duration: 180,
          useNativeDriver: false,
        }).start(() => {
          cycleCard(direction as 1 | -1);
        });
        return;
      }

      if (absY > absX + 8) {
        const shouldExpand =
          g.dy < -48 || (g.dy < 0 && Math.abs(g.dy) > SWIPE_THRESHOLD * 0.45);
        const shouldCollapse = g.dy > 48;

        if (shouldExpand && !expandedUi) {
          setExpandedUi(true);
          Animated.spring(expandAnim, {
            toValue: 1,
            useNativeDriver: false,
            friction: 9,
            tension: 70,
          }).start();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (shouldCollapse && expandedUi) {
          setExpandedUi(false);
          Animated.spring(expandAnim, {
            toValue: 0,
            useNativeDriver: false,
            friction: 9,
            tension: 70,
          }).start();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      Animated.parallel([
        Animated.spring(panX, { toValue: 0, useNativeDriver: false, friction: 9, tension: 70 }),
        Animated.spring(dragY, { toValue: 0, useNativeDriver: false, friction: 9, tension: 70 }),
      ]).start();
    },
    [cycleCard, expandAnim, expandedUi, panX, dragY, screenWidth]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > Math.abs(g.dy)) {
            panX.setValue(g.dx);
            dragY.setValue(0);
          } else {
            dragY.setValue(clamp(g.dy, -EXPAND_TRAVEL, EXPAND_TRAVEL * 0.35));
            panX.setValue(0);
          }
        },
        onPanResponderRelease: settleGesture,
        onPanResponderTerminate: settleGesture,
      }),
    [dragY, panX, settleGesture]
  );

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.stack, { height: stackHeight }]}
        {...panResponder.panHandlers}
      >
        {cards.map((card, index) => {
          const depth = (index - activeIdx + cardCount) % cardCount;
          return (
            <StackCard
              key={card.id}
              card={card}
              depth={depth}
              cardCount={cardCount}
              cardH={cardH}
              cardW={cardW}
              expanded={expandedUi}
              panX={panX}
              expandAnim={expandAnim}
              dragY={dragY}
            />
          );
        })}
        <Pressable
          style={[styles.frontTap, { height: cardH, width: cardW, left: CARD_HORIZONTAL_INSET }]}
          onPress={toggleExpanded}
          accessibilityRole="button"
          accessibilityLabel="카드 펼치기"
        />
      </Animated.View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {hint ?? "위로 드래그 · 탭으로 펼치기 · 좌우로 카드 전환"}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  stack: {
    position: "relative",
    width: "100%",
  },
  card: {
    position: "absolute",
    top: 0,
    borderRadius: CARD_BORDER_RADIUS,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: "hidden",
  },
  frontTap: {
    position: "absolute",
    top: 0,
    zIndex: 99,
  },
  hint: {
    marginTop: spacing.sm,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
  },
});
