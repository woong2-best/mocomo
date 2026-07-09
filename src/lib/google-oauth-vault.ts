/**
 * @deprecated Use `@/lib/oauth-vault` — Google-specific re-exports for backward compatibility.
 */
export {
  OAUTH_VAULT_PROVIDERS,
  decryptOAuthPayload as decryptGoogleOAuthPayload,
  encryptOAuthPayload as encryptGoogleOAuthPayload,
  findOAuthAccountBySub as findGoogleAccountBySub,
  findUserIdByOAuthEmail as findUserIdByGoogleEmail,
  hydrateUserOAuthProfile as hydrateUserGoogleProfile,
  isOAuthAccountEncrypted as isGoogleAccountEncrypted,
  isOAuthVaultProvider,
  migratePlainOAuthAccount as migratePlainGoogleAccount,
  oauthSubLookupHash as googleSubLookupHash,
  persistEncryptedOAuthAccount as persistEncryptedGoogleAccount,
  type OAuthAccountRow as GoogleAccountRow,
  type OAuthVaultPayload as GoogleOAuthPayload,
} from "@/lib/oauth-vault";

export const GOOGLE_OAUTH_PROVIDER = "google" as const;
