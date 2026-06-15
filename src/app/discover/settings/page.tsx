import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDiscoverySettings } from "@/actions/discovery";
import { DiscoverySettingsForm } from "@/components/discovery/discovery-settings-form";

export default async function DiscoverSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/discover/settings");

  const settings = await getDiscoverySettings();
  if ("error" in settings) redirect("/discover");

  return <DiscoverySettingsForm initial={settings} />;
}
