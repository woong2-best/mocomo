import fs from "node:fs";

const map = new Map([
  ["관리자만 숨길 수 있습니다.", "Only admins can hide comments."],
  ["관리자만 해제할 수 있습니다.", "Only admins can unhide comments."],
  ["댓글 내용을 확인해 주세요.", "Check your comment content."],
  ["추천 장소는 최대 30개까지 등록할 수 있습니다.", "You can register up to 30 recommended places."],
  ["지원하지 않는 URL입니다.", "Unsupported URL."],
  ["호스트만 확인할 수 있습니다.", "Only the host can view this."],
  ["메시지는 1~200자입니다.", "Messages must be 1–200 characters."],
  ["방송에 참여한 뒤 채팅할 수 있습니다.", "Join the stream before chatting."],
  ["호스트만 방송 설정을 받을 수 있습니다.", "Only the host can receive broadcast settings."],
  [
    "브라우저에서 방송 시작 → Cloudflare CDN으로 송출됩니다.",
    "Start from the browser; output goes to Cloudflare CDN.",
  ],
  ["알 수 없는 action입니다.", "Unknown action."],
  ["호스트만 처리할 수 있습니다.", "Only the host can perform this action."],
  ["처리할 수 없는 상태입니다.", "This state cannot be processed."],
  ["YouTube URL만 등록할 수 있습니다.", "Only YouTube URLs can be registered."],
  ["이미 URL이 등록되었습니다.", "A URL is already registered."],
  ["다운로드 기간이 만료되었습니다.", "The download period has expired."],
  ["다운로드 횟수를 초과했습니다.", "Download limit exceeded."],
  ["검색어가 너무 깁니다.", "Search query is too long."],
  ["복구할 기록을 선택해 주세요.", "Select a record to restore."],
  ["가입 정보를 확인해 주세요.", "Check your sign-up details."],
  ["세션이 만료되었습니다.", "Session expired."],
  ["사용할 수 없는 닉네임입니다.", "This username is not available."],
  ["상대방이 다른 통화 중입니다.", "They are on another call."],
  ["DM 방에서만 통화할 수 있습니다.", "Calls are only available in DM chats."],
  ["이 대화방에 참여 중이 아닙니다.", "You are not in this chat."],
  ["수신자만 받을 수 있습니다.", "Only the recipient can accept."],
  ["이미 처리된 통화입니다.", "This call was already handled."],
  ["커뮤니티 가입 후 이용할 수 있습니다.", "Join the community first."],
  ["만료된 초대 링크입니다.", "This invite link has expired."],
  ["초대 링크 사용 횟수가 초과되었습니다.", "Invite link use limit exceeded."],
  [
    "가입 요청이 접수되었습니다. 승인 후 알림을 받게 됩니다.",
    "Join request received. You will be notified when approved.",
  ],
  ["요청을 확인해 주세요.", "Check your request."],
  ["MOCO 잔액이 부족합니다. 지갑에서 충전해 주세요.", "Insufficient MOCO. Top up in your wallet."],
  ["외부 방송 연동이 비활성화되어 있습니다.", "External stream linking is disabled."],
  [
    "이 플랫폼은 외부 라이브 임베드를 아직 지원하지 않습니다.",
    "External live embed is not supported for this platform yet.",
  ],
  ["방송에 참여한 뒤 후원할 수 있습니다.", "Join the stream before donating."],
  [
    "채팅/TTS 후원은 종료되었습니다. SFX 후원을 이용해 주세요.",
    "Chat/TTS donations are closed. Please use SFX donations.",
  ],
  ["type은 SFX 또는 VIDEO입니다.", "type must be SFX or VIDEO."],
  ["방송에 참여한 뒤 미리보기할 수 있습니다.", "Join the stream before previewing."],
  ["방송에 참여한 뒤 응원할 수 있습니다.", "Join the stream before cheering."],
  ["방송에 참여한 뒤 미션을 등록할 수 있습니다.", "Join the stream before adding missions."],
  ["라이브 서버가 설정되지 않았습니다.", "Live server is not configured."],
  ["지원하지 않는 언어입니다.", "Unsupported language."],
  ["올바른 서비스 지역을 선택해 주세요.", "Select a valid service region."],
  ["선택지를 지정해 주세요.", "Select an option."],
  ["이미 최근에 신고한 콘텐츠입니다.", "You already reported this content recently."],
  ["신고가 접수되었습니다. 검토 후 조치하겠습니다.", "Report submitted. We will review it."],
  ["출금 MOCO 수량을 확인해 주세요.", "Check the MOCO amount to withdraw."],
  ["광고 일수를 선택해 주세요.", "Select how many days to advertise."],
  ["Stripe 정산 계좌를 먼저 연결해 주세요.", "Connect your Stripe payout account first."],
  ["신고가 접수되었고 사용자를 차단했습니다.", "Report submitted and user blocked."],
  ["신고 정보를 확인해 주세요.", "Check your report details."],
  ["신고 사유를 선택해 주세요.", "Select a report reason."],
  ["정산 계좌는 MoCoMo 마이페이지에서 관리합니다.", "Manage payout accounts in MoCoMo My Page."],
  ["신분증 업로드는 Stripe 온보딩에서 진행해 주세요.", "Upload ID documents during Stripe onboarding."],
  ["AI 글쓰기는 시간당 12회까지 이용할 수 있습니다.", "AI drafting is limited to 12 uses per hour."],
  [
    "채팅/TTS 후원은 종료되었습니다. SFX(효과음) 후원을 이용해 주세요.",
    "Chat/TTS donations are closed. Please use SFX donations.",
  ],
  ["방송 중일 때만 미리보기할 수 있습니다.", "Preview is only available while live."],
  ["YouTube URL만 지원합니다.", "Only YouTube URLs are supported."],
]);

const lines = fs.readFileSync(".build-tmp/api-error-skipped.txt", "utf8").trim().split("\n");
let n = 0;
for (const row of lines) {
  const [loc, ko] = row.split("\t");
  if (!loc || !ko) continue;
  const en = map.get(ko.trim());
  if (!en) {
    console.error("missing map", ko);
    continue;
  }
  const [file, lineStr] = loc.split(":");
  const lineNo = Number(lineStr) - 1;
  const fileLines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  if (!fileLines[lineNo]?.includes(ko.trim())) {
    console.error("line mismatch", loc, fileLines[lineNo]?.slice(0, 80));
    continue;
  }
  fileLines[lineNo] = fileLines[lineNo].split(ko.trim()).join(en);
  fs.writeFileSync(file, fileLines.join("\n"));
  n++;
}
console.log("applied", n);
