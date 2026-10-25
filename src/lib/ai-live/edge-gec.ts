/** Sec-MS-GEC v2 for Microsoft Edge read-aloud. Matches rany2/edge-tts. */

export const EDGE_TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
export const EDGE_CHROMIUM_FULL_VERSION = "143.0.3650.75";
export const EDGE_SEC_MS_GEC_VERSION = `2-${EDGE_CHROMIUM_FULL_VERSION}`;

const WIN_EPOCH = 11644473600;
const S_TO_NS = 1e9;

const SHA256_INITIAL = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const SHA256_STATE = [0xfd9fbea2, 0x91243ce7, 0xbe499094, 0xcd2e1e0a, 0x6c006f49, 0x04bd35ab, 0xfeb0a7e4, 0x03effbd2];
const SHA256_SCHEDULE = [
  0xeb24bf9e, 0x1558691f, 0xa0c09ee2, 0x0cfa32ba, 0xa622ee8c, 0xd1dd9491, 0xc0dd25a0, 0xf9e70ab6, 0xf0c31573, 0x7058ce4e,
  0x7188e606, 0x00e5ab33, 0xd258b060, 0x72766564,
];
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const SHA256_ADJUSTMENT = 0xc9dc06a7;
const SHA256_BLOCK_K = SHA256_K.map((value, index) => (index === 14 ? SHA256_ADJUSTMENT : value));
const SHA256_SIGMA0_ADJUSTMENT = 0x059c0b80;
const SHA256_SIGMA1_ADJUSTMENT = 0x000b92c0;

const CS64_COEFFICIENTS: Array<[number, number]> = [
  [0xe82e91b1, 0xb32700d0],
  [0x44de24c6, 0x88dff51d],
  [0x3beb65bc, 0x29514038],
  [0xc89c5933, 0xb328cbdf],
  [0x8d1ec211, 0xd405b4d5],
  [0x314ef5d5, 0x26e55f3c],
  [0xe92491b1, 0x607801c6],
  [0xf0a5b9d5, 0x82b2c1fb],
  [0x06064cf3, 0xfa51a3da],
  [0xda79fa60, 0x207cc464],
  [0xbed20560, 0x3c3c74f3],
  [0x89f9c9f8, 0xd2d14b61],
  [0x35fa38c6, 0xbb04a2c1],
  [0xcb49e3c6, 0xc5626167],
];
const CS64_FACTOR = 0x82893933;
const CS64_ADJUSTMENT0 = 0xf2f90b1a;
const CS64_ADJUSTMENT1 = 0x0b1a0000;

function u32(n: number): number {
  return n >>> 0;
}

function mul32(a: number, b: number): number {
  return Number((BigInt(u32(a)) * BigInt(u32(b))) & BigInt("0xffffffff")) >>> 0;
}

function rol16(value: number): number {
  return u32((value << 16) | (value >>> 16));
}

function sigma0(value: number): number {
  return u32((value >>> 7) ^ (value << 25) ^ (value >>> 18) ^ (value << 14) ^ (value >>> 3));
}

function sigma1(value: number): number {
  return u32((value >>> 17) ^ (value << 15) ^ (value >>> 19) ^ (value << 13) ^ (value >>> 10));
}

function rotXor(word: number, shifts: number[]): number {
  const rot = BigInt(u32(word)) * BigInt("0x100000001");
  let mixed = BigInt(0);
  for (const shift of shifts) mixed ^= rot >> BigInt(shift);
  return Number(mixed & BigInt("0xffffffff")) >>> 0;
}

function wordsLe4Even(data: Buffer): number[] {
  const pad = (4 - (data.length % 4)) % 4;
  const buf = pad ? Buffer.concat([data, Buffer.alloc(pad)]) : data;
  const words: number[] = [];
  for (let i = 0; i < buf.length; i += 4) words.push(buf.readUInt32LE(i));
  if (words.length % 2) words.push(0);
  return words;
}

function expandSchedule(words: number[], firstWord = 16): void {
  for (let index = firstWord; index < 64; index++) {
    const x = words[index - 2]!;
    const y = words[index - 15]!;
    const s1 = (x >>> 17) ^ (x << 15) ^ (x >>> 19) ^ (x << 13) ^ (x >>> 10);
    const s0 = (y >>> 7) ^ (y << 25) ^ (y >>> 18) ^ (y << 14) ^ (y >>> 3);
    words.push(u32(s1 + words[index - 7]! + s0 + words[index - 16]!));
  }
}

function sha256Rounds(state: number[], words: number[], firstRound = 0): number[] {
  let [a, b, c, d, e, f, g, h] = state;
  const constants = firstRound === 14 ? SHA256_BLOCK_K : SHA256_K;
  for (let index = firstRound; index < 64; index++) {
    const t1 = u32(h + rotXor(e, [6, 11, 25]) + (g ^ (e & (f ^ g))) + constants[index]! + words[index]!);
    const t2 = u32(rotXor(a, [2, 13, 22]) + ((a & b) | (c & (a | b))));
    [a, b, c, d, e, f, g, h] = [u32(t1 + t2), a, b, c, u32(d + t1), e, f, g];
  }
  return [a, b, c, d, e, f, g, h];
}

