import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fetchLiveAlerts, type LiveAlertItem } from "@/api/live";
import { useTheme } from "@/theme/ThemeContext";
import { radii, type ThemeColors } from "@/theme/tokens";

const ALERT_MS: Record<string, number> = {
  cheer: 5200,
  tip: 5800,
};

function formatName(username: string) {
  return username.startsWith("@") ? username.slice(1) : username;
}

function AlertCard({ item, colors }: { item: LiveAlertItem; colors: ThemeColors }) {
  const isCheer = item.kind === "cheer";
  const unit = isCheer ? " CP" : "원";
  const name = formatName(item.username);

  let title = "";
  if (item.eventType === "ROULETTE" && item.rouletteLabel) {
    title = `${name} · 룰렛 ${item.rouletteLabel}`;
  } else if (isCheer) {
    title = `${name} · ${item.amount.toLocaleString()}${unit}`;
  } else {
    title = `${name} · ${item.amount.toLocaleString()}${unit}`;
    if (item.viaLivePage === false) {
      title += " · 프로필";
    }
  }

  return (
    <View style={[styles.card, isCheer ? styles.cardCheer : styles.cardTip]}>
      <Text style={[styles.title, { color: isCheer ? "#5dff6a" : "#5dff6a" }]}>{title}</Text>
      {item.message?.trim() ? (
        <Text style={[styles.message, { color: "#fef3c7" }]} numberOfLines={4}>
          {item.message.trim()}
        </Text>
      ) : null}
    </View>
  );
}

/** 모바일 라이브 — 스트리머에게 들어온 모든 후원(프로필+라이브) + CP */
export function LiveDonationAlertOverlay({
  channelId,
  streamStartedAt,
}: {
  channelId: string;
  streamStartedAt?: string;
}) {
  const { colors } = useTheme();
  const seenRef = useRef(new Set<string>());
  const queueRef = useRef<LiveAlertItem[]>([]);
  const sinceRef = useRef<number>(
    streamStartedAt ? new Date(streamStartedAt).getTime() - 2000 : Date.now() - 120_000
  );
  const [current, setCurrent] = useState<LiveAlertItem | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const res = await fetchLiveAlerts(channelId, sinceRef.current);
        if (cancelled) return;
        for (const item of res.alerts) {
          if (seenRef.current.has(item.id)) continue;
          seenRef.current.add(item.id);
          queueRef.current.push(item);
          sinceRef.current = Math.max(sinceRef.current, new Date(item.at).getTime());
        }
        if (!playingRef.current && queueRef.current.length > 0) {
          playingRef.current = true;
          setCurrent(queueRef.current.shift()!);
        }
      } catch {
        /* ignore poll errors */
      }
      if (!cancelled) timer = setTimeout(poll, 2500);
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [channelId]);

  useEffect(() => {
    if (!current) return;
    const ms = ALERT_MS[current.kind] ?? ALERT_MS.tip;
    const timer = setTimeout(() => {
      const next = queueRef.current.shift();
      if (next) {
        setCurrent(next);
      } else {
        playingRef.current = false;
        setCurrent(null);
      }
    }, ms);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    <View style={styles.stack} pointerEvents="none">
      <AlertCard item={current} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    right: 8,
    top: "12%",
    maxWidth: "46%",
    zIndex: 40,
  },
  card: {
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  cardTip: {},
  cardCheer: { borderColor: "rgba(93,255,106,0.25)" },
  title: { fontSize: 13, fontWeight: "800" },
  message: { marginTop: 6, fontSize: 12, fontWeight: "600", lineHeight: 17 },
});
