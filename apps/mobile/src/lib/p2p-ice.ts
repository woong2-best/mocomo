export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

/** Google public STUN only — no TURN, no relay billing. */
export const GOOGLE_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
] as const;

export const GOOGLE_STUN_ICE_SERVERS: IceServerConfig[] = [
  { urls: [...GOOGLE_STUN_URLS] },
];

export const CALL_NAT_BLOCKED_TITLE = "Check your Wi-Fi";

export const CALL_NAT_BLOCKED_MESSAGE =
  "Direct voice or video connection is not possible on this network (firewall or LTE symmetric NAT). Please switch to Wi-Fi and try again.";

export function googleStunRtcConfiguration(): {
  iceServers: IceServerConfig[];
} {
  return { iceServers: GOOGLE_STUN_ICE_SERVERS };
}
