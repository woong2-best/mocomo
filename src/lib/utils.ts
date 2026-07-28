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

function hashSlug(prefix: string, source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return `${prefix}-${hash.toString(36)}`;
}

/** 한글 등 비라틴 태그명 → 고유 slug */
export function tagSlugFromName(name: string): string {
  const base = slugify(name);
  if (base.length >= 2) return base;
  const trimmed = name.trim();
  if (!trimmed) return "";
  return hashSlug("t", trimmed);
}

/** 애니 위키 글 slug — 영문 부제 우선, 한글 제목은 해시 fallback */
export function animeSlugFromTitle(title: string, titleEn?: string | null): string {
  const en = titleEn?.trim();
  if (en) {
    const fromEn = slugify(en);
    if (fromEn.length >= 2) return fromEn;
  }
  const fromTitle = slugify(title);
  if (fromTitle.length >= 2) return fromTitle;
  const source = en || title.trim();
  if (!source) return hashSlug("anime", String(Date.now()));
  return hashSlug("a", source);
}

export function isValidAnimeSlug(slug: string): boolean {
  return slug.length >= 2 && /^[a-z0-9-]+$/i.test(slug);
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

