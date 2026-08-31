import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "@mocomo/msg-composer/";

export type MessageComposerPrefs = {
  fanArtSellHidden: boolean;
};

const DEFAULT_PREFS: MessageComposerPrefs = {
  fanArtSellHidden: false,
};

function storageKey(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

export async function loadMessageComposerPrefs(userId: string): Promise<MessageComposerPrefs> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<MessageComposerPrefs>;
    return {
      fanArtSellHidden: parsed.fanArtSellHidden === true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function saveMessageComposerPrefs(
  userId: string,
  patch: Partial<MessageComposerPrefs>
): Promise<MessageComposerPrefs> {
  const current = await loadMessageComposerPrefs(userId);
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
}

export async function setFanArtSellHidden(userId: string, hidden: boolean) {
  return saveMessageComposerPrefs(userId, { fanArtSellHidden: hidden });
}