function sha256Init(data: Buffer): number[] {
  const words = Array(14).fill(0);
  words.push(data.readUIntBE(0, 3));
  words.push(data.readUInt32BE(3));
  for (let index = 16; index < 30; index++) {
    let value = SHA256_SCHEDULE[index - 16]!;
    if (index - 2 >= 14) {
      value += index === 16 ? sigma1(words[index - 2]!) ^ SHA256_SIGMA1_ADJUSTMENT : sigma1(words[index - 2]!);
    }
    if (index - 7 >= 14) value += words[index - 7]!;
    if (index - 15 >= 14) {
      value += index === 29 ? sigma0(words[index - 15]!) ^ SHA256_SIGMA0_ADJUSTMENT : sigma0(words[index - 15]!);
    }
    words.push(u32(value));
  }
  words.push(
    u32(
      sigma1(words[28]!) +
        words[23]! +
        sigma0(words[15]!) +
        words[14]! +
        SHA256_ADJUSTMENT -
        SHA256_K[14]!,
    ),
  );
  expandSchedule(words, 31);
  const working = sha256Rounds(SHA256_STATE, words, 14);
  return SHA256_INITIAL.map((value, i) => u32(value + working[i]!));
}

function sha256Digest(data: Buffer): Buffer {
  if (data.length < 7) throw new Error("Token salt must contain at least seven bytes");
  const length = 57 + data.length;
  const padLen = (((55 - length) % 64) + 64) % 64;
  const padded = Buffer.concat([
    data.subarray(7),
    Buffer.from([0x80]),
    Buffer.alloc(padLen),
    Buffer.alloc(8),
  ]);
  padded.writeBigUInt64BE(BigInt(length * 8), padded.length - 8);
  let state = sha256Init(data.subarray(0, 7));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words: number[] = [];
    for (let i = 0; i < 16; i++) words.push(padded.readUInt32BE(offset + i * 4));
    expandSchedule(words);
    const working = sha256Rounds(state, words);
    state = state.map((value, i) => u32(value + working[i]!));
  }
  const out = Buffer.alloc(32);
  state.forEach((value, i) => out.writeUInt32BE(value, i * 4));
  return out;
}

function cs64Digest(data: Buffer, digest: Buffer): [number, number] {
  let keyA = digest.readUInt32LE(0) | 1;
  let keyB = digest.readUInt32LE(4) | 1;
  const factors = [mul32(keyA, CS64_FACTOR), mul32(keyB, CS64_FACTOR)];
  const terms: number[] = [];
  const offsets: number[] = [];
  for (const [index, [coefficient, offset]] of CS64_COEFFICIENTS.entries()) {
    terms.push(mul32(coefficient, factors[index % 2]!));
    offsets.push(offset);
  }
  for (const [index, word] of wordsLe4Even(Buffer.concat([Buffer.from([0]), data])).entries()) {
    let term = mul32(word, index % 2 === 0 ? keyA : keyB);
    let offset = mul32(rol16(word), index % 2 === 0 ? 0xef0569fb : 0xc31713db);
    if (index === 0) {
      term = u32(term + mul32(CS64_ADJUSTMENT0, factors[0]!));
      offset = u32(offset + CS64_ADJUSTMENT1);
    }
    terms.push(term);
    offsets.push(offset);
  }
  let swapAcc = 0;
  let swapLast = 0;
  let state = 0;
  let acc = 0;
  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index]!;
    const y = terms[index + 1]!;
    let t = rol16(u32(offsets[index]! + x));
    let q = mul32(t, 0x76f50f34);
    swapAcc = u32(swapAcc + u32(mul32(rol16(q), 0xc3efea97) + q));
    t = rol16(u32(offsets[index + 1]! + y));
    q = mul32(t, 0x1881ce3c);
    swapLast = u32(mul32(rol16(q), 0x35bd1ec9) + q);
    swapAcc = u32(swapAcc + swapLast);
    state = u32(mul32(state, keyA) + x);
    state = mul32(rol16(state), 0xcf98b111);
    state = mul32(rol16(state), 0x87085b9f);
    state = mul32(rol16(state), 0x12ceb96d);
    state = mul32(rol16(state), 0x257e1d83);
    acc = u32(acc + state);
    t = u32(mul32(state, keyB) + y);
    t = mul32(rol16(t), 0xa27416f5);
    t = mul32(rol16(t), 0xd38396ff);
    state = mul32(rol16(mul32(rol16(t), 0x7c932b89)), 0xbfa49f69);
    acc = u32(acc + state);
  }
  return [swapLast ^ state, swapAcc ^ acc];
}

export function generateSecMsGecV2(unixTimestamp = Date.now() / 1000): string {
  let ticks = unixTimestamp + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= S_TO_NS / 100;
  const raw = Buffer.from(`${ticks.toFixed(0)}${EDGE_TRUSTED_CLIENT_TOKEN}`, "ascii");
  const digest = sha256Digest(raw);
  const [lo, hi] = cs64Digest(raw, digest);
  const cs64 = Buffer.alloc(8);
  cs64.writeUInt32LE(u32(lo), 0);
  cs64.writeUInt32LE(u32(hi), 4);
  return `${cs64.toString("hex").toUpperCase()}-${digest.toString("hex").toUpperCase()}`;
}
