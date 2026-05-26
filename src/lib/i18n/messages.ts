import type { Locale } from "@/lib/i18n/config";

export type MessageKey =
  | "nav.home"
  | "nav.explore"
  | "nav.notifications"
  | "nav.myPage"
  | "nav.communities"
  | "nav.messages"
  | "nav.bookmarks"
  | "nav.anime"
  | "nav.cosplay"
  | "nav.live"
  | "nav.used"
  | "nav.market"
  | "nav.events"
  | "nav.rankings"
  | "nav.support"
  | "nav.wallet"
  | "nav.premium"
  | "nav.settings"
  | "nav.signup"
  | "nav.signin"
  | "nav.compose"
  | "auth.signupTitle"
  | "auth.signupDesc"
  | "auth.email"
  | "auth.username"
  | "auth.displayName"
  | "auth.password"
  | "auth.country"
  | "auth.language"
  | "auth.submitSignup"
  | "auth.submitting"
  | "auth.hasAccount"
  | "auth.signinLink"
  | "post.comments"
  | "post.writeComment"
  | "post.loadingComments"
  | "post.noComments"
  | "settings.title"
  | "settings.localeTitle"
  | "settings.localeDesc"
  | "settings.country"
  | "settings.language"
  | "settings.save"
  | "settings.saved"
  | "common.loading"
  | "feed.title";

const ko: Record<MessageKey, string> = {
  "nav.home": "홈",
  "nav.explore": "탐색",
  "nav.notifications": "알림",
  "nav.myPage": "My Page",
  "nav.communities": "커뮤니티",
  "nav.messages": "메시지",
  "nav.bookmarks": "북마크",
  "nav.anime": "애니덕질",
  "nav.cosplay": "코스프레",
  "nav.live": "라이브",
  "nav.used": "중고거래",
  "nav.market": "굿즈샵",
  "nav.events": "이벤트",
  "nav.rankings": "후원 랭킹",
  "nav.support": "후원",
  "nav.wallet": "정산·출금",
  "nav.premium": "프리미엄",
  "nav.settings": "설정",
  "nav.signup": "가입",
  "nav.signin": "로그인",
  "nav.compose": "글쓰기",
  "auth.signupTitle": "회원가입",
  "auth.signupDesc": "서브컬처·코스프레 커뮤니티",
  "auth.email": "이메일",
  "auth.username": "닉네임 (영문·숫자·_)",
  "auth.displayName": "표시 이름 (선택)",
  "auth.password": "비밀번호 (8자 이상)",
  "auth.country": "국가",
  "auth.language": "언어",
  "auth.submitSignup": "회원가입",
  "auth.submitting": "가입 중...",
  "auth.hasAccount": "이미 계정이 있나요?",
  "auth.signinLink": "로그인",
  "post.comments": "댓글",
  "post.writeComment": "댓글을 입력하세요",
  "post.loadingComments": "댓글 불러오는 중…",
  "post.noComments": "첫 댓글을 남겨 보세요",
  "settings.title": "설정",
  "settings.localeTitle": "국가 · 언어",
  "settings.localeDesc": "프로필 국기와 앱 표시 언어를 변경합니다",
  "settings.country": "국가",
  "settings.language": "언어",
  "settings.save": "저장",
  "settings.saved": "저장되었습니다",
  "common.loading": "불러오는 중…",
  "feed.title": "커뮤니티 피드",
};

const en: Record<MessageKey, string> = {
  "nav.home": "Home",
  "nav.explore": "Explore",
  "nav.notifications": "Notifications",
  "nav.myPage": "My Page",
  "nav.communities": "Communities",
  "nav.messages": "Messages",
  "nav.bookmarks": "Bookmarks",
  "nav.anime": "Anime",
  "nav.cosplay": "Cosplay",
  "nav.live": "Live",
  "nav.used": "Used Market",
  "nav.market": "Shop",
  "nav.events": "Events",
  "nav.rankings": "Rankings",
  "nav.support": "Support",
  "nav.wallet": "Wallet",
  "nav.premium": "Premium",
  "nav.settings": "Settings",
  "nav.signup": "Sign up",
  "nav.signin": "Sign in",
  "nav.compose": "Compose",
  "auth.signupTitle": "Sign up",
  "auth.signupDesc": "Subculture & cosplay community",
  "auth.email": "Email",
  "auth.username": "Username (letters, numbers, _)",
  "auth.displayName": "Display name (optional)",
  "auth.password": "Password (8+ characters)",
  "auth.country": "Country",
  "auth.language": "Language",
  "auth.submitSignup": "Create account",
  "auth.submitting": "Signing up...",
  "auth.hasAccount": "Already have an account?",
  "auth.signinLink": "Sign in",
  "post.comments": "Comments",
  "post.writeComment": "Write a comment",
  "post.loadingComments": "Loading comments…",
  "post.noComments": "Be the first to comment",
  "settings.title": "Settings",
  "settings.localeTitle": "Country & language",
  "settings.localeDesc": "Profile flag and app display language",
  "settings.country": "Country",
  "settings.language": "Language",
  "settings.save": "Save",
  "settings.saved": "Saved",
  "common.loading": "Loading…",
  "feed.title": "Community feed",
};

