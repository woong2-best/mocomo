"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

/** Wire format shared with the mobile app. Topic names must stay identical. */
export type VoiceWireSignal =
  | { type: "hello" }
  | { type: "ready" }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "hangup" };

export type UserCallEventName = "ring" | "accepted" | "declined" | "ended";

const USER_CALL_EVENTS: UserCallEventName[] = ["ring", "accepted", "declined", "ended"];

export type VoiceSignalSession = {
  send: (signal: VoiceWireSignal) => void;
  close: () => void;
};

let client: SupabaseClient | null = null;

export function getCallRealtimeClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 30 } },
    });
  }
  return client;
}

function voiceTopic(signalingRoomId: string) {
  return `voice:${signalingRoomId}`;
}

function userCallTopic(userId: string) {
  return `user-call:${userId}`;
}

function isVoiceSignal(value: unknown): value is VoiceWireSignal {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === "hello" ||
    type === "ready" ||
    type === "offer" ||
    type === "answer" ||
    type === "ice" ||
    type === "hangup"
  );
}

function waitUntilSubscribed(channel: RealtimeChannel, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve(true);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        resolve(false);
      }
    });
  });
}

export async function openVoiceSignalChannel(opts: {
  signalingRoomId: string;
  userId: string;
  onSignal: (fromUserId: string, signal: VoiceWireSignal) => void;
}): Promise<VoiceSignalSession | null> {
  const supabase = getCallRealtimeClient();
  if (!supabase) return null;

  const channel = supabase.channel(voiceTopic(opts.signalingRoomId), {
    config: { broadcast: { self: false, ack: false } },
  });

  channel.on("broadcast", { event: "signal" }, (msg) => {
    const payload = msg.payload as { fromUserId?: string; signal?: unknown } | undefined;
    const fromUserId = payload?.fromUserId;
    if (!fromUserId || fromUserId === opts.userId || !isVoiceSignal(payload?.signal)) return;
    opts.onSignal(fromUserId, payload.signal);
  });

  const ok = await waitUntilSubscribed(channel);
  if (!ok) {
    void supabase.removeChannel(channel);
    return null;
  }

  return {
    send(signal) {
      void channel.send({
        type: "broadcast",
        event: "signal",
        payload: { fromUserId: opts.userId, signal },
      });
    },
    close() {
      void supabase.removeChannel(channel);
    },
  };
}

export function subscribeUserCallEvents(
  userId: string,
  onEvent: (event: UserCallEventName, callId: string) => void
): () => void {
  const supabase = getCallRealtimeClient();
  if (!supabase) return () => undefined;

  const channel = supabase.channel(userCallTopic(userId), {
    config: { broadcast: { self: false, ack: false } },
  });

  for (const event of USER_CALL_EVENTS) {
    channel.on("broadcast", { event }, (msg) => {
      const callId = (msg.payload as { callId?: string } | undefined)?.callId;
      if (callId) onEvent(event, callId);
    });
  }

  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Notify the other participant. Broadcast is a hint; clients confirm with /api/calls/sync. */
export async function publishUserCallEvent(
  targetUserId: string,
  event: UserCallEventName,
  callId: string
): Promise<void> {
  const supabase = getCallRealtimeClient();
  if (!supabase || !targetUserId || !callId) return;

  const topic = userCallTopic(targetUserId);
  const channel = supabase.channel(topic, {
    config: { broadcast: { self: false, ack: true } },
  });
  const alreadyJoined = channel.state === "joined";

  if (!alreadyJoined) {
    const ok = await waitUntilSubscribed(channel);
    if (!ok) {
      void supabase.removeChannel(channel);
      return;
    }
  }

  await channel.send({
    type: "broadcast",
    event,
    payload: { callId },
  });

  if (!alreadyJoined) {
    void supabase.removeChannel(channel);
  }
}
