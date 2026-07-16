"use server";

/** @deprecated use admin-security actions — kept for import compatibility */
export {
  adminLogoutMfaAction,
  adminMfaAfterPasswordAction as adminIssueMfaAction,
  adminTotpAuthVerifyAction as adminVerifyMfaAction,
} from "@/actions/admin-security";
