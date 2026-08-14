/** @deprecated Apick 1원 계좌 인증 — bank-verification.ts 사용 */
export {
  getBankVerificationStatus as getPhoneVerificationStatus,
  clearUsedMarketBankPending as clearUsedMarketPhonePending,
  sendUsedMarketBankVerification as sendUsedMarketPhoneOtp,
  verifyUsedMarketBankCode as verifyUsedMarketPhoneOtp,
  sendSellerBankVerification as sendSellerPhoneOtp,
  verifySellerBankCode as verifySellerPhoneOtp,
  sendSellerBankVerification as sendSellerSignupPhoneOtp,
  verifySellerBankCode as verifySellerSignupPhoneOtp,
  getBankVerificationStatus,
  clearUsedMarketBankPending,
  sendUsedMarketBankVerification,
  verifyUsedMarketBankCode,
  sendSellerBankVerification,
  verifySellerBankCode,
} from "@/actions/bank-verification";
