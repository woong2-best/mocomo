export type AptHomeInstrumentNote = {
  userId: string;
  username: string;
  kind: string;
  midi: number;
  padIndex?: number;
  homeOwnerId: string;
};

export type AptHomePeerDto = {
  userId: string;
  username: string;
  x: number;
  z: number;
  pose: string;
  activity: string;
  homeOwnerId: string;
};
