/** Dev-only IAP bypass — never enabled in production */
export function iapDevVerifyEnabled(): boolean {
  if (process.env.APT_IAP_DEV_VERIFY !== "true") return false;
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    console.error("[IAP] APT_IAP_DEV_VERIFY is disabled in production");
    return false;
  }
  return true;
}
