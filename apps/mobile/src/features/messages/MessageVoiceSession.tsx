import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { uploadLocalFile } from "@/api/upload-file";

const MAX_VOICE_SEC = 120;

type VoiceAttachment = {
  url: string;
  type: "AUDIO";
  name?: string;
};

type Props = {
  draft: string;
  replyId?: string;
  setDraft: (v: string) => void;
  clearReply: () => void;
  send: (
    content: string,
    attachments?: VoiceAttachment[],
    replyToId?: string
  ) => Promise<unknown>;
  onSent: () => void;
  onBusy: (busy: boolean) => void;
  active: boolean;
  recording: boolean;
  setRecording: (v: boolean) => void;
  recordSec: number;
  setRecordSec: (updater: number | ((s: number) => number)) => void;
  registerControls: (controls: {
    start: () => Promise<void>;
    finish: (shouldSend: boolean) => Promise<void>;
  }) => void;
};

/**
 * Mounted only after the user arms the mic — keeps expo-audio off the chat open path.
 */
export function MessageVoiceSession({
  draft,
  replyId,
  setDraft,
  clearReply,
  send,
  onSent,
  onBusy,
  setRecording,
  recordSec,
  setRecordSec,
  registerControls,
}: Props) {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordSecRef = useRef(recordSec);
  recordSecRef.current = recordSec;

  const clearRecordTimer = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRecordTimer();
      if (audioRecorder.isRecording) {
        void audioRecorder.stop().catch(() => undefined);
      }
    };
  }, [clearRecordTimer, audioRecorder]);

  const finish = useCallback(
    async (shouldSend: boolean) => {
      clearRecordTimer();
      setRecording(false);
      setRecordSec(0);

      try {
        const durationMs = recordSecRef.current * 1000;
        if (audioRecorder.isRecording) {
          await audioRecorder.stop();
        }
        if (!shouldSend) return;
        const uri = audioRecorder.uri;
        if (!uri) return;

        if (durationMs > 0 && durationMs < 400) {
          Alert.alert("녹음이 너무 짧습니다.");
          return;
        }

        onBusy(true);
        const filename = `voice-${Date.now()}.m4a`;
        const url = await uploadLocalFile({
          uri,
          filename,
          contentType: "audio/mp4",
          category: "audio",
        });
        const caption = draft.trim() || undefined;
        if (caption) setDraft("");
        clearReply();
        await send(caption ?? "", [{ url, type: "AUDIO", name: filename }], replyId);
        onSent();
      } catch (e) {
        Alert.alert("전송 실패", e instanceof Error ? e.message : "음성을 보내지 못했습니다.");
      } finally {
        onBusy(false);
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        }).catch(() => undefined);
      }
    },
    [
      audioRecorder,
      clearRecordTimer,
      clearReply,
      draft,
      onBusy,
      onSent,
      replyId,
      send,
      setDraft,
      setRecordSec,
      setRecording,
    ]
  );

  const start = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("권한 필요", "마이크 접근이 필요합니다.");
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecording(true);
      setRecordSec(0);
      clearRecordTimer();
      recordTimerRef.current = setInterval(() => {
        setRecordSec((s) => {
          if (s + 1 >= MAX_VOICE_SEC) {
            void finish(true);
            return MAX_VOICE_SEC;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      Alert.alert("녹음 실패", "음성 녹음을 시작할 수 없습니다.");
      setRecording(false);
      clearRecordTimer();
    }
  }, [audioRecorder, clearRecordTimer, finish, setRecordSec, setRecording]);

  useEffect(() => {
    registerControls({ start, finish });
  }, [registerControls, start, finish]);

  return null;
}
