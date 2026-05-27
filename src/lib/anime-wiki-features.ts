/** 애니 위키 안내 — 나무위키 스타일 구조 */

export type WikiFeatureStatus = "live" | "partial" | "planned";

export type WikiFeatureItem = {
  label: string;
  status: WikiFeatureStatus;
  href?: string;
};

export type WikiFeatureSection = {
  id: string;
  title: string;
  items: WikiFeatureItem[];
  example?: string;
  blocks?: { title: string; lines: string[] }[];
};

export const ANIME_WIKI_SECTIONS: WikiFeatureSection[] = [
  {
    id: "main",
    title: "메인 구조",
    items: [
      { label: "상단 검색창", status: "live", href: "/search" },
      { label: "실시간 인기 문서", status: "live", href: "/anime/popular" },
      { label: "최근 수정 문서", status: "live", href: "/anime/recent" },
      { label: "랜덤 문서", status: "live", href: "/anime/random" },
      { label: "공지사항", status: "partial", href: "/" },
      { label: "로그인 / 회원가입", status: "live", href: "/auth/signin" },
    ],
  },
  {
    id: "docs",
    title: "문서 시스템",
    items: [
      { label: "누구나 문서 생성 가능", status: "live", href: "/anime/new" },
      { label: "문서 수정 가능", status: "live" },
      { label: "수정 기록 저장", status: "planned" },
      { label: "이전 버전 복구 가능", status: "planned" },
      { label: "문서 링크 연결 기능", status: "planned" },
    ],
    example: "[[문서명]]",
  },
  {
    id: "edit",
    title: "편집 기능",
    items: [
      { label: "실시간 미리보기", status: "planned" },
      { label: "이미지 삽입 (URL)", status: "live" },
      { label: "유튜브 삽입", status: "planned" },
      { label: "표 기능", status: "planned" },
      { label: "접기 기능", status: "planned" },
      { label: "각주 기능", status: "planned" },
      { label: "모바일 편집 지원", status: "live" },
    ],
  },
  {
    id: "talk",
    title: "토론 시스템",
    items: [
      { label: "문서별 토론 가능 (커뮤니티 탭)", status: "partial" },
      { label: "댓글 작성", status: "live" },
      { label: "신고 기능", status: "live" },
      { label: "관리자 중재 가능", status: "live" },
    ],
  },
  {
    id: "user",
    title: "사용자 기능",
    items: [
      { label: "프로필 페이지", status: "live", href: "/settings" },
      { label: "활동 기록", status: "partial" },
      { label: "작성 문서 목록", status: "planned" },
      { label: "알림 기능", status: "partial", href: "/messages" },
    ],
  },
  {
    id: "roles",
    title: "권한 시스템",
    items: [
      { label: "일반 사용자", status: "live" },
      { label: "인증 사용자", status: "live" },
      { label: "관리자", status: "live" },
      { label: "운영진", status: "live" },
      { label: "문서 보호", status: "planned" },
      { label: "사용자 차단", status: "live" },
      { label: "게시물 삭제", status: "live" },
      { label: "편집 제한", status: "partial" },
    ],
  },
  {
    id: "search",
    title: "검색 기능",
    items: [
      { label: "자동완성", status: "planned" },
      { label: "제목 검색", status: "live", href: "/search" },
      { label: "내용 검색", status: "partial", href: "/search" },
      { label: "인기 검색어 표시", status: "planned" },
    ],
  },
  {
    id: "media",
    title: "미디어 기능",
    items: [
      { label: "이미지 업로드", status: "planned" },
      { label: "WebP 최적화", status: "planned" },
      { label: "용량 제한", status: "planned" },
      { label: "부적절 이미지 감지", status: "planned" },
    ],
  },
  {
    id: "special",
    title: "특수 페이지",
    items: [
      { label: "최근 변경", status: "live", href: "/anime/recent" },
      { label: "인기 문서", status: "live", href: "/anime/popular" },
      { label: "신규 문서", status: "live", href: "/anime/newest" },
      { label: "랜덤 문서", status: "live", href: "/anime/random" },
      { label: "삭제 요청", status: "partial" },
    ],
  },
  {
    id: "mobile",
    title: "모바일 지원",
    items: [
      { label: "반응형 UI", status: "live" },
      { label: "다크모드", status: "live" },
      { label: "하단 메뉴바", status: "live" },
      { label: "빠른 편집 버튼", status: "live" },
    ],
  },
  {
    id: "stack",
    title: "시스템 구조",
    blocks: [
      {
        title: "Frontend",
        lines: ["Next.js", "Tailwind CSS", "TypeScript"],
      },
      {
        title: "Backend",
        lines: ["Node.js", "Prisma", "PostgreSQL"],
      },
      {
        title: "Storage",
        lines: ["Cloudflare R2"],
      },
      {
        title: "Deploy",
        lines: ["Vercel", "Cloudflare"],
      },
    ],
    items: [],
  },
];
