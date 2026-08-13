import { redirect } from "next/navigation";

export default async function SupportEmoticonSlugPage() {
  redirect("/support?tab=sent");
}
