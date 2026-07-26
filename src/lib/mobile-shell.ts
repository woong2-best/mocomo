/** 모바일·태블릿 앱 셸 — 높이·패딩·하단 네비 표시 규칙
 *  lg(1024px) 이상: 좌측 사이드바 + 우측 패널 (PC·노트북)
 *  lg 미만: 상단 로고+메뉴 버튼 + 하단 탭 (스마트폰·태블릿)
 */

import { APT_GAME_PATH, REELS_PATH } from "@/lib/site-routes";

export const HEADER_REM = "3.5rem";
export const MOBILE_NAV_REM = "3.5rem";

const USED_SECTION_PATHS = new Set(["new", "my", "verify", "adult-verify"]);

/** /used/[id] 상세 (글쓰기·인증 페이지 제외) */
export function isUsedDetailPath(pathname: string): boolean {
  const match = pathname.match(/^\/used\/([^/]+)$/);
  if (!match) return false;
  return !USED_SECTION_PATHS.has(match[1]);
}

/** 하단 탭 숨김 — 채팅방·중고 상세·라이브 방·APT 몰입 등 자체 하단 UI */
export function shouldHideMobileNav(pathname: string): boolean {
  if (/^\/messages\/[^/]+$/.test(pathname)) return true;
  if (/^\/c\/[^/]+/.test(pathname)) return true;
  if (isUsedDetailPath(pathname)) return true;
  if (/^\/voice\/[^/]+$/.test(pathname) && pathname !== "/voice/new") return true;
  if (pathname === "/discover") return true;
  if (pathname === APT_GAME_PATH) return true;
  if (pathname === REELS_PATH || pathname.startsWith(`${REELS_PATH}/`)) return true;
  return false;
}

/** 메인 스크롤 영역 하단 패딩 */
export function mainScrollPaddingClass(pathname: string): string {
  if (shouldHideMobileNav(pathname)) return "pb-safe lg:pb-0";
  return "pb-nav lg:pb-0";
}

/** 중고거래 섹션 헤더(경매·글쓰기 버튼) 숨김 */
export function shouldHideUsedSectionHeader(pathname: string): boolean {
  return isUsedDetailPath(pathname);
}
