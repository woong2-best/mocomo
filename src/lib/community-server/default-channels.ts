import type { CommunityChannelType } from "@prisma/client";

export type DefaultChannelSpec = {
  type: CommunityChannelType;
  name: string;
  slug: string;
  category: string;
  position: number;
  isDefault?: boolean;
  maxUsers?: number;
};

export const DEFAULT_SERVER_CHANNELS: DefaultChannelSpec[] = [
  { type: "POSTS", name: "게시글", slug: "posts", category: "일반", position: 0, isDefault: true },
  { type: "TEXT", name: "채팅", slug: "chat", category: "일반", position: 1 },
  { type: "ANNOUNCEMENT", name: "공지", slug: "announcements", category: "일반", position: 2 },
  { type: "QA", name: "Q&A", slug: "qa", category: "일반", position: 3 },
  { type: "GALLERY", name: "갤러리", slug: "gallery", category: "일반", position: 4 },
  { type: "FILE", name: "파일", slug: "files", category: "일반", position: 5 },
  { type: "VOICE", name: "음성 채널", slug: "voice", category: "음성", position: 0, maxUsers: 25 },
  { type: "VIDEO", name: "영상 채널", slug: "video", category: "음성", position: 1, maxUsers: 16 },
  { type: "LIVE", name: "라이브", slug: "live", category: "라이브", position: 0 },
  { type: "EVENT", name: "이벤트", slug: "events", category: "라이브", position: 1 },
  { type: "MEMBERS", name: "멤버", slug: "members", category: "정보", position: 0 },
  { type: "SETTINGS", name: "설정", slug: "settings", category: "정보", position: 1 },
];

export const DEFAULT_SERVER_ROLES = [
  { type: "OWNER" as const, name: "Owner", color: "#f59e0b", position: 0 },
  { type: "ADMIN" as const, name: "Admin", color: "#ef4444", position: 1 },
  { type: "MODERATOR" as const, name: "Moderator", color: "#22c55e", position: 2 },
  { type: "VIP" as const, name: "VIP", color: "#a855f7", position: 3 },
  { type: "MEMBER" as const, name: "Member", color: "#94a3b8", position: 4, isDefault: true },
];
