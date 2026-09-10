import { redirect } from "next/navigation";

export default function MarketReceivedPage() {
  redirect("/wallet?tab=earnings");
}
