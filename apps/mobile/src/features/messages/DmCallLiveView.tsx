import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MediaStream } from "@livekit/react-native-webrtc";
import { FolkAvatar } from "@/ui/FolkAvatar";
import type { MobilePeerCallState } from "@/lib/use-mobile-peer-call";

type Props = {
  isVideo: boolean;
  displayName: string;
  displayImage: string | null;
  selfName?: string;
  selfImage?: string | null;
  state: MobilePeerCallState;
  statusHint: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  remoteCameraEnabled?: boolean;
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

function CameraOffPane({
  uri,
  name,
  compact,
}: {
  uri?: string | null;
  name: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.cameraOff}>
      <FolkAvatar uri={uri} name={name} size={compact ? 72 : 104} />
    </View>
  );
}

export function DmCallLiveView({
  isVideo,
  displayName,
  displayImage,
  selfName = "Me",
  selfImage = null,
  statusHint,
  localStream,
  remoteStream,
  micEnabled,
  cameraEnabled,
  remoteCameraEnabled = true,
  onToggleMic,
  onToggleCamera,
  topInset,
}: Props) {
  const hasRemoteTrack = Boolean(remoteStream?.getVideoTracks().length);
  const showRemoteVideo = remoteCameraEnabled && hasRemoteTrack;
  const showLocalVideo = Boolean(
    cameraEnabled && localStream?.getVideoTracks().some((track) => track.enabled)
  );

  if (isVideo) {
    return (
      <View style={styles.videoRoot}>
        <View style={styles.remotePane}>
          {showRemoteVideo ? (
            <VideoSurface stream={remoteStream} />
          ) : (
            <CameraOffPane uri={displayImage} name={displayName} />
          )}
        </View>
        <View style={styles.localPane}>
          {showLocalVideo ? (
            <VideoSurface stream={localStream} mirror />
          ) : (
            <CameraOffPane uri={selfImage} name={selfName} compact />
          )}
        </View>
        <View style={[styles.videoTop, { paddingTop: topInset + 12 }]} pointerEvents="none">
          <Text style={styles.videoName}>{displayName}</Text>
          <Text style={styles.videoSub}>{statusHint}</Text>
        </View>
        <View style={styles.toolRow}>
          <Pressable
            style={[styles.toolBtn, !micEnabled && styles.toolBtnOff]}
            onPress={onToggleMic}
            hitSlop={8}
          >
            <Ionicons name={micEnabled ? "mic" : "mic-off"} size={24} color="#fff" />
          </Pressable>
          {onToggleCamera ? (
            <Pressable
              style={[styles.toolBtn, !cameraEnabled && styles.toolBtnOff]}
              onPress={onToggleCamera}
              hitSlop={8}
            >
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
      <Pressable
        style={[styles.micBtn, !micEnabled && styles.toolBtnOff]}
        onPress={onToggleMic}
        hitSlop={8}
      >
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
  cameraOff: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1220",
  },
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
  toolBtnOff: { backgroundColor: "rgba(225,29,72,0.88)" },
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
