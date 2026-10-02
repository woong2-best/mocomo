import { redirect } from "next/navigation";

export const metadata = {
  title: "APT Corner Scene | MoCoMo",
  description: "Scene Polish #4 — live 3D corner room",
};

type SearchParams = { compare?: string; zone?: string };

/** Full-screen 3D scene (no iframe — X-Frame-Options blocks embed) */
export default async function AptCornerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ compare: sp.compare ?? "0" });
  if (sp.zone) qs.set("zone", sp.zone);
  redirect(`/apt/hero-assets/scene-material-assembly.html?${qs.toString()}`);
}
