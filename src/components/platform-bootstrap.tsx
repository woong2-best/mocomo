import { ensurePlatformBootstrap } from "@/lib/platform-bootstrap";
import { db } from "@/lib/db";

/** 배포/첫 접속 시 DB에 광고·카탈로그 시드 자동 생성 */
export async function PlatformBootstrap() {
  try {
    await ensurePlatformBootstrap(db);
  } catch (e) {
    console.error("[bootstrap]", e);
  }
  return null;
}
