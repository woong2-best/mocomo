import { db } from "../src/lib/db";
import { purgeForbiddenAdminSequenceUsers } from "../src/lib/forbidden-admin-sequence";

async function main() {
  const result = await purgeForbiddenAdminSequenceUsers(db);
  console.log(
    `Scanned ${result.scanned} users, deleted ${result.deleted}${
      result.usernames.length ? `: ${result.usernames.join(", ")}` : ""
    }`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
