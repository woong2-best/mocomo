import { execSync } from "child_process";
import fs from "fs";

const REF = "a572ffa";
const FILES = [
  "src/actions/admin-economy-config.ts",
  "src/actions/admin-economy-flags.ts",
  "src/actions/admin-flea.ts",
  "src/actions/apt-bondee.ts",
  "src/actions/apt-daily.ts",
  "src/actions/apt-economy.ts",
  "src/actions/apt-game.ts",
  "src/actions/apt-iap.ts",
  "src/actions/apt-market.ts",
  "src/actions/monetization.ts",
  "studio/actions/checkout.ts",
];

const IMPORT_LINE = `import { revalidateAptHub } from "@/lib/apt/revalidate-hub";`;

function restoreAndPatch(file) {
  const content = execSync(`git show ${REF}:${file}`, { encoding: "utf8" });
  let next = content;

  if (!next.includes('revalidatePath("/apt")')) {
    fs.writeFileSync(file, next, "utf8");
    console.log(`restored (no apt revalidate): ${file}`);
    return;
  }

  if (!next.includes(IMPORT_LINE)) {
    next = next.replace(
      /import \{ revalidatePath \} from "next\/cache";\r?\n/,
      `import { revalidatePath } from "next/cache";\n${IMPORT_LINE}\n`,
    );
  }

  next = next.replaceAll('revalidatePath("/apt")', "revalidateAptHub()");
  fs.writeFileSync(file, next, "utf8");
  console.log(`restored + patched: ${file}`);
}

for (const file of FILES) restoreAndPatch(file);
