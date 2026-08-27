export type CallSignalPayload =
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "hangup" };

export type CallSignalEvent = {
  callId: string;
  fromUserId: string;
  payload: CallSignalPayload;
};
