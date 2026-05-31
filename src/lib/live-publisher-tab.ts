/** 브라우저 탭 단위 송출 세션 ID (기기·탭마다 하나) */

export const LIVE_PUBLISHER_TAB_HEADER = "x-mocomo-live-tab";
const STORAGE_KEY = "mocomo_live_publisher_tab_id";

export function getOrCreatePublisherTabId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function livePublisherFetch(input: string, init?: RequestInit): Promise<Response> {
  const tabId = getOrCreatePublisherTabId();
  const headers = new Headers(init?.headers);
  if (tabId) headers.set(LIVE_PUBLISHER_TAB_HEADER, tabId);
  return fetch(input, { ...init, headers, credentials: init?.credentials ?? "include" });
}
