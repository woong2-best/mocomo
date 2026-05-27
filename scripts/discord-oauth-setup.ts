/**
 * Discord OAuth 설정 안내 + (선택) Vercel 환경 변수 등록
 *
 * 사용:
 *   npx tsx scripts/discord-oauth-setup.ts
 *   npx tsx scripts/discord-oauth-setup.ts --id=CLIENT_ID --secret=CLIENT_SECRET
 */

import { spawnSync } from "child_process";

const PROD_URL = process.env.AUTH_URL?.trim() || "https://mocomo.net";
const LOCAL_URL = "http://localhost:3000";

function main() {
  console.log("\n=== MoCoMo Discord OAuth 설정 ===\n");
  console.log("1) https://discord.com/developers/applications → New Application");
  console.log("2) OAuth2 → Redirects 에 아래 URL을 모두 추가:\n");
  console.log(`   ${LOCAL_URL}/api/auth/callback/discord`);
  console.log(`   ${PROD_URL}/api/auth/callback/discord\n`);
  console.log("3) OAuth2 → Client ID / Client Secret 복사");
  console.log("4) Vercel → Settings → Environment Variables (Production + Preview):\n");
  console.log("   AUTH_DISCORD_ID     = Client ID");
  console.log("   AUTH_DISCORD_SECRET = Client Secret\n");
  console.log("5) 저장 후 Redeploy (또는: vercel --prod)\n");
  console.log("확인: https://mocomo.net/auth/signup 에 「Discord로 가입」 버튼 표시\n");

  const idArg = process.argv.find((a) => a.startsWith("--id="))?.split("=")[1];
  const secretArg = process.argv.find((a) => a.startsWith("--secret="))?.split("=")[1];

  if (idArg && secretArg) {
    console.log("Vercel CLI로 Production 환경 변수 등록 시도...\n");
    const add = (name: string, value: string) =>
      spawnSync("vercel", ["env", "add", name, "production"], {
        input: value,
        encoding: "utf-8",
        stdio: ["pipe", "inherit", "inherit"],
      });

    const a = add("AUTH_DISCORD_ID", idArg);
    const b = add("AUTH_DISCORD_SECRET", secretArg);
    if (a.status !== 0 || b.status !== 0) {
      console.error("Vercel CLI 등록 실패. 대시보드에서 수동으로 추가하세요.");
      process.exit(1);
    }
    console.log("\n완료. Preview에도 동일하게 추가한 뒤 vercel --prod 로 배포하세요.\n");
  } else {
    console.log(
      "자동 등록: npx tsx scripts/discord-oauth-setup.ts --id=YOUR_CLIENT_ID --secret=YOUR_CLIENT_SECRET\n"
    );
  }
}

main();
