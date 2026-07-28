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
  }
}
