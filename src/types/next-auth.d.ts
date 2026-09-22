import type { SupportTierLevel } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    isBanned?: boolean;
    username?: string;
    role?: string;
    premiumTier?: string;
    locale?: string;
    countryCode?: string;
    timeZone?: string;
    supportTierSent?: SupportTierLevel;
    earnedMocoTier?: SupportTierLevel;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      username?: string;
      role?: string;
      premiumTier?: string;
      locale?: string;
      countryCode?: string;
      timeZone?: string;
      isBanned?: boolean;
      accountStatus?: string;
      isSuspendedReadOnly?: boolean;
      isDeleted?: boolean;
      isOperator?: boolean;
      isStaff?: boolean;
      /** 관리자 웹 세션 시작(unix sec). 이 시각 + 1시간에 로그아웃. */
      adminSessionStartedAt?: number;
      supportTierSent?: SupportTierLevel;
      earnedMocoTier?: SupportTierLevel;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: string;
    premiumTier?: string;
    locale?: string;
    countryCode?: string;
    timeZone?: string;
    isBanned?: boolean;
    accountStatus?: string;
    isSuspendedReadOnly?: boolean;
    isDeleted?: boolean;
    isOperator?: boolean;
    isStaff?: boolean;
    /** 관리자 웹 세션 시작(unix sec). 활동으로 연장하지 않음. */
    adminSessionStartedAt?: number;
    supportTierSent?: SupportTierLevel;
    earnedMocoTier?: SupportTierLevel;
  }
}
