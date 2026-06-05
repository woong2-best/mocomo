import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 한글 등 비라틴 태그명 → 고유 slug */
export function tagSlugFromName(name: string): string {
  const base = slugify(name);
  if (base.length >= 2) return base;
  const trimmed = name.trim();
  if (!trimmed) return "";
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0;
  }
  return `t-${hash.toString(36)}`;
}

export function calcHotScore(likes: number, comments: number, createdAt: Date): number {
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return likes * 2 + comments * 1.5 - ageHours * 0.5;
}

export function calcPlatformFee(amount: number, rate = 0.1): number {
  return Math.floor(amount * rate);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function xpForLevel(level: number): number {
  return level * 100 + (level - 1) * 50;
}
