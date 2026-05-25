export type CallParticipant = {
  id: string;
  username: string;
  image: string | null;
};

export type CallPayload = {
  id: string;
  livekitRoom: string;
  chatRoomId: string | null;
  status: string;
  caller: CallParticipant;
  callee: CallParticipant;
};

export type ActiveCallState =
  | { phase: "idle" }
  | { phase: "outgoing"; call: CallPayload; peer: CallParticipant }
  | { phase: "incoming"; call: CallPayload; peer: CallParticipant }
  | { phase: "active"; call: CallPayload; peer: CallParticipant };
