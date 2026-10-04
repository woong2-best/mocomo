import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError } from "@/api/client";
import {
  endLiveWithVideoCheck,
  fetchLiveVideoDonations,
  postLiveVideoDonationAction,
  type LiveVideoDonationCard,
} from "@/api/live-donate";
import { useI18n } from "@/i18n/I18nProvider";

const END_WARNING =
  "There are pending video donations in the queue. Are you sure you want to end the stream?";

export function LiveVideoDonationBar({
  channelId,
  isHost,
}: {
  channelId: string;
  isHost?: boolean;
}) {
  const { t } = useI18n();
  const [mine, setMine] = useState<LiveVideoDonationCard[]>([]);
  const [queue, setQueue] = useState<LiveVideoDonationCard[]>([]);
  const [playing, setPlaying] = useState<LiveVideoDonationCard | null>(null);
  const [host, setHost] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchLiveVideoDonations(channelId);
      setMine(res.mine ?? []);
      setQueue(res.queue ?? []);
      setPlaying(res.playing ?? null);
      setHost(!!res.isHost);
    } catch {
      /* ignore */
    }
  }, [channelId]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  async function act(body: Record<string, unknown>) {
    await postLiveVideoDonationAction(channelId, body);
    await refresh();
  }

  function endStream() {
    void (async () => {
      try {
        await endLiveWithVideoCheck(channelId, false);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          Alert.alert("End stream", END_WARNING, [
            { text: t("m.common.cancel"), style: "cancel" },
            {
              text: "End",
              style: "destructive",
              onPress: () => void endLiveWithVideoCheck(channelId, true),
            },
          ]);
          return;
        }
      }
    })();
  }

  const waiting = mine.filter((row) => row.status === "PENDING");
  const playingMine = mine.filter((row) => row.status === "PLAYING");

  return (
    <View style={styles.wrap}>
      {waiting.map((row) => (
        <View key={row.id} style={styles.card}>
          <View style={styles.flex}>
            <Text style={styles.title} numberOfLines={1}>
              {row.videoTitle || "Video donation"}
            </Text>
            <Text style={styles.sub}>{row.mocoLabel} MOCO · in queue</Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert("Video donation", t("m.live.delete_from_queue"), [
                { text: t("m.common.cancel"), style: "cancel" },
                { text: "OK", onPress: () => void act({ action: "cancel", donationId: row.id }) },
              ])
            }
          >
            <Text style={styles.x}>×</Text>
          </Pressable>
        </View>
      ))}
      {playingMine.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.title} numberOfLines={1}>
            {row.videoTitle || "Video donation"} · playing
          </Text>
        </View>
      ))}
      {isHost && host ? (
        <View style={styles.host}>
          <Text style={styles.title}>Video donation controls</Text>
          {playing ? (
            <View style={styles.row}>
              <Pressable onPress={() => void act({ action: "pause" })}>
                <Text style={styles.btn}>Pause</Text>
              </Pressable>
              <Pressable onPress={() => void act({ action: "resume" })}>
                <Text style={styles.btn}>Play</Text>
              </Pressable>
              <Pressable onPress={() => void act({ action: "skip", donationId: playing.id })}>
                <Text style={styles.btn}>Skip</Text>
              </Pressable>
            </View>
          ) : null}
          {queue.map((row) => (
            <Pressable
              key={row.id}
              onPress={() =>
                Alert.alert(
                  "Remove from queue",
                  "Removing this video refunds the MOCO to the viewer immediately.",
                  [
                    { text: t("m.common.cancel"), style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => void act({ action: "delete", donationId: row.id }),
                    },
                  ]
                )
              }
            >
              <Text style={styles.sub}>
                Remove {row.username} · {row.mocoLabel} MOCO
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={endStream}>
            <Text style={styles.end}>End stream</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 6 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  flex: { flex: 1 },
  title: { fontSize: 12, fontWeight: "800", color: "#111" },
  sub: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  x: { fontSize: 20, fontWeight: "800", color: "#111", paddingHorizontal: 6 },
  host: { gap: 6, padding: 8, borderRadius: 10, backgroundColor: "#f8fafc" },
  row: { flexDirection: "row", gap: 8 },
  btn: { fontSize: 12, fontWeight: "800", color: "#0d4d2c" },
  end: { fontSize: 12, fontWeight: "800", color: "#b91c1c" },
});
