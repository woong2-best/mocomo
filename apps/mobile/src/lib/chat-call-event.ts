/** DM call transcript markers — keep in sync with src/lib/chat-call-event.ts */

export type CallEventPhase = "started" | "ended";
export type CallEventKind = "VIDEO" | "AUDIO";

export type ParsedCallEvent = {
  phase: CallEventPhase;
  callType: CallEventKind;
  callId: string;
  label: string;
};

const MARKER_RE =
  /\[\[mocomo:call-event:(started|ended):(VIDEO|AUDIO):([a-z0-9]+)\]\]/i;

export function callEventLabel(phase: CallEventPhase, callType: CallEventKind): string {
  if (callType === "VIDEO") {
    return phase === "started" ? "Video call started" : "Video call ended";
  }
  return phase === "started" ? "Voice call started" : "Voice call ended";
}

export function parseCallEvent(content: string | null | undefined): ParsedCallEvent | null {
  if (!content?.trim()) return null;
  const match = content.trim().match(MARKER_RE);
  if (!match) return null;
  const phase = match[1].toLowerCase() === "ended" ? "ended" : "started";
  const callType = match[2].toUpperCase() === "VIDEO" ? "VIDEO" : "AUDIO";
  const leftover = content.replace(MARKER_RE, "").trim();
  return {
    phase,
    callType,
    callId: match[3],
    label: leftover || callEventLabel(phase, callType),
  };
}

export function callEventListPreview(content: string | null | undefined): string | null {
  const parsed = parseCallEvent(content);
  return parsed?.label ?? null;
}
