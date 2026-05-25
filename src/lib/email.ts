import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/auth-tokens";

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

/** Verified mocomo.net on Resend — use send subdomain even if EMAIL_FROM env is missing. */
export function getEmailFromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;

  const baseUrl = getAppBaseUrl();
  if (baseUrl.includes("mocomo.net")) {
    return "MoCoMo <noreply@mocomo.net>";
  }

  return "MoCoMo <onboarding@resend.dev>";
}

export function getEmailConfigStatus() {
  const from = getEmailFromAddress();
  const domain = parseEmailFromDomain(from);
  const usingResendDev = domain === "resend.dev";
  const usingMocomoDomain = !!domain?.endsWith("mocomo.net");

  return {
    emailConfigured: isEmailConfigured(),
    emailFromSet: !!process.env.EMAIL_FROM?.trim(),
    emailFromDomain: domain,
    emailFromResolved: from.replace(/<[^>]+>/, "<…>"),
    usingResendDev,
    usingMocomoDomain,
    productionReady: isEmailConfigured() && usingMocomoDomain && !usingResendDev,
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
      ? `Resend 무료 한도: ${hint} 주소로만 발송 가능합니다. 다른 이메일은 resend.com/domains 에서 도메인 인증 후 사용하세요.`
      : "Resend 무료 한도: Resend 가입 이메일로만 발송됩니다. 다른 주소는 resend.com/domains 에서 도메인 인증이 필요합니다.";
  }
  return message;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set");
    return { ok: false, error: "RESEND_API_KEY가 설정되지 않았습니다." };
  }

  const from = getEmailFromAddress();

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    console.info("[email] sent", { to, from: from.replace(/<[^>]+>/, "<…>"), id: data?.id, error: error?.message });
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
    purpose === "reset"
      ? "비밀번호 찾기 인증 코드"
      : "이메일 인증 코드";
  const hint =
    purpose === "reset"
      ? "코드 확인 후 새 비밀번호를 설정할 수 있습니다."
      : "코드 확인 후 가입 시 설정한 비밀번호로 로그인할 수 있습니다.";

  return sendEmail({
    to,
    subject: `[MoCoMo] ${title} ${code}`,
    html: `
      <h2>${title}</h2>
      <p>${hint} (1시간 유효)</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#7c3aed">${code}</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">코드 입력하러 가기</a></p>
      <p style="word-break:break-all;color:#666;font-size:12px">${verifyUrl}</p>
      <p>요청하지 않았다면 이 메일을 무시하세요.</p>
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
    subject: "[MoCoMo] 가입을 환영합니다!",
    html: `
      <h2>MoCoMo에 오신 것을 환영해요, ${username}님!</h2>
      <p>덕질·커뮤니티·채팅·라이브까지 한곳에서 즐겨보세요.</p>
      <p><a href="${getAppBaseUrl()}">MoCoMo 바로가기</a></p>
    `,
  });
}
