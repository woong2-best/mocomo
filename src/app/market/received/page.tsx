import { redirect } from "next/navigation";

export default function MarketReceivedPage() {
  redirect("/support?tab=received");
}
