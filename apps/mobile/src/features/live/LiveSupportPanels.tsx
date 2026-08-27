import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  fetchLiveSupportMissions,
  fetchLiveSupportPoll,
  resolveLiveSupportMission,
  voteLiveSupportPoll,
} from "@/api/live";
import type { LiveSupportMission, LiveSupportPoll } from "@/lib/live-support";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  channelId: string;
  isHost?: boolean;
  currentUserId?: string;
  onSupportEvent?: () => void;
};

export function LiveSupportPanels({
  channelId,
  isHost,
  currentUserId,
  onSupportEvent,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [missions, setMissions] = useState<LiveSupportMission[]>([]);
  const [poll, setPoll] = useState<LiveSupportPoll | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        fetchLiveSupportMissions(channelId),
        fetchLiveSupportPoll(channelId),
      ]);
      setMissions(mRes.missions ?? []);
      setPoll(pRes.poll ?? null);
      setError(null);
    } catch {
      /* ignore */
    }
  }, [channelId]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  async function onVote(optionId: string) {
    if (!poll) return;
    setError(null);
    try {
      const res = await voteLiveSupportPoll(channelId, {
        pollId: poll.id,
        optionId,
      });
      if (!res.ok) {
        setError(res.error ?? "투표에 실패했습니다.");
        return;
      }
      setPoll(res.poll);
      onSupportEvent?.();
    } catch {
      setError("투표에 실패했습니다.");
    }
  }

  async function onMissionAction(
    missionId: string,
    status: "ACCEPTED" | "COMPLETED" | "FAILED" | "CANCELLED"
  ) {
    setError(null);
    try {
      const res = await resolveLiveSupportMission(channelId, missionId, status);
      if (!res.ok) {
        setError(res.error ?? "미션 처리에 실패했습니다.");
        return;
      }
      void refresh();
      onSupportEvent?.();
    } catch {
      setError("미션 처리에 실패했습니다.");
    }
  }

  if (!poll && missions.length === 0) return null;

  const totalVotes = poll?.options.reduce((s, o) => s + o.votes, 0) ?? 0;

  return (
    <View style={styles.root}>
      {poll ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>📊 {poll.question}</Text>
          {poll.options.map((opt) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            return (
              <Pressable
                key={opt.id}
                style={styles.pollRow}
                disabled={!!isHost}
                onPress={() => void onVote(opt.id)}
              >
                <View style={styles.pollBarTrack}>
                  <View style={[styles.pollBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.pollLabel}>
                  {opt.label} · {opt.votes.toLocaleString()} CP ({pct}%)
                </Text>
              </Pressable>
            );
          })}
          {!isHost ? (
            <Text style={styles.hint}>탭해서 투표 · {poll.voteCost.toLocaleString()} CP</Text>
          ) : null}
        </View>
      ) : null}

      {missions.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>🎯 미션</Text>
          {missions.slice(0, 4).map((m) => (
            <View key={m.id} style={styles.missionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.missionTitle}>{m.title}</Text>
                <Text style={styles.missionSub}>
                  @{m.username} · {m.rewardAmount.toLocaleString()} CP · {m.status}
                </Text>
              </View>
              {isHost && m.status === "PENDING" ? (
                <Pressable
                  style={styles.missionBtn}
                  onPress={() => void onMissionAction(m.id, "ACCEPTED")}
                >
                  <Text style={styles.missionBtnText}>수락</Text>
                </Pressable>
              ) : null}
              {isHost && m.status === "ACCEPTED" ? (
                <View style={styles.missionActions}>
                  <Pressable
                    style={styles.missionBtn}
                    onPress={() => void onMissionAction(m.id, "COMPLETED")}
                  >
                    <Text style={styles.missionBtnText}>완료</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.missionBtn, styles.missionBtnFail]}
                    onPress={() => void onMissionAction(m.id, "FAILED")}
                  >
                    <Text style={styles.missionBtnText}>실패</Text>
                  </Pressable>
                </View>
              ) : null}
              {!isHost && currentUserId === m.senderId && m.status === "PENDING" ? (
                <Pressable
                  style={[styles.missionBtn, styles.missionBtnFail]}
                  onPress={() => void onMissionAction(m.id, "CANCELLED")}
                >
                  <Text style={styles.missionBtnText}>취소</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { gap: 8, paddingHorizontal: 10, paddingTop: 8 },
    block: {
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.muted,
      padding: 10,
      gap: 6,
    },
    blockTitle: { fontWeight: "800", fontSize: 13, color: colors.text },
    pollRow: { gap: 4 },
    pollBarTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    pollBarFill: { height: "100%", backgroundColor: colors.cobalt },
    pollLabel: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    hint: { fontSize: 10, color: colors.textMuted, fontWeight: "600" },
    missionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },
    missionTitle: { fontWeight: "700", fontSize: 13, color: colors.text },
    missionSub: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
    missionActions: { flexDirection: "row", gap: 4 },
    missionBtn: {
      backgroundColor: colors.cobalt,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    missionBtnFail: { backgroundColor: colors.danger },
    missionBtnText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    error: { color: colors.danger, fontSize: 11, fontWeight: "600", paddingHorizontal: 10 },
  });
}
