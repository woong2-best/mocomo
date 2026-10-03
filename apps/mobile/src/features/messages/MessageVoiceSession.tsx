import { useCallback, useEffect, useRef } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useI18n } from "@/i18n/I18nProvider";
import { showIslandError } from "@/ui/IslandToast";
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
  const { t } = useI18n();
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
          showIslandError(t("m.messages.recording_is_too_short"));
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
        showIslandError(
          t("m.messages.send_failed"),
          e instanceof Error ? e.message : t("m.messages.could_not_send_voice_message")
        );
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
      t,
    ]
  );

  const start = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showIslandError(t("m.common.permission_required"), t("m.messages.microphone_access_is_required"));
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
      showIslandError(
        t("m.messages.recording_failed"),
        t("m.messages.could_not_start_voice_recording")
      );
      setRecording(false);
      clearRecordTimer();
    }
  }, [audioRecorder, clearRecordTimer, finish, setRecordSec, setRecording, t]);

  useEffect(() => {
    registerControls({ start, finish });
  }, [registerControls, start, finish]);

  return null;
}
