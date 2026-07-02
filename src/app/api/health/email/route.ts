import { NextResponse } from "next/server";
import { getEmailConfigStatus, getResendAccountHint, MOCOMO_SEND_SUBDOMAIN } from "@/lib/email";

/** Resend 이메일 설정 점검 — API 키·발신 도메인 정렬 (비밀값 미노출) */
export async function GET() {
  const status = getEmailConfigStatus();
  const accountHint = getResendAccountHint();

  let note: string;
  if (!status.emailConfigured) {
    note = "RESEND_API_KEY missing on server";
  } else if (status.usingResendDev) {
    note = "Using resend.dev — only the Resend account email can receive mail until mocomo.net is verified";
  } else if (!status.sendSubdomainAligned) {
    note = `EMAIL_FROM should use @${MOCOMO_SEND_SUBDOMAIN} (SPF/DKIM DNS). Outlook/iCloud often block misaligned senders.`;
  } else if (!status.productionReady) {
    note = "EMAIL_FROM domain may not be verified on Resend";
  } else {
    note = "Production email ready — also verify DMARC (_dmarc.mocomo.net) in Cloudflare DNS";
  }

  return NextResponse.json({
    ok: status.emailConfigured && status.productionReady,
    ...status,
    recommendedFrom: `MoCoMo <noreply@${MOCOMO_SEND_SUBDOMAIN}>`,
    resendAccountHintSet: !!accountHint,
    note,
  });
}
