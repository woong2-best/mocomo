import { redirect } from "next/navigation";

type Sp = {
  from?: string;
  platform?: string;
  redirect_uri?: string;
  addAccount?: string;
  callbackUrl?: string;
  reason?: string;
};

/** Signup entry → unified auth at /auth/signin */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set("intent", "signup");
  if (sp.from === "mobile") qs.set("from", "mobile");
  if (sp.platform === "ios" || sp.platform === "android") qs.set("platform", sp.platform);
  if (sp.redirect_uri) qs.set("redirect_uri", sp.redirect_uri);
  if (sp.addAccount === "1") qs.set("addAccount", "1");
  if (sp.callbackUrl) qs.set("callbackUrl", sp.callbackUrl);
  if (sp.reason) qs.set("reason", sp.reason);
  redirect(`/auth/signin?${qs.toString()}`);
}
