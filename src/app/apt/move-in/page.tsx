import { redirect } from "next/navigation";

export const metadata = {
  title: "MoCoMo APT",
  description: "MoCoMo APT",
};

import { APT_GAME_PATH } from "@/lib/site-routes";

export default async function AptMoveInPage() {
  redirect(APT_GAME_PATH);
}
