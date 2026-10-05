import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MediaStream } from "@livekit/react-native-webrtc";
import { FolkAvatar } from "@/ui/FolkAvatar";
import type { MobilePeerCallState } from "@/lib/use-mobile-peer-call";

type Props = {
  isVideo: boolean;
  displayName: string;
  displayImage: string | null;
  state: MobilePeerCallState;
  statusHint: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera?: () => void;
  topInset: number;
};

function VideoSurface({ stream, mirror }: { stream: MediaStream | null; mirror?: boolean }) {
  if (!stream) return null;
  const { RTCView } = require("@livekit/react-native-webrtc") as typeof import("@livekit/react-native-webrtc");
  return (
    <RTCView
      streamURL={stream.toURL()}
      style={StyleSheet.absoluteFill}
      objectFit="cover"
      mirror={mirror ?? false}
      zOrder={mirror ? 1 : 0}
    />
  );
}

export function DmCallLiveView({
  isVideo,
  displayName,
  displayImage,
  state,
  statusHint,
  localStream,
  remoteStream,
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  topInset,
}: Props) {
  const hasRemoteVideo = Boolean(remoteStream?.getVideoTracks().some((t) => t.enabled));
  const hasLocalVideo = Boolean(localStream?.getVideoTracks().some((t) => t.enabled && cameraEnabled));

  if (isVideo) {
    return (
      <View style={styles.videoRoot}>
        <View style={styles.remotePane}>
          {hasRemoteVideo ? (
            <VideoSurface stream={remoteStream} />
          ) : (
            <View style={styles.remoteFallback}>
              <FolkAvatar uri={displayImage} name={displayName} size={96} />
              <Text style={styles.statusHint}>{statusHint}</Text>
            </View>
          )}
        </View>
        <View style={styles.localPane}>
          {hasLocalVideo ? (
            <VideoSurface stream={localStream} mirror />
          ) : (
            <View style={styles.localFallback} />
          )}
        </View>
        <View style={[styles.videoTop, { paddingTop: topInset + 12 }]}>
          <Text style={styles.videoName}>{displayName}</Text>
          <Text style={styles.videoSub}>{state === "connected" ? statusHint : statusHint}</Text>
        </View>
        <View style={styles.toolRow}>
          <Pressable style={styles.toolBtn} onPress={onToggleMic}>
            <Ionicons name={micEnabled ? "mic" : "mic-off"} size={24} color="#fff" />
          </Pressable>
          {onToggleCamera ? (
            <Pressable style={styles.toolBtn} onPress={onToggleCamera}>
              <Ionicons name={cameraEnabled ? "videocam" : "videocam-off"} size={24} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.audioStage}>
      <FolkAvatar uri={displayImage} name={displayName} size={96} />
      <Text style={styles.statusHint}>{statusHint}</Text>
      <Pressable style={styles.micBtn} onPress={onToggleMic}>
        <Ionicons name={micEnabled ? "mic" : "mic-off"} size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  videoRoot: { flex: 1, backgroundColor: "#000" },
  remotePane: { flex: 1, backgroundColor: "#0B1220", overflow: "hidden" },
  localPane: {
    flex: 1,
    backgroundColor: "#111827",
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  remoteFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  localFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  videoTop: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 4,
  },
  videoName: { color: "#fff", fontSize: 18, fontWeight: "700" },
  videoSub: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: "600" },
  toolRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 120,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  toolBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
    gap: 12,
  },
  statusHint: { color: "rgba(255,255,255,0.55)", fontWeight: "600", textAlign: "center" },
  micBtn: {
    marginTop: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});
