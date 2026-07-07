import { CredentialsSignin } from "next-auth";

export class LoginInvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export class LoginEmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

export class LoginRateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

export class LoginBannedError extends CredentialsSignin {
  code = "banned";
}

export class LoginAccountDeletedError extends CredentialsSignin {
  code = "account_deleted";
}

export class LoginAccountPendingRecoveryError extends CredentialsSignin {
  code = "account_pending_recovery";
}

export class LoginOAuthOnlyError extends CredentialsSignin {
  code = "oauth_only";
}

export function loginErrorMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case "email_not_verified":
      return "이메일 인증이 완료되지 않았습니다. 받은 메일의 링크를 누르거나 「이메일 인증」에서 다시 요청해 주세요.";
    case "rate_limited":
      return "로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.";
    case "banned":
      return "이 계정은 이용이 제한되어 있습니다.";
    case "account_deleted":
      return "탈퇴한 계정입니다. 복구 기간이 지났거나 영구 삭제되었습니다.";
    case "account_pending_recovery":
      return "탈퇴 처리되었습니다. 내일부터 50일간 로그인하면 계정을 복구할 수 있습니다.";
    case "oauth_only":
      return "이 이메일은 Discord·Google로 가입된 계정입니다. 아래 소셜 로그인을 사용해 주세요.";
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "Configuration":
      return "로그인 설정 오류입니다. 잠시 후 다시 시도하거나 소셜 로그인을 이용해 주세요.";
    default:
      return fallback ?? "로그인에 실패했습니다. 다시 시도해 주세요.";
  }
}
