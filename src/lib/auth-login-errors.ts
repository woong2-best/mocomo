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
      return "Email isn't verified yet. Use the link in your email or request verification again under Email verification.";
    case "rate_limited":
      return "Too many sign-in attempts. Try again in 15 minutes.";
    case "banned":
      return "This account is restricted.";
    case "account_deleted":
      return "This account was deleted. The recovery period has passed or it was permanently removed.";
    case "account_pending_recovery":
      return "Deletion is pending. Sign in within 30 days to cancel deletion and restore your account.";
    case "oauth_only":
      return "This email is registered with Discord, Google, LINE, or similar. Use social sign-in below.";
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "Configuration":
      return "Sign-in configuration error. Try again later or use social sign-in.";
    default:
      return fallback ?? "Sign-in failed. Please try again.";
  }
}
