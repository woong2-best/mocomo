import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiRequest } from "@/api/client";
import { spacing } from "@/theme/tokens";

type TipPayload = {
  id: string;
  amount: number;
  message: string;
  senderName: string;
};

export function LetterDonationCard({
  tipId,
  interactive = true,
}: {
  tipId: string;
  interactive?: boolean;
}) {
  const [tip, setTip] = useState<TipPayload | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const slide = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let cancelled = false;
    void apiRequest<{ tip: TipPayload }>(`/api/tips/${tipId}`, { auth: true })
      .then((data) => {
        if (!cancelled) setTip(data.tip);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "편지를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [tipId]);

  useEffect(() => {
    Animated.spring(slide, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();
  }, [open, slide]);

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }
  if (!tip) {
    return <ActivityIndicator color="#C5522A" style={{ marginVertical: spacing.sm }} />;
  }

  const letterY = slide.interpolate({ inputRange: [0, 1], outputRange: [24, -36] });
  const letterOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={!interactive || open}
        onPress={() => setOpen(true)}
        style={styles.envelopeHit}
      >
        <Image source={require("../../../assets/wax-envelope.png")} style={styles.envelope} resizeMode="cover" />
        <Animated.View style={[styles.letter, { opacity: letterOpacity, transform: [{ translateY: letterY }] }]}>
          {tip.senderName ? <Text style={styles.from}>From {tip.senderName}</Text> : null}
          <Text style={styles.body}>{tip.message}</Text>
          <Text style={styles.amount}>{tip.amount.toLocaleString("ko-KR")}원</Text>
        </Animated.View>
      </Pressable>
      {!open && interactive ? <Text style={styles.hint}>봉투를 눌러 편지를 열어보세요</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing.sm, maxWidth: 280 },
  envelopeHit: { width: 240, height: 180, position: "relative" },
  envelope: { width: "100%", height: "100%", borderRadius: 12 },
  letter: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 28,
    bottom: 12,
    backgroundColor: "#faf6ee",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d4c4a8",
    padding: 12,
  },
  from: { fontSize: 11, fontWeight: "700", color: "#8b6914", marginBottom: 4 },
  body: { fontSize: 13, color: "#2a2418", lineHeight: 18 },
  amount: {
    marginTop: 8,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "900",
    color: "#1B4A8C",
  },
  hint: { marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  error: { color: "#B33A1F", fontSize: 13, paddingVertical: spacing.sm },
});
