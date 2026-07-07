export type StickerItem = {
  id: string;
  label: string;
  /** image URL or emoji character */
  src: string;
  kind: "image" | "emoji";
  width?: number;
  height?: number;
};

export type StickerCategory = {
  id: string;
  label: string;
  items: StickerItem[];
};

/** Built-in sticker catalog (emoji uses Unicode, images are lightweight SVG) */
export const STICKER_MANIFEST: StickerCategory[] = [
  {
    id: "reaction",
    label: "Reaction",
    items: [
      { id: "r1", label: "👍", src: "👍", kind: "emoji" },
      { id: "r2", label: "😂", src: "😂", kind: "emoji" },
      { id: "r3", label: "🔥", src: "🔥", kind: "emoji" },
      { id: "r4", label: "💯", src: "💯", kind: "emoji" },
      { id: "r5", label: "😭", src: "😭", kind: "emoji" },
      { id: "r6", label: "✨", src: "✨", kind: "emoji" },
    ],
  },
  {
    id: "heart",
    label: "Heart",
    items: [
      { id: "h1", label: "❤️", src: "❤️", kind: "emoji" },
      { id: "h2", label: "💕", src: "💕", kind: "emoji" },
      { id: "h3", label: "💖", src: "💖", kind: "emoji" },
      { id: "h4", label: "💘", src: "💘", kind: "emoji" },
    ],
  },
  {
    id: "cute",
    label: "Cute",
    items: [
      { id: "c1", label: "🌸", src: "🌸", kind: "emoji" },
      { id: "c2", label: "🐱", src: "🐱", kind: "emoji" },
      { id: "c3", label: "🎀", src: "🎀", kind: "emoji" },
      { id: "c4", label: "🍓", src: "🍓", kind: "emoji" },
    ],
  },
  {
    id: "gaming",
    label: "Gaming",
    items: [
      { id: "g1", label: "🎮", src: "🎮", kind: "emoji" },
      { id: "g2", label: "👾", src: "👾", kind: "emoji" },
      { id: "g3", label: "🏆", src: "🏆", kind: "emoji" },
      { id: "g4", label: "⚔️", src: "⚔️", kind: "emoji" },
    ],
  },
  {
    id: "meme",
    label: "Meme",
    items: [
      { id: "m1", label: "💀", src: "💀", kind: "emoji" },
      { id: "m2", label: "🗿", src: "🗿", kind: "emoji" },
      { id: "m3", label: "🤡", src: "🤡", kind: "emoji" },
      { id: "m4", label: "👀", src: "👀", kind: "emoji" },
    ],
  },
  {
    id: "anime",
    label: "Anime",
    items: [
      { id: "a1", label: "⭐", src: "⭐", kind: "emoji" },
      { id: "a2", label: "🌙", src: "🌙", kind: "emoji" },
      { id: "a3", label: "⚡", src: "⚡", kind: "emoji" },
      { id: "a4", label: "🎌", src: "🎌", kind: "emoji" },
    ],
  },
  {
    id: "arrow",
    label: "Arrow",
    items: [
      {
        id: "arr-r",
        label: "→",
        kind: "image",
        src: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><path d="M0 20h90M70 5l25 15-25 15" fill="none" stroke="%23ff3366" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
        width: 120,
        height: 40,
      },
      {
        id: "arr-u",
        label: "↑",
        kind: "image",
        src: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 120"><path d="M20 120V30M5 50l15-20 15 20" fill="none" stroke="%233b82f6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
        width: 40,
        height: 120,
      },
    ],
  },
  {
    id: "speech",
    label: "Speech",
    items: [
      {
        id: "sp1",
        label: "말풍선",
        kind: "image",
        src: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect x="8" y="8" width="184" height="72" rx="16" fill="%23fff" stroke="%23333" stroke-width="4"/><polygon points="40,80 24,112 64,80" fill="%23fff" stroke="%23333" stroke-width="4"/></svg>'),
        width: 200,
        height: 120,
      },
    ],
  },
  {
    id: "pixel",
    label: "Pixel",
    items: [
      { id: "p1", label: "👾", src: "👾", kind: "emoji" },
      { id: "p2", label: "🕹️", src: "🕹️", kind: "emoji" },
    ],
  },
  {
    id: "kawaii",
    label: "Kawaii",
    items: [
      { id: "k1", label: "🥺", src: "🥺", kind: "emoji" },
      { id: "k2", label: "💗", src: "💗", kind: "emoji" },
      { id: "k3", label: "🧸", src: "🧸", kind: "emoji" },
    ],
  },
];
