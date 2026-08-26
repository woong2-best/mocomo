/** YouTube live chat popout for OBS Browser Source (native UI + custom CSS). */
export function youtubeLiveChatPopoutUrl(videoId: string): string {
  const id = videoId.trim();
  return `https://www.youtube.com/live_chat?v=${encodeURIComponent(id)}&is_popout=1`;
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
      "OBS → 소스 추가 → 브라우저",
      `URL에 YouTube 채팅 팝아웃 주소 붙여넣기`,
      "「사용자 정의 CSS」란에 CSS 전체 붙여넣기 (아래 복사)",
      "너비 400~500, 높이 600~800 · 배경 투명 체크",
    ],
  };
}
