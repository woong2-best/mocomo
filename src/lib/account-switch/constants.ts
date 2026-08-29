export { sessionCookieName } from "@/lib/account-switch/session-cookies";

export const ACCOUNT_SWITCH_STORAGE_KEY = "mocomo_saved_accounts";
export const MAX_SAVED_ACCOUNTS = 10;
export const ADD_ACCOUNT_COOKIE = "mocomo_add_account";
/** User id logged out when starting add-account signup — detect stale session after OAuth. */
export const ADD_ACCOUNT_SOURCE_USER_COOKIE = "mocomo_add_account_from";
