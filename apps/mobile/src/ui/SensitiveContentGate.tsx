import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

type Props = {
  enabled: boolean;
  children: ReactNode;
  style?: object;
};

export function SensitiveContentGate({ enabled, children, style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [revealed, setRevealed] = useState(false);

  if (!enabled || revealed) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.root, style]}>
      <View style={styles.blurred} pointerEvents="none">
        {children}
      </View>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="eye-off-outline" size={28} color="rgba(255,255,255,0.85)" />
          <Text style={styles.title}>콘텐츠 경고: 민감한 콘텐츠</Text>
          <Text style={styles.description}>
            작성자가 이 게시물에 민감한 콘텐츠가 포함되어 있다고 표시했습니다.
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={styles.viewBtn}
              onPress={() => setRevealed(true)}
              accessibilityRole="button"
              accessibilityLabel="민감한 콘텐츠 보기"
            >
              <Text style={styles.viewBtnText}>보기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      overflow: "hidden",
      position: "relative",
    },
    blurred: {
      opacity: 0.35,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: 16,
    },
    card: {
      width: "100%",
      maxWidth: 300,
      borderRadius: radii.lg,
      backgroundColor: "rgba(23,23,23,0.94)",
      paddingHorizontal: 20,
      paddingVertical: 16,
      alignItems: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.12)",
    },
    title: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: "800",
      color: "#fff",
      textAlign: "center",
    },
    description: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 18,
      color: "rgba(255,255,255,0.75)",
      textAlign: "center",
    },
    actions: {
      marginTop: 14,
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    viewBtn: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceRaised,
    },
    viewBtnText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.text,
    },
  });
}
