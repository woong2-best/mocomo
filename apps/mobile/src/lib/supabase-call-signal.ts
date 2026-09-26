import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

/** Must match src/lib/peer-call/supabase-signal.ts */
export type VoiceWireSignal =
  | { type: "hello" }
  | { type: "ready" }
  | { type: "offer"; sdp: { type?: string; sdp?: string } }
  | { type: "answer"; sdp: { type?: string; sdp?: string } }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "hangup" };

export type UserCallEventName = "ring" | "accepted" | "declined" | "ended";

const USER_CALL_EVENTS: UserCallEventName[] = ["ring", "accepted", "declined", "ended"];

export type VoiceSignalSession = {
  send: (signal: VoiceWireSignal) => void;
  close: () => void;
};

let client: SupabaseClient | null = null;
let configPromise: Promise<{ url: string; anonKey: string } | null> | null = null;

async function loadConfig(): Promise<{ url: string; anonKey: string } | null> {
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey };

  if (!configPromise) {
    configPromise = apiRequest<{ supabaseUrl: string; supabaseAnonKey: string }>(
      MobileApi.realtimeConfig
    )
      .then((data) => ({ url: data.supabaseUrl, anonKey: data.supabaseAnonKey }))
      .catch(() => {
        configPromise = null;
        return null;
      });
  }
  return configPromise;
}

async function getClient(): Promise<SupabaseClient | null> {
  if (client) return client;
  const cfg = await loadConfig();
  if (!cfg) return null;
  client = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 30 } },
  });
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
  const supabase = await getClient();
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
  let closed = false;
  let channel: RealtimeChannel | null = null;
  let supabase: SupabaseClient | null = null;

  void (async () => {
    supabase = await getClient();
    if (!supabase || closed) return;
    channel = supabase.channel(userCallTopic(userId), {
      config: { broadcast: { self: false, ack: false } },
    });
    if (closed) {
      void supabase.removeChannel(channel);
      return;
    }
    for (const event of USER_CALL_EVENTS) {
      channel.on("broadcast", { event }, (msg) => {
        const callId = (msg.payload as { callId?: string } | undefined)?.callId;
        if (callId) onEvent(event, callId);
      });
    }
    channel.subscribe();
  })();

  return () => {
    closed = true;
    if (channel && supabase) void supabase.removeChannel(channel);
  };
}

export async function publishUserCallEvent(
  targetUserId: string,
  event: UserCallEventName,
  callId: string
): Promise<void> {
  const supabase = await getClient();
  if (!supabase || !targetUserId || !callId) return;

  const channel = supabase.channel(userCallTopic(targetUserId), {
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
