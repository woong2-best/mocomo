import { headers } from "next/headers";
import { extractClientIp } from "@/lib/client-ip";

export async function getRequestIp(): Promise<string> {
  const h = await headers();
  return extractClientIp(h);
}
