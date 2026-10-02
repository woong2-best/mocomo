import type { AccountStatus } from "@prisma/client";

export const ACCOUNT_SUSPENDED_POST_MESSAGE =
  "Your account is suspended and can't post.";
export const ACCOUNT_SUSPENDED_LIKE_MESSAGE =
  "Your account is suspended and can't like posts.";
export const ACCOUNT_SUSPENDED_WRITE_MESSAGE =
  "Your account is suspended and can't perform this action.";
export const ACCOUNT_SUSPENDED_SIGNUP_MESSAGE =
  "You can't create a new account with information linked to a suspended account.";

export type AccountWriteKind =
  | "default"
  | "report"
  | "notification"
  | "appeal"
  | "comment"
  | "dm"
  | "live";

export function isServiceBanned(user: {
  isBanned?: boolean | null;
  accountStatus?: AccountStatus | null;
}): boolean {
  return Boolean(user.isBanned) || user.accountStatus === "BANNED";
}

export function isReadOnlySuspended(status?: AccountStatus | null): boolean {
  return (
    status === "READ_ONLY" ||
    status === "TEMP_SUSPENDED" ||
    status === "PERMANENT_SUSPENDED"
  );
}

export function isSuspendedReadOnly(user: {
  isBanned?: boolean | null;
  accountStatus?: AccountStatus | null;
}): boolean {
  if (isServiceBanned(user)) return false;
  return isReadOnlySuspended(user.accountStatus);
}

export function isLimitedAccount(status?: AccountStatus | null): boolean {
  return status === "LIMITED";
}

export function assertAccountCanWrite(
  user: {
    isBanned?: boolean | null;
    accountStatus?: AccountStatus | null;
  },
  kind: AccountWriteKind = "default"
): void {
  if (isServiceBanned(user)) throw new Error("BANNED");
  if (kind === "report" || kind === "notification" || kind === "appeal") return;
  if (isReadOnlySuspended(user.accountStatus)) throw new Error("ACCOUNT_SUSPENDED");
  if (isLimitedAccount(user.accountStatus)) {
    if (kind === "comment" || kind === "dm" || kind === "live") {
      throw new Error("ACCOUNT_LIMITED");
    }
  }
}

export function accountStatusLabel(status: AccountStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Normal";
    case "LIMITED":
      return "Partial restrictions";
    case "READ_ONLY":
      return "Read-only";
    case "TEMP_SUSPENDED":
      return "Temporarily suspended";
    case "PERMANENT_SUSPENDED":
      return "Permanent suspension";
    case "BANNED":
      return "Banned";
    default:
      return status;
  }
}

export function appealStatusLabel(status: string): string {
  switch (status) {
    case "RECEIVED":
      return "Received";
    case "UNDER_REVIEW":
      return "Under review";
    case "INFO_REQUESTED":
      return "Additional info requested";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Denied";
    case "CLOSED":
      return "Ended";
    default:
      return status;
  }
}

export const OPEN_APPEAL_STATUSES = [
  "RECEIVED",
  "UNDER_REVIEW",
  "INFO_REQUESTED",
] as const;

export function suspensionBlocksSignup(status?: AccountStatus | null, isBanned?: boolean): boolean {
  if (isBanned || status === "BANNED") return true;
  return (
    status === "PERMANENT_SUSPENDED" ||
    status === "READ_ONLY" ||
    status === "TEMP_SUSPENDED"
  );
}
