"use client";

import { useCallback, useEffect, useState } from "react";

export type MidiInputState = {
  supported: boolean;
  enabled: boolean;
  deviceName: string | null;
  error: string | null;
};

/** Web MIDI API — 외부 키보드·컨트롤러 입력 */
export function useWebMidiInput(onNoteOn: (midi: number, velocity: number) => void) {
  const [state, setState] = useState<MidiInputState>({
    supported: typeof navigator !== "undefined" && "requestMIDIAccess" in navigator,
    enabled: false,
    deviceName: null,
    error: null,
  });

  const enable = useCallback(async () => {
    if (!state.supported) {
      setState((s) => ({ ...s, error: "Web MIDI 미지원 브라우저" }));
      return false;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      const inputs = [...access.inputs.values()];
      if (!inputs.length) {
        setState((s) => ({ ...s, error: "연결된 MIDI 장치 없음" }));
        return false;
      }
      const input = inputs[0];
      input.onmidimessage = (ev) => {
        const data = ev.data;
        if (!data) return;
        const [status, note, vel] = data;
        const cmd = status & 0xf0;
        if (cmd === 0x90 && vel > 0) onNoteOn(note, vel);
        if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) onNoteOn(note, 0);
      };
      setState({ supported: true, enabled: true, deviceName: input.name ?? "MIDI", error: null });
      return true;
    } catch {
      setState((s) => ({ ...s, error: "MIDI 접근 거부됨" }));
      return false;
    }
  }, [onNoteOn, state.supported]);

  const disable = useCallback(() => {
    setState((s) => ({ ...s, enabled: false, deviceName: null }));
  }, []);

  useEffect(() => () => disable(), [disable]);

  return { ...state, enable, disable };
}
