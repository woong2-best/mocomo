import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";

const DIR = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}vrm-stills/`;

const ALIAS: Record<string, string> = {
  zelie: "zelie",
  moco: "zelie",
  cleo: "cleo",
  airi: "cleo",
  mio: "mio",
  chloe: "mio",
  nangnang: "nangnang",
  stella: "nangnang",
};

const memory = new Map<string, string>();
const listeners = new Set<() => void>();
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

export function canonicalVrmId(id: string): string {
  return ALIAS[id.trim().toLowerCase()] ?? "zelie";
}

function stillPath(id: string): string {
  return `${DIR}${id}.jpg`;
}

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeVrmStills(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function vrmStillUri(characterId: string): string | null {
  return memory.get(canonicalVrmId(characterId)) ?? null;
}

export function hydrateVrmStills(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const info = await FileSystem.getInfoAsync(DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
      }
      for (const id of ["zelie", "cleo", "mio", "nangnang"]) {
        const path = stillPath(id);
        const file = await FileSystem.getInfoAsync(path);
        if (file.exists) memory.set(id, path);
      }
    } catch {
      /* stills are optional — the live VRM remains the source of truth */
    }
    hydrated = true;
    emit();
  })();
  return hydratePromise;
}

export async function saveVrmStill(characterId: string, dataUrl: string): Promise<void> {
  const id = canonicalVrmId(characterId);
  const match = /^data:image\/(?:jpeg|jpg|png);base64,(.+)$/i.exec(dataUrl.trim());
  const bytes = match?.[1];
  if (!bytes) return;
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => undefined);
  const path = stillPath(id);
  await FileSystem.writeAsStringAsync(path, bytes, {
    encoding: FileSystem.EncodingType.Base64,
  });
  memory.set(id, path);
  emit();
}

export function useVrmStill(characterId: string): string | null {
  const id = canonicalVrmId(characterId);
  const [uri, setUri] = useState(() => memory.get(id) ?? null);
  useEffect(() => {
    void hydrateVrmStills();
    const sync = () => setUri(memory.get(id) ?? null);
    sync();
    return subscribeVrmStills(sync);
  }, [id]);
  return uri;
}
