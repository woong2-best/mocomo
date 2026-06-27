import { redirect } from "next/navigation";

export const metadata = {
  title: "MoCoMo APT",
  description: "MoCoMo APT",
};

export default async function AptMoveInPage() {
  redirect("/apt");
}
