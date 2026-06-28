import { redirect } from "next/navigation";

/** Short URL → scene review hub */
export default function AptReviewRedirect() {
  redirect("/apt/scene-review");
}
