import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  useTracks,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import type { LiveToken } from "@/api/live";
import { ensureLiveKitGlobals } from "@/native/livekit-bootstrap";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

function RoomTracks({ audioOnly }: { audioOnly: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const tracks = useTracks(
    audioOnly ? [Track.Source.Microphone] : [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: true }
  );

  if (audioOnly) {
    return (
      <View style={styles.audioOnly}>
        <Text style={styles.audioTitle}>음성 라이브</Text>
        <Text style={styles.audioSub}>
          {tracks.length > 0 ? "호스트 오디오 수신 중" : "연결 대기 중…"}
        </Text>
      </View>
    );
  }

  const videoTracks = tracks.filter(isTrackReference);
  if (videoTracks.length === 0) {
    return (
      <View style={styles.audioOnly}>
        <Text style={styles.audioSub}>영상 트랙을 기다리는 중…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={videoTracks}
      keyExtractor={(item: TrackReferenceOrPlaceholder) =>
        isTrackReference(item) ? item.publication.trackSid : String(item)
      }
      renderItem={({ item }) =>
        isTrackReference(item) ? (
          <VideoTrack trackRef={item} style={styles.video} objectFit="contain" />
        ) : (
          <View style={styles.video} />
        )
      }
      style={{ flex: 1 }}
    />
  );
}

export function LiveKitViewer({
  creds,
  onDisconnected,
}: {
  creds: LiveToken;
  onDisconnected?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      await ensureLiveKitGlobals();
      if (!active) return;
      setReady(true);
      await AudioSession.startAudioSession();
      if (!active) await AudioSession.stopAudioSession();
    })();
    return () => {
      active = false;
      void AudioSession.stopAudioSession();
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.room}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.room}>
      <LiveKitRoom
        serverUrl={creds.serverUrl}
        token={creds.token}
        connect
        audio={false}
        video={false}
        options={{ adaptiveStream: { pixelDensity: "screen" } }}
        onDisconnected={onDisconnected}
      >
        <RoomTracks audioOnly={!!creds.audioOnly} />
      </LiveKitRoom>
    </View>
  );
}

export function LiveKitConnecting() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  return (
    <View style={styles.audioOnly}>
      <ActivityIndicator color="#fff" />
      <Text style={[styles.audioSub, { marginTop: spacing.sm }]}>라이브 연결 중…</Text>
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  room: { flex: 1, backgroundColor: "#000", minHeight: 220 },
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#111" },
  audioOnly: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    padding: spacing.md,
  },
  audioTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  audioSub: { color: colors.textMuted, marginTop: 6 },
});
}

