import { useEffect, useMemo, useState } from "react";
import { pollOptionPercents } from "@/lib/poll-display";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FeedPoll } from "@/api/feed";
import { voteOnPostPoll } from "@/api/posts";
import type { UsedUiText } from "@/features/marketplace/used-catalog";
import { showIslandError } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  postId: string;
  poll: FeedPoll;
  isAuthor: boolean;
  signedIn: boolean;
  onNeedLogin: () => void;
};

function formatTimeLeft(closesAt: string, closed: boolean, t: UsedUiText): string {
  const end = new Date(closesAt).getTime();
  if (closed || !Number.isFinite(end) || end <= Date.now()) return t("m.common.ended");
  const totalMins = Math.max(1, Math.ceil((end - Date.now()) / 60000));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days >= 1) {
    return hours > 0
      ? t("m.feed.days_d_hours_h_left", { days: String(days), hours: String(hours) })
      : t("m.feed.days_d_left", { days: String(days) });
  }
  if (hours >= 1) {
    return mins > 0
      ? t("m.feed.hours_h_mins_m_left", { hours: String(hours), mins: String(mins) })
      : t("m.feed.hours_h_left", { hours: String(hours) });
  }
  return t("m.feed.mins_m_left", { mins: String(mins) });
}

export function FeedPostPoll({ postId, poll: initialPoll, isAuthor, signedIn, onNeedLogin }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [poll, setPoll] = useState(initialPoll);
  const [busy, setBusy] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  const incomingKey = `${initialPoll.id}:${initialPoll.myVoteOptionId ?? ""}:${initialPoll.totalVotes}:${initialPoll.closed}:${initialPoll.closesAt}`;
  useEffect(() => {
    setPoll(initialPoll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingKey]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const options = Array.isArray(poll?.options) ? poll.options : [];
  const totalVotes = Number(poll?.totalVotes) || 0;
  const pctByOption = useMemo(
    () => (options.length > 0 ? pollOptionPercents(options, totalVotes) : new Map()),
    [options, totalVotes]
  );

  if (options.length === 0) return null;

  const ended = poll.closed || new Date(poll.closesAt).getTime() <= now;
  const showResults = isAuthor || ended || poll.myVoteOptionId != null;
  const meta = `${t("m.feed.totalvotes_votes", { totalVotes: String(totalVotes.toLocaleString()) })} · ${formatTimeLeft(poll.closesAt, ended, t)}`;

  async function vote(optionId: string) {
    if (showResults || busy || isAuthor) return;
    if (!signedIn) {
      onNeedLogin();
      return;
    }
    setBusy(true);
    try {
      const res = await voteOnPostPoll(postId, optionId);
      if (res.poll) setPoll(res.poll);
    } catch (err) {
      showIslandError(t("m.common.poll"), err instanceof Error ? err.message : t("m.feed.could_not_vote"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {poll.options.map((opt) => {
        const { labelPct, barPct } = pctByOption.get(opt.id) ?? { labelPct: 0, barPct: 0 };
        const selected = poll.myVoteOptionId === opt.id;
        if (!showResults) {
          return (
            <Pressable
              key={opt.id}
              onPress={() => void vote(opt.id)}
              disabled={busy}
              style={({ pressed }) => [styles.choice, pressed && styles.choicePressed]}
              accessibilityRole="button"
              accessibilityLabel={t("m.feed.vote_for_label", { label: String(opt.label) })}
            >
              <Text style={[styles.choiceLabel, busy && { opacity: 0.5 }]}>{opt.label}</Text>
            </Pressable>
          );
        }
        return (
          <PollResultRow
            key={opt.id}
            label={opt.label}
            labelPct={labelPct}
            barPct={barPct}
            selected={selected}
            colors={colors}
            styles={styles}
          />
        );
      })}
      <Text style={styles.meta}>{meta}</Text>
    </View>
  );
}

function PollResultRow({
  label,
  labelPct,
  barPct,
  selected,
  colors,
  styles,
}: {
  label: string;
  labelPct: number;
  barPct: number;
  selected: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const ratio = Math.min(1, Math.max(0, barPct / 100));
  const fillWidth = trackWidth > 0 ? trackWidth * ratio : 0;

  return (
    <View
      style={styles.resultRow}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setTrackWidth(w);
      }}
    >
      {fillWidth > 0 ? (
        <View
          style={[
            styles.fill,
            {
              width: fillWidth,
              backgroundColor: selected ? colors.brand + "80" : colors.brand + "45",
            },
          ]}
        />
      ) : null}
      <View style={styles.resultContent}>
        <View style={styles.resultLabel}>
          {selected ? <Ionicons name="checkmark" size={16} color={colors.brand} /> : null}
          <Text style={[styles.resultText, selected && styles.resultTextSelected]} numberOfLines={2}>
            {label}
          </Text>
        </View>
        <Text style={styles.pct}>{labelPct}%</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginTop: spacing.sm, gap: 8 },
    choice: {
      borderWidth: 1.5,
      borderColor: colors.brand,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
      backgroundColor: "transparent",
    },
    choicePressed: { backgroundColor: colors.brand + "14" },
    choiceLabel: {
      color: colors.brand,
      fontSize: 15,
      fontWeight: "700",
      textAlign: "center",
    },
    resultRow: {
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: colors.muted,
      width: "100%",
      position: "relative",
    },
    fill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
    },
    resultContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      zIndex: 1,
    },
    resultLabel: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
    resultText: { flex: 1, color: colors.text, fontSize: 15 },
    resultTextSelected: { fontWeight: "700" },
    pct: { color: colors.textMuted, fontSize: 14, fontVariant: ["tabular-nums"], zIndex: 1 },
    meta: { color: colors.textMuted, fontSize: 12, marginTop: 2, paddingHorizontal: 4 },
  });
}
