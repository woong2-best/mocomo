import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/auth-tokens";
import { getMailboxProviderFromEmail } from "@/lib/mailbox-provider";
import { redactEmail } from "@/lib/safe-log";

/** Resend DNS(SPF/DKIM)가 붙는 발신 서브도메인 — 루트 @mocomo.net 과 정렬 불일치 시 Outlook/iCloud 차단 */
export const MOCOMO_SEND_SUBDOMAIN = "send.mocomo.net";
const MOCOMO_SEND_FROM = `MoCoMo <noreply@${MOCOMO_SEND_SUBDOMAIN}>`;

function getResendClient() {
  const key = process.env.RESEND_API_KEY?.trim();
  return key ? new Resend(key) : null;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

function parseEmailFromDomain(from: string): string | null {
  const match = from.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  return match?.[1]?.toLowerCase() ?? null;
}

/** Verified mocomo.net on Resend — SPF/DKIM은 send 서브도메인에 맞춤 */
export function getEmailFromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;

  const baseUrl = getAppBaseUrl();
  if (baseUrl.includes("mocomo.net")) {
    return MOCOMO_SEND_FROM;
  }

  return "MoCoMo <onboarding@resend.dev>";
}

export function getEmailConfigStatus() {
  const from = getEmailFromAddress();
  const domain = parseEmailFromDomain(from);
  const usingResendDev = domain === "resend.dev";
  const usingMocomoDomain = !!domain?.endsWith("mocomo.net");
  const sendSubdomainAligned = domain === MOCOMO_SEND_SUBDOMAIN;

  return {
    emailConfigured: isEmailConfigured(),
    emailFromSet: !!process.env.EMAIL_FROM?.trim(),
    emailFromDomain: domain,
    emailFromResolved: from.replace(/<[^>]+>/, "<…>"),
    usingResendDev,
    usingMocomoDomain,
    sendSubdomainAligned,
    productionReady:
      isEmailConfigured() && usingMocomoDomain && !usingResendDev && sendSubdomainAligned,
  };
}

export function getResendAccountHint(): string | null {
  return process.env.RESEND_ACCOUNT_EMAIL?.trim() || null;
}

function formatResendError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("only send") || lower.includes("testing emails") || lower.includes("verify a domain")) {
    const hint = getResendAccountHint();
    return hint
      ? `Resend 무료 한도: ${hint} 주소로만 발송 가능합니다. resend.com/domains 에서 mocomo.net 도메인 인증이 필요합니다.`
      : "Resend 무료 한도: Resend 가입 이메일로만 발송됩니다. resend.com/domains 에서 도메인 인증이 필요합니다.";
  }
  return message;
}

function buildPlainTextFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set");
    return { ok: false, error: "RESEND_API_KEY가 설정되지 않았습니다." };
  }

  const from = getEmailFromAddress();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || "support@mocomo.net";
  const plain = text ?? buildPlainTextFromHtml(html);
  const recipientProvider = getMailboxProviderFromEmail(to);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: plain,
      replyTo,
      headers: {
        "List-Unsubscribe": `<mailto:${replyTo}?subject=unsubscribe>`,
      },
      tags: [
        { name: "category", value: "auth" },
        { name: "mailbox", value: recipientProvider },
      ],
    });
    console.info("[email] sent", {
      to: redactEmail(to),
      mailbox: recipientProvider,
      from: from.replace(/<[^>]+>/, "<…>"),
      id: data?.id,
      error: error?.message,
    });
    if (error) {
      console.error("[email]", error);
      return { ok: false, error: formatResendError(error.message) };
    }
    if (!data?.id) {
      return { ok: false, error: "Resend가 메일 ID를 반환하지 않았습니다." };
    }
    return { ok: true, messageId: data.id };
  } catch (e) {
    console.error("[email]", e);
    return { ok: false, error: "메일 서버 연결에 실패했습니다." };
  }
}

export async function sendAuthCodeEmail(
  to: string,
  code: string,
  purpose: "signup" | "reset" = "signup"
) {
  const verifyUrl = `${getAppBaseUrl()}/auth/email-verify?email=${encodeURIComponent(to)}&mode=${purpose}`;
  const title =
    purpose === "reset" ? "MoCoMo password reset code" : "MoCoMo verification code";
  const hint =
    purpose === "reset"
      ? "Enter this code to set a new password."
      : "Enter this code to finish signing up, then log in with your password.";
  const plain = `${title}\n\n${hint}\n\nCode: ${code}\n\nValid for 1 hour.\n\n${verifyUrl}\n\nIf you did not request this, ignore this email.`;

  return sendEmail({
    to,
    subject: `${title}: ${code}`,
    text: plain,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;line-height:1.5;color:#111">
        <p style="margin:0 0 8px;font-size:18px;font-weight:600">${title}</p>
        <p style="margin:0 0 16px;color:#444">${hint} Valid for 1 hour.</p>
        <p style="margin:0 0 20px;font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p style="margin:0 0 12px">
          <a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Enter code</a>
        </p>
        <p style="margin:0;font-size:12px;color:#666;word-break:break-all">${verifyUrl}</p>
        <p style="margin:16px 0 0;font-size:12px;color:#666">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
  username: string,
  code: string
) {
  void verifyUrl;
  void username;
  return sendAuthCodeEmail(to, code, "signup");
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, code: string) {
  void resetUrl;
  return sendAuthCodeEmail(to, code, "reset");
}

export async function sendWelcomeEmail(to: string, username: string) {
  return sendEmail({
    to,
    subject: "[MoCoMo] Welcome!",
    html: `
      <h2>Welcome to MoCoMo, ${username}!</h2>
      <p>Subculture, cosplay, community, and live — all in one place.</p>
      <p><a href="${getAppBaseUrl()}">Open MoCoMo</a></p>
    `,
  });
}
