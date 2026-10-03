import { useEffect, useRef, type ReactNode } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export function MessageBubbleHighlight({
  highlighted,
  style,
  children,
}: {
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlighted) return;
    translateX.setValue(0);
    overlay.setValue(0.16);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(translateX, { toValue: -5, duration: 45, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 5, duration: 45, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -4, duration: 45, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 4, duration: 45, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 45, useNativeDriver: true }),
      ]),
      Animated.timing(overlay, { toValue: 0, duration: 1400, useNativeDriver: true }),
    ]).start();
  }, [highlighted, overlay, translateX]);

  return (
    <Animated.View style={[style, styles.wrap, { transform: [{ translateX }] }]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlay }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "visible",
  },
  overlay: {
    backgroundColor: "#000",
    borderRadius: 18,
  },
});
