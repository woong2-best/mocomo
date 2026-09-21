import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, View } from "react-native";
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

function RoomTracks({
  audioOnly,
  enableIosPip,
}: {
  audioOnly: boolean;
  enableIosPip: boolean;
}) {
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

  // Prefer a single primary track for PiP / immersive viewer (avoid FlatList chrome).
  const primary = videoTracks[0]!;

  return (
    <View style={styles.videoFill}>
      {isTrackReference(primary) ? (
        <VideoTrack
          trackRef={primary}
          style={styles.video}
          objectFit="contain"
          iosPIP={
            enableIosPip && Platform.OS === "ios"
              ? {
                  enabled: true,
                  startAutomatically: true,
                  preferredSize: { width: 16, height: 9 },
                }
              : undefined
          }
        />
      ) : (
        <View style={styles.video} />
      )}
      {videoTracks.length > 1 ? (
        <FlatList
          data={videoTracks.slice(1)}
          keyExtractor={(item: TrackReferenceOrPlaceholder) =>
            isTrackReference(item) ? item.publication.trackSid : String(item)
          }
          horizontal
          style={styles.secondaryRail}
          renderItem={({ item }) =>
            isTrackReference(item) ? (
              <VideoTrack trackRef={item} style={styles.secondaryVideo} objectFit="cover" />
            ) : (
              <View style={styles.secondaryVideo} />
            )
          }
        />
      ) : null}
    </View>
  );
}

export function LiveKitViewer({
  creds,
  onDisconnected,
  enablePip = true,
}: {
  creds: LiveToken;
  onDisconnected?: () => void;
  /** iOS LiveKit VideoTrack auto-PiP when backgrounding. */
  enablePip?: boolean;
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
        <RoomTracks audioOnly={!!creds.audioOnly} enableIosPip={!!enablePip} />
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
    room: { flex: 1, backgroundColor: "#000", minHeight: 180 },
    videoFill: { flex: 1, backgroundColor: "#000" },
    video: { width: "100%", height: "100%", backgroundColor: "#000" },
    secondaryRail: {
      position: "absolute",
      right: 8,
      bottom: 8,
      maxHeight: 72,
    },
    secondaryVideo: {
      width: 96,
      height: 54,
      borderRadius: 6,
      marginLeft: 6,
      backgroundColor: "#111",
      overflow: "hidden",
    },
    audioOnly: {
      flex: 1,
      minHeight: 180,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#111",
      padding: spacing.md,
    },
    audioTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
    audioSub: { color: colors.textMuted, marginTop: 6 },
  });
}
