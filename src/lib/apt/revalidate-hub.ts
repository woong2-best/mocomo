import { revalidatePath } from "next/cache";
import { APT_GAME_PATH } from "@/lib/site-routes";

/** 게임 허브 캐시 무효화 (/apt 는 리다이렉트용) */
export function revalidateAptHub() {
  revalidatePath("/apt");
  revalidatePath("/apt/house");
  revalidatePath(APT_GAME_PATH);
}
