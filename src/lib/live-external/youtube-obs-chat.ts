/** YouTube live chat popout for OBS Browser Source (native UI + custom CSS). */
export function youtubeLiveChatPopoutUrl(videoId: string): string {
  const id = videoId.trim();
  return `https://www.youtube.com/live_chat?is_popout=1&v=${encodeURIComponent(id)}`;
}

/** Public path — same stylesheet hosts copy in dashboard. */
export const YOUTUBE_OBS_CHAT_CSS_PATH = "/overlay/youtube-live-chat-obs.css";

export type YoutubeNativeObsChatSetup = {
  popoutUrl: string;
  cssPath: string;
  cssPublicUrl: string;
  steps: string[];
};

export function buildYoutubeNativeObsChatSetup(
  videoId: string,
  siteOrigin: string
): YoutubeNativeObsChatSetup {
  const popoutUrl = youtubeLiveChatPopoutUrl(videoId);
  const cssPublicUrl = `${siteOrigin.replace(/\/$/, "")}${YOUTUBE_OBS_CHAT_CSS_PATH}`;
  return {
    popoutUrl,
    cssPath: YOUTUBE_OBS_CHAT_CSS_PATH,
    cssPublicUrl,
    steps: [
      "OBS → 소스(+) → 브라우저",
      "URL에 YouTube 채팅 주소 붙여넣기",
      "「사용자 정의 CSS」에 CSS 붙여넣기",
      "배경 투명 ✓ · 너비 450 · 높이 700",
    ],
  };
}

/** One clipboard block: URL + instructions + full CSS for OBS custom CSS field. */
export function buildYoutubeObsSetupClipboard(popoutUrl: string, css: string): string {
  return `[MoCoMo · YouTube OBS 네이티브 채팅]

※ URL과 CSS는 OBS에서 서로 다른 칸에 넣으세요.

[URL란 — 아래 한 줄만]
${popoutUrl}

[사용자 정의 CSS란 — 아래 CSS 전체]
${css}

설정: 배경 투명 ✓ · 450×700 · OBS 30.2.3+
채팅 안 보이면: 소스 우클릭 → 새로고침`;
}
