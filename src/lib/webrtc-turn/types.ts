export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type TurnProvider = "none" | "static" | "coturn" | "cloudflare";

export type ResolvedIceConfig = {
  iceServers: IceServerConfig[];
  iceTransportPolicy?: RTCIceTransportPolicy;
};
