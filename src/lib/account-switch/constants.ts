export const ACCOUNT_SWITCH_STORAGE_KEY = "mocomo_saved_accounts";
export const MAX_SAVED_ACCOUNTS = 10;
export const ADD_ACCOUNT_COOKIE = "mocomo_add_account";

export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}
