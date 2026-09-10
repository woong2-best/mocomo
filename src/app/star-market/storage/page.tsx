import { redirect } from "next/navigation";

export default function MarketStoragePage() {
  redirect("/support?tab=sent");
}
