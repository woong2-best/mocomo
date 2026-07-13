import type { AccountStatus } from "@prisma/client";

export const ACCOUNT_SUSPENDED_POST_MESSAGE =
  "계정이 정지되어 게시물을 작성할 수 없습니다.";
export const ACCOUNT_SUSPENDED_LIKE_MESSAGE =
  "계정이 정지되어 좋아요를 누를 수 없습니다.";
export const ACCOUNT_SUSPENDED_WRITE_MESSAGE =
  "계정이 정지되어 이 작업을 수행할 수 없습니다.";
export const ACCOUNT_SUSPENDED_SIGNUP_MESSAGE =
  "정지된 계정과 연결된 정보로는 새로운 계정을 생성할 수 없습니다.";

export type AccountWriteKind = "default" | "report" | "notification" | "appeal";

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
}

export function accountStatusLabel(status: AccountStatus): string {
  switch (status) {
    case "ACTIVE":
      return "정상";
    case "LIMITED":
      return "일부 제한";
    case "READ_ONLY":
      return "읽기 전용";
    case "TEMP_SUSPENDED":
      return "일시 정지";
    case "PERMANENT_SUSPENDED":
      return "영구 정지";
    case "BANNED":
      return "이용 금지";
    default:
      return status;
  }
}

export function appealStatusLabel(status: string): string {
  switch (status) {
    case "RECEIVED":
      return "접수됨";
    case "UNDER_REVIEW":
      return "검토 중";
    case "INFO_REQUESTED":
      return "추가 자료 요청";
    case "APPROVED":
      return "승인";
    case "REJECTED":
      return "기각";
    case "CLOSED":
      return "종료됨";
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
