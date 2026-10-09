import { redirect } from "next/navigation";

export default function CosplayProfilesPage() {
  redirect("/anime?genre=cosplay");
}
