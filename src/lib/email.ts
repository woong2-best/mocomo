import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
    return { ok: false, error: "Email not configured" };
  }

  const from = process.env.EMAIL_FROM || "MoCoMo <onboarding@resend.dev>";

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "[MoCoMo] 비밀번호 재설정",
    html: `
      <h2>비밀번호 재설정</h2>
      <p>아래 링크를 클릭해 비밀번호를 재설정하세요. (1시간 유효)</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
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
      <p>덕질·커뮤니티·채팅·음성방까지 한곳에서 즐겨보세요.</p>
    `,
  });
}
