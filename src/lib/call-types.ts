export type CallParticipant = {
  id: string;
  username: string;
  image: string | null;
};

export type CallType = "AUDIO" | "VIDEO";

export type CallPayload = {
  id: string;
  signalingRoomId: string;
  chatRoomId: string | null;
  callType: CallType;
  status: string;
  caller: CallParticipant;
  callee: CallParticipant;
};

export type ActiveCallState =
  | { phase: "idle" }
  | {
      phase: "preparing";
      peer: CallParticipant;
      callType: CallType;
      chatRoomId?: string;
    }
  | { phase: "outgoing"; call: CallPayload; peer: CallParticipant }
  | { phase: "incoming"; call: CallPayload; peer: CallParticipant }
  | { phase: "active"; call: CallPayload; peer: CallParticipant };
