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
import { MobileApi } from "@/api/paths";
import { spacing } from "@/theme/tokens";

type TipPayload = {
  id: string;
  amount: number;
  moco: number;
  message: string;
  senderName: string;
  claimable?: boolean;
  claimed?: boolean;
};

function formatMoco(moco: number) {
  return `${Math.max(0, Math.floor(moco)).toLocaleString()} MOCO`;
}

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
  const [opening, setOpening] = useState(false);
  const [creditNote, setCreditNote] = useState("");
  const slide = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let cancelled = false;
    void apiRequest<{ tip: TipPayload }>(MobileApi.tip(tipId), { auth: true })
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

  async function handleOpen() {
    if (open || opening) return;
    if (!interactive) {
      setOpen(true);
      return;
    }
    setOpening(true);
    setError("");
    try {
      const res = await apiRequest<{
        tip: TipPayload;
        credited?: boolean;
        alreadyCredited?: boolean;
        mocoCredited?: number;
      }>(MobileApi.tipOpen(tipId), { method: "POST", auth: true });
      setTip(res.tip);
      setOpen(true);
      if (res.credited && res.mocoCredited) {
        setCreditNote(`${formatMoco(res.mocoCredited)}를 받았습니다`);
      } else if (res.alreadyCredited && res.mocoCredited) {
        setCreditNote(`${formatMoco(res.mocoCredited)} 수령 완료`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "편지를 열지 못했습니다.");
    } finally {
      setOpening(false);
    }
  }

  if (error && !tip) {
    return <Text style={styles.error}>{error}</Text>;
  }
  if (!tip) {
    return <ActivityIndicator color="#C5522A" style={{ marginVertical: spacing.sm }} />;
  }

  const letterY = slide.interpolate({ inputRange: [0, 1], outputRange: [24, -36] });
  const letterOpacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const moco = tip.moco > 0 ? tip.moco : Math.max(0, Math.floor(tip.amount / 500));

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={open || opening}
        onPress={() => void handleOpen()}
        style={styles.envelopeHit}
      >
        <Image source={require("../../../assets/wax-envelope.png")} style={styles.envelope} resizeMode="cover" />
        <Animated.View style={[styles.letter, { opacity: letterOpacity, transform: [{ translateY: letterY }] }]}>
          {tip.senderName ? <Text style={styles.from}>From {tip.senderName}</Text> : null}
          <Text style={styles.body}>{tip.message}</Text>
          <Text style={styles.amount}>{formatMoco(moco)}</Text>
        </Animated.View>
      </Pressable>
      {!open && interactive ? (
        <Text style={styles.hint}>
          {opening ? "여는 중…" : "봉투를 눌러 편지를 열고 MOCO를 받으세요"}
        </Text>
      ) : null}
      {creditNote ? <Text style={styles.credit}>{creditNote}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  credit: { marginTop: 4, fontSize: 12, color: "#7CF5C0", fontWeight: "800" },
  error: { color: "#B33A1F", fontSize: 13, paddingVertical: spacing.sm },
});
