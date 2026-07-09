import { db } from "../src/lib/db";
import { isOAuthEncryptionConfigured } from "../src/lib/encryption";
import {
  isOAuthAccountEncrypted,
  migratePlainOAuthAccount,
  OAUTH_VAULT_PROVIDERS,
} from "../src/lib/oauth-vault";

const BATCH = 50;

async function main() {
  if (!isOAuthEncryptionConfigured()) {
    console.error("OAUTH_ENCRYPTION_KEY is required. Set it in .env and retry.");
    process.exit(1);
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const provider of OAUTH_VAULT_PROVIDERS) {
    let cursor: string | undefined;
    console.log(`\n--- ${provider} ---`);

    for (;;) {
      const accounts = await db.account.findMany({
        where: {
          provider,
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take: BATCH,
        select: {
          id: true,
          userId: true,
          provider: true,
          providerAccountId: true,
          googleSubHash: true,
          googleEmailHash: true,
          encryptedGoogleData: true,
          encryptionIv: true,
          encryptionAuthTag: true,
          encryptionKeyId: true,
          access_token: true,
          refresh_token: true,
          id_token: true,
        },
      });

      if (accounts.length === 0) break;

      for (const account of accounts) {
        cursor = account.id;
        if (isOAuthAccountEncrypted(account)) {
          skipped += 1;
          continue;
        }

        const ok = await migratePlainOAuthAccount(account);
        if (ok) {
          migrated += 1;
          console.log(`Encrypted ${provider} account ${account.id}`);
        } else {
          failed += 1;
          console.warn(`Failed ${provider} account ${account.id}`);
        }
      }
    }
  }

  console.log(`\nDone. migrated=${migrated} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
