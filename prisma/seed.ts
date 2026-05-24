import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("✅ MoCoMo DB ready.");
  console.log("   회원가입: /auth/signup");
  console.log("   결제: .env에 TOSS_SECRET_KEY, NEXT_PUBLIC_TOSS_CLIENT_KEY 설정");
  console.log("   라이브: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL");
  console.log("   업로드: S3_* 또는 로컬 public/uploads (개발)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