const ja: Record<MessageKey, string> = {
  "nav.home": "ホーム",
  "nav.explore": "探索",
  "nav.notifications": "通知",
  "nav.myPage": "マイページ",
  "nav.communities": "コミュニティ",
  "nav.messages": "メッセージ",
  "nav.bookmarks": "ブックマーク",
  "nav.anime": "アニメ",
  "nav.cosplay": "コスプレ",
  "nav.live": "ライブ",
  "nav.used": "フリマ",
  "nav.market": "ショップ",
  "nav.events": "イベント",
  "nav.rankings": "ランキング",
  "nav.support": "支援",
  "nav.wallet": "ウォレット",
  "nav.premium": "プレミアム",
  "nav.settings": "設定",
  "nav.signup": "登録",
  "nav.signin": "ログイン",
  "nav.compose": "投稿",
  "auth.signupTitle": "会員登録",
  "auth.signupDesc": "サブカル・コスプレコミュニティ",
  "auth.email": "メール",
  "auth.username": "ユーザー名 (英数字・_)",
  "auth.displayName": "表示名 (任意)",
  "auth.password": "パスワード (8文字以上)",
  "auth.country": "国",
  "auth.language": "言語",
  "auth.submitSignup": "登録する",
  "auth.submitting": "登録中...",
  "auth.hasAccount": "アカウントをお持ちですか？",
  "auth.signinLink": "ログイン",
  "post.comments": "コメント",
  "post.writeComment": "コメントを入力",
  "post.loadingComments": "コメント読み込み中…",
  "post.noComments": "最初のコメントをどうぞ",
  "settings.title": "設定",
  "settings.localeTitle": "国・言語",
  "settings.localeDesc": "プロフィールの国旗と表示言語",
  "settings.country": "国",
  "settings.language": "言語",
  "settings.save": "保存",
  "settings.saved": "保存しました",
  "common.loading": "読み込み中…",
  "feed.title": "コミュニティフィード",
};

const zh: Record<MessageKey, string> = {
  "nav.home": "首页",
  "nav.explore": "探索",
  "nav.notifications": "通知",
  "nav.myPage": "我的",
  "nav.communities": "社区",
  "nav.messages": "消息",
  "nav.bookmarks": "收藏",
  "nav.anime": "动漫",
  "nav.cosplay": "Cosplay",
  "nav.live": "直播",
  "nav.used": "二手",
  "nav.market": "商店",
  "nav.events": "活动",
  "nav.rankings": "排行榜",
  "nav.support": "赞助",
  "nav.wallet": "钱包",
  "nav.premium": "会员",
  "nav.settings": "设置",
  "nav.signup": "注册",
  "nav.signin": "登录",
  "nav.compose": "发帖",
  "auth.signupTitle": "注册",
  "auth.signupDesc": "亚文化与 Cosplay 社区",
  "auth.email": "邮箱",
  "auth.username": "用户名 (字母、数字、_)",
  "auth.displayName": "显示名 (可选)",
  "auth.password": "密码 (至少8位)",
  "auth.country": "国家/地区",
  "auth.language": "语言",
  "auth.submitSignup": "注册",
  "auth.submitting": "注册中...",
  "auth.hasAccount": "已有账号？",
  "auth.signinLink": "登录",
  "post.comments": "评论",
  "post.writeComment": "写下评论",
  "post.loadingComments": "加载评论中…",
  "post.noComments": "来发表第一条评论吧",
  "settings.title": "设置",
  "settings.localeTitle": "国家与语言",
  "settings.localeDesc": "个人资料国旗与应用显示语言",
  "settings.country": "国家/地区",
  "settings.language": "语言",
  "settings.save": "保存",
  "settings.saved": "已保存",
  "common.loading": "加载中…",
  "feed.title": "社区动态",
};

const TABLES: Record<Locale, Record<MessageKey, string>> = { ko, en, ja, zh };

export function translate(locale: Locale, key: MessageKey): string {
  return TABLES[locale][key] ?? TABLES.ko[key] ?? key;
}

export function createTranslator(locale: Locale) {
  return (key: MessageKey) => translate(locale, key);
}
