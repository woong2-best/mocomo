import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/auth-tokens";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set");
    return { ok: false, error: "RESEND_API_KEY가 설정되지 않았습니다." };
  }

  const from = process.env.EMAIL_FROM || "MoCoMo <onboarding@resend.dev>";

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    console.error("[email]", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function sendVerificationEmail(to: string, verifyUrl: string, username: string) {
  return sendEmail({
    to,
    subject: "[MoCoMo] 이메일 인증을 완료해 주세요",
    html: `
      <h2>${username}님, MoCoMo 가입을 환영합니다!</h2>
      <p>아래 버튼을 눌러 이메일 주소가 본인 것인지 확인해 주세요. (24시간 유효)</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">이메일 인증하기</a></p>
      <p style="word-break:break-all;color:#666;font-size:12px">${verifyUrl}</p>
      <p>가입하지 않으셨다면 이 메일을 무시하세요.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "[MoCoMo] 비밀번호 재설정",
    html: `
      <h2>비밀번호 재설정</h2>
      <p>아래 링크를 클릭해 비밀번호를 재설정하세요. (1시간 유효)</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">비밀번호 재설정</a></p>
      <p style="word-break:break-all;color:#666;font-size:12px">${resetUrl}</p>
      <p>요청하지 않았다면 이 메일을 무시하세요.</p>
    `,
  });
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

