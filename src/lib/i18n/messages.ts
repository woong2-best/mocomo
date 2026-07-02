import type { Locale } from "@/lib/i18n/config";

export type MessageKey =
  | "nav.home"
  | "nav.explore"
  | "nav.discover"
  | "nav.notifications"
  | "nav.myPage"
  | "nav.communities"
  | "nav.messages"
  | "nav.star"
  | "nav.anime"
  | "nav.cosplay"
  | "nav.live"
  | "nav.liveStudio"
  | "nav.webtoon"
  | "nav.webtoonStudio"
  | "nav.works"
  | "nav.used"
  | "nav.market"
  | "nav.events"
  | "nav.games"
  | "nav.apt"
  | "nav.rankings"
  | "nav.support"
  | "nav.wallet"
  | "nav.premium"
  | "nav.settings"
  | "nav.signup"
  | "nav.signin"
  | "nav.compose"
  | "nav.more"
  | "nav.tier"
  | "sidebar.sponsored"
  | "sidebar.popularAnime"
  | "sidebar.animeHubLink"
  | "sidebar.eventsMapTitle"
  | "sidebar.eventsMapExpand"
  | "sidebar.fallbackEventAd"
  | "anime.wikiTitle"
  | "anime.browseByGenre"
  | "anime.postCount"
  | "anime.trendingTitle"
  | "anime.recentTitle"
  | "anime.trendingEmpty"
  | "anime.recentEmpty"
  | "anime.seeMore"
  | "anime.randomArticle"
  | "anime.newArticles"
  | "anime.deleteRequests"
  | "anime.noticeAccount"
  | "anime.collabNotice"
  | "anime.loggedInAs"
  | "anime.wikiGuideTitle"
  | "anime.statusLive"
  | "anime.statusPartial"
  | "anime.statusPlanned"
  | "anime.exampleLabel"
  | "anime.searchPlaceholder"
  | "anime.searchNoResults"
  | "anime.popularSearches"
  | "anime.addLogin"
  | "anime.addNew"
  | "games.title"
  | "games.hubTitle"
  | "games.hubDesc"
  | "games.playable"
  | "games.comingSoon"
  | "games.friendRoom"
  | "games.ranking"
  | "games.history"
  | "games.spectate"
  | "games.categories"
  | "games.all"
  | "games.play"
  | "games.close"
  | "games.aptTitle"
  | "games.aptDesc"
  | "games.statusSoon"
  | "games.statusComingTitle"
  | "games.footer"
  | "games.playerCount"
  | "games.playerRange"
  | "auth.signupTitle"
  | "auth.signupDesc"
  | "auth.email"
  | "auth.emailLocalPart"
  | "auth.emailDomain"
  | "auth.emailCustom"
  | "auth.emailLocalAria"
  | "auth.emailDomainAria"
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
  | "feed.title"
  | "feed.tabs"
  | "feed.emptyPrompt"
  | "feed.compose"
  | "feed.posted"
  | "search.placeholder"
  | "compose.placeholder"
  | "compose.post"
  | "compose.posting"
  | "compose.uploading"
  | "compose.optionsOpen"
  | "compose.optionsClose"
  | "compose.tagsNsfw"
  | "brand.tagline"
  | "brand.description"
  | "home.welcome"
  | "home.guestDescription"
  | "home.signUpFree"
  | "home.featureFeed"
  | "home.featureAnime"
  | "home.featureCosplay"
  | "home.featureSupport"
  | "home.featureLive"
  | "home.featureCommunities"
  | "home.highlightsTitle"
  | "home.highlightsMeta"
  | "home.likesTop"
  | "home.viewsTop"
  | "home.likes"
  | "home.views"
  | "home.highlightsEmpty"
  | "auth.signInTitle"
  | "auth.signIn"
  | "auth.signingIn"
  | "auth.socialSignIn"
  | "auth.signInDiscord"
  | "auth.signInTwitter"
  | "auth.signInGoogle"
  | "auth.emailVerifyForgot"
  | "auth.callbackRedirect"
  | "auth.oauthNotConfigured"
  | "auth.signupPageTitle"
  | "auth.signupPageDesc"
  | "auth.signupStep1"
  | "auth.signupStep2"
  | "auth.signupStep3"
  | "auth.termsAgreement"
  | "auth.termsOfService"
  | "auth.privacyPolicy"
  | "auth.operatingPolicy"
  | "auth.nextHumanVerify"
  | "auth.submitSignupEmail"
  | "auth.checking"
  | "auth.orSocialSignup"
  | "auth.signUpDiscord"
  | "auth.signUpTwitter"
  | "auth.signUpGoogle"
  | "auth.invalidEmail"
  | "auth.serverError"
  | "legal.terms"
  | "legal.creatorTerms"
  | "legal.payment"
  | "legal.copyright"
  | "legal.privacy"
  | "legal.accountDeletion"
  | "legal.policy";

const ko: Record<MessageKey, string> = {
  "nav.home": "홈",
  "nav.explore": "탐색",
  "nav.discover": "매칭",
  "nav.notifications": "알림",
  "nav.myPage": "My Page",
  "nav.communities": "커뮤니티",
  "nav.messages": "메시지",
  "nav.star": "STAR",
  "nav.anime": "애니덕질",
  "nav.cosplay": "코스프레",
  "nav.live": "라이브",
  "nav.liveStudio": "스튜디오",
  "nav.webtoon": "일러스트",
  "nav.webtoonStudio": "작품 판매",
  "nav.works": "작품 판매",
  "nav.used": "중고거래",
  "nav.market": "굿즈샵",
  "nav.events": "이벤트",
  "nav.games": "GAME",
  "nav.apt": "APT",
  "nav.rankings": "후원 랭킹",
  "nav.support": "후원",
  "nav.wallet": "정산·출금",
  "nav.premium": "프리미엄",
  "nav.settings": "설정",
  "nav.signup": "가입",
  "nav.signin": "로그인",
  "nav.compose": "글쓰기",
  "nav.more": "더보기",
  "nav.tier": "등급",
  "sidebar.sponsored": "스폰서",
  "sidebar.popularAnime": "인기 애니",
  "sidebar.animeHubLink": "애니 허브 가기 →",
  "sidebar.eventsMapTitle": "서브컬처·애니 행사 지도",
  "sidebar.eventsMapExpand": "지도 크게 보기 →",
  "sidebar.fallbackEventAd": "진행 중인 이벤트",
  "anime.wikiTitle": "애니 위키",
  "anime.browseByGenre": "장르로 찾기",
  "anime.postCount": "{count}개 글",
  "anime.trendingTitle": "실시간 인기 글",
  "anime.recentTitle": "최근 수정 글",
  "anime.trendingEmpty": "아직 조회 기록이 없어요.",
  "anime.recentEmpty": "수정된 글이 없어요.",
  "anime.seeMore": "더보기",
  "anime.randomArticle": "랜덤 글",
  "anime.newArticles": "신규 글",
  "anime.deleteRequests": "삭제 요청",
  "anime.noticeAccount": "공지 · 계정",
  "anime.collabNotice": "애니 글은 로그인한 회원이 나무위키처럼 함께 편집합니다. 악의적 편집·스팸은 신고·운영진 조치 대상입니다.",
  "anime.loggedInAs": "@{username} 님으로 로그인됨",
  "anime.wikiGuideTitle": "애니 위키 안내",
  "anime.statusLive": "이용 가능",
  "anime.statusPartial": "일부 지원",
  "anime.statusPlanned": "준비 중",
  "anime.exampleLabel": "예시:",
  "anime.searchPlaceholder": "애니 위키 검색 (제목·내용)",
  "anime.searchNoResults": "검색 결과 없음 · Enter로 전체 검색",
  "anime.popularSearches": "인기 검색어",
  "anime.addLogin": "로그인하고 글 추가",
  "anime.addNew": "새 글 추가",
  "games.title": "미니게임",
  "games.hubTitle": "게임 허브",
  "games.hubDesc": "실시간 매칭 · 친구 방 · 랭킹 · 관전",
  "games.playable": "플레이 가능 {count}",
  "games.comingSoon": "준비 중 {count}",
  "games.friendRoom": "2~5인 · 친구 방",
  "games.ranking": "랭킹",
  "games.history": "전적",
  "games.spectate": "관전",
  "games.categories": "카테고리",
  "games.all": "전체",
  "games.play": "플레이",
  "games.close": "게임 닫기",
  "games.aptTitle": "APT · 내 집",
  "games.aptDesc": "다이오라마 꾸미기 · 상점 · 라이브 TV · 이웃 방문",
  "games.statusSoon": "준비",
  "games.statusComingTitle": "준비 중입니다",
  "games.footer": "친구 초대 · 방 코드 · 관전 · 랭킹 지원",
  "games.playerCount": "{count}인",
  "games.playerRange": "{min}~{max}인",
  "auth.signupTitle": "회원가입",
  "auth.signupDesc": "서브컬처·코스프레 커뮤니티",
  "auth.email": "이메일",
  "auth.emailLocalPart": "아이디",
  "auth.emailDomain": "도메인",
  "auth.emailCustom": "직접 입력",
  "auth.emailLocalAria": "이메일 아이디",
  "auth.emailDomainAria": "이메일 도메인",
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
  "feed.tabs": "팔로우 · 추천 · 최신",
  "feed.emptyPrompt": "오늘의 캔버스에 첫 글을 올려 보세요",
  "feed.compose": "글쓰기",
  "feed.posted": "게시되었습니다",
  "search.placeholder": "사람, 애니, 게시물 검색",
  "compose.placeholder": "무슨 일이 일어나고 있나요?",
  "compose.post": "게시하기",
  "compose.posting": "게시 중…",
  "compose.uploading": "업로드 중…",
  "compose.optionsOpen": "태그·NSFW",
  "compose.optionsClose": "옵션 닫기",
  "compose.tagsNsfw": "NSFW",
  "brand.tagline": "손으로 그린 서브컬처 이야기",
  "brand.description": "서브컬처 · 애니덕질 · 코스프레 · 굿즈 · 커뮤니티",
  "home.welcome": "{brand}에 오신 것을 환영합니다",
  "home.guestDescription": "{description}. 붓끝으로 그린 듯한 서브컬처 이야기 — 가입 후 글·DM·통화를 즐겨 보세요.",
  "home.signUpFree": "무료 회원가입",
  "home.featureFeed": "SNS 피드",
  "home.featureAnime": "애니덕질",
  "home.featureCosplay": "코스프레",
  "home.featureSupport": "후원",
  "home.featureLive": "라이브",
  "home.featureCommunities": "커뮤니티",
  "home.highlightsTitle": "이번 주 하이라이트",
  "home.highlightsMeta": "최근 7일 · 각 2개",
  "home.likesTop": "좋아요 TOP",
  "home.viewsTop": "조회수 TOP",
  "home.likes": "좋아요",
  "home.views": "조회",
  "home.highlightsEmpty": "{title} — 이번 주 데이터가 아직 없어요",
  "auth.signInTitle": "{brand} 로그인",
  "auth.signIn": "로그인",
  "auth.signingIn": "로그인 중...",
  "auth.socialSignIn": "소셜 로그인",
  "auth.signInDiscord": "Discord로 로그인",
  "auth.signInTwitter": "X로 로그인",
  "auth.signInGoogle": "Google로 로그인",
  "auth.emailVerifyForgot": "이메일 인증 · 비밀번호 찾기",
  "auth.callbackRedirect": "로그인 후 글쓰기 등 이전 화면으로 이동합니다.",
  "auth.oauthNotConfigured": "Google·X·Discord 로그인은 Vercel에 OAuth 키 추가 후 사용할 수 있습니다.",
  "auth.signupPageTitle": "{brand} 회원가입",
  "auth.signupPageDesc": "가입 정보를 입력한 뒤 이메일 인증으로 계정을 완성합니다.",
  "auth.signupStep1": "가입 정보",
  "auth.signupStep2": "사람 확인",
  "auth.signupStep3": "이메일 인증",
  "auth.termsAgreement": "회원가입 시 이용약관, 개인정보처리방침, 운영정책에 동의한 것으로 간주됩니다.",
  "auth.termsOfService": "이용약관",
  "auth.privacyPolicy": "개인정보처리방침",
  "auth.operatingPolicy": "운영정책",
  "auth.nextHumanVerify": "다음 · 사람 확인",
  "auth.submitSignupEmail": "가입 신청 · 인증 메일 받기",
  "auth.checking": "확인 중...",
  "auth.orSocialSignup": "또는 소셜로 가입",
  "auth.signUpDiscord": "Discord로 가입",
  "auth.signUpTwitter": "X로 가입",
  "auth.signUpGoogle": "Google로 가입",
  "auth.invalidEmail": "올바른 이메일을 입력해 주세요. (아이디 @ 도메인)",
  "auth.serverError": "서버 연결 오류입니다. 잠시 후 다시 시도해 주세요.",
  "legal.terms": "이용약관",
  "legal.creatorTerms": "크리에이터 약관",
  "legal.payment": "결제·환불",
  "legal.copyright": "저작권",
  "legal.privacy": "개인정보처리방침",
  "legal.accountDeletion": "계정 삭제",
  "legal.policy": "운영정책",
};

const en: Record<MessageKey, string> = {
  "nav.home": "Home",
  "nav.explore": "Explore",
  "nav.discover": "Match",
  "nav.notifications": "Notifications",
  "nav.myPage": "My Page",
  "nav.communities": "Communities",
  "nav.messages": "Messages",
  "nav.star": "STAR",
  "nav.anime": "Anime",
  "nav.cosplay": "Cosplay",
  "nav.live": "Live",
  "nav.liveStudio": "Studio",
  "nav.webtoon": "Illustrations",
  "nav.webtoonStudio": "Sell Art",
  "nav.works": "Creator Works",
  "nav.used": "Used Market",
  "nav.market": "Shop",
  "nav.events": "Events",
  "nav.games": "GAME",
  "nav.apt": "APT",
  "nav.rankings": "Rankings",
  "nav.support": "Support",
  "nav.wallet": "Wallet",
  "nav.premium": "Premium",
  "nav.settings": "Settings",
  "nav.signup": "Sign up",
  "nav.signin": "Sign in",
  "nav.compose": "Compose",
  "nav.more": "More",
  "nav.tier": "Tier",
  "sidebar.sponsored": "Sponsored",
  "sidebar.popularAnime": "Popular anime",
  "sidebar.animeHubLink": "Browse anime hub →",
  "sidebar.eventsMapTitle": "Subculture & anime event map",
  "sidebar.eventsMapExpand": "View full map →",
  "sidebar.fallbackEventAd": "Ongoing events",
  "anime.wikiTitle": "Anime Wiki",
  "anime.browseByGenre": "Browse by genre",
  "anime.postCount": "{count} articles",
  "anime.trendingTitle": "Trending articles",
  "anime.recentTitle": "Recently edited",
  "anime.trendingEmpty": "No views yet.",
  "anime.recentEmpty": "No edits yet.",
  "anime.seeMore": "See more",
  "anime.randomArticle": "Random article",
  "anime.newArticles": "New articles",
  "anime.deleteRequests": "Deletion requests",
  "anime.noticeAccount": "Notice · Account",
  "anime.collabNotice": "Logged-in members edit anime articles together wiki-style. Abuse and spam may be reported or moderated.",
  "anime.loggedInAs": "Signed in as @{username}",
  "anime.wikiGuideTitle": "Anime Wiki guide",
  "anime.statusLive": "Available",
  "anime.statusPartial": "Partial",
  "anime.statusPlanned": "Planned",
  "anime.exampleLabel": "Example:",
  "anime.searchPlaceholder": "Search Anime Wiki (title · content)",
  "anime.searchNoResults": "No results · press Enter for full search",
  "anime.popularSearches": "Trending searches",
  "anime.addLogin": "Sign in to add article",
  "anime.addNew": "New article",
  "games.title": "Mini-games",
  "games.hubTitle": "Game hub",
  "games.hubDesc": "Live matchmaking · friend rooms · rankings · spectate",
  "games.playable": "Playable {count}",
  "games.comingSoon": "Coming soon {count}",
  "games.friendRoom": "2–5 players · friend room",
  "games.ranking": "Ranking",
  "games.history": "History",
  "games.spectate": "Spectate",
  "games.categories": "Categories",
  "games.all": "All",
  "games.play": "Play",
  "games.close": "Close games",
  "games.aptTitle": "APT · My home",
  "games.aptDesc": "Decorate diorama · shop · live TV · visit neighbors",
  "games.statusSoon": "Soon",
  "games.statusComingTitle": "Coming soon",
  "games.footer": "Invite friends · room codes · spectate · rankings",
  "games.playerCount": "{count} players",
  "games.playerRange": "{min}–{max} players",
  "auth.signupTitle": "Sign up",
  "auth.signupDesc": "Subculture & cosplay community",
  "auth.email": "Email",
  "auth.emailLocalPart": "yourname",
  "auth.emailDomain": "domain.com",
  "auth.emailCustom": "Custom",
  "auth.emailLocalAria": "Email username",
  "auth.emailDomainAria": "Email domain",
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
  "feed.tabs": "Following · For you · Latest",
  "feed.emptyPrompt": "Be the first to post on today's canvas",
  "feed.compose": "Compose",
  "feed.posted": "Posted",
  "search.placeholder": "Search people, anime, posts",
  "compose.placeholder": "What's happening?",
  "compose.post": "Post",
  "compose.posting": "Posting…",
  "compose.uploading": "Uploading…",
  "compose.optionsOpen": "Tags · NSFW",
  "compose.optionsClose": "Close options",
  "compose.tagsNsfw": "NSFW",
  "brand.tagline": "Hand-drawn subculture stories",
  "brand.description": "Subculture · anime · cosplay · goods · community",
  "home.welcome": "Welcome to {brand}",
  "home.guestDescription": "{description} Hand-drawn stories — sign up to post, DM, and call.",
  "home.signUpFree": "Sign up free",
  "home.featureFeed": "Social feed",
  "home.featureAnime": "Anime",
  "home.featureCosplay": "Cosplay",
  "home.featureSupport": "Support",
  "home.featureLive": "Live",
  "home.featureCommunities": "Communities",
  "home.highlightsTitle": "This week's highlights",
  "home.highlightsMeta": "Last 7 days · top 2 each",
  "home.likesTop": "Top likes",
  "home.viewsTop": "Top views",
  "home.likes": "likes",
  "home.views": "views",
  "home.highlightsEmpty": "{title} — no data this week yet",
  "auth.signInTitle": "Sign in to {brand}",
  "auth.signIn": "Sign in",
  "auth.signingIn": "Signing in...",
  "auth.socialSignIn": "Social sign-in",
  "auth.signInDiscord": "Sign in with Discord",
  "auth.signInTwitter": "Sign in with X",
  "auth.signInGoogle": "Sign in with Google",
  "auth.emailVerifyForgot": "Email verify · Forgot password",
  "auth.callbackRedirect": "After sign-in you'll return to your previous screen.",
  "auth.oauthNotConfigured": "Google, X, and Discord sign-in need OAuth keys on Vercel.",
  "auth.signupPageTitle": "Sign up for {brand}",
  "auth.signupPageDesc": "Enter your details, then verify your email to finish.",
  "auth.signupStep1": "Details",
  "auth.signupStep2": "Human check",
  "auth.signupStep3": "Email verify",
  "auth.termsAgreement": "By signing up you agree to the Terms, Privacy Policy, and Community Policy.",
  "auth.termsOfService": "Terms of Service",
  "auth.privacyPolicy": "Privacy Policy",
  "auth.operatingPolicy": "Community Policy",
  "auth.nextHumanVerify": "Next · Human verification",
  "auth.submitSignupEmail": "Sign up · Send verification email",
  "auth.checking": "Checking...",
  "auth.orSocialSignup": "Or sign up with",
  "auth.signUpDiscord": "Sign up with Discord",
  "auth.signUpTwitter": "Sign up with X",
  "auth.signUpGoogle": "Sign up with Google",
  "auth.invalidEmail": "Enter a valid email (user @ domain).",
  "auth.serverError": "Server error. Please try again shortly.",
  "legal.terms": "Terms",
  "legal.creatorTerms": "Creator terms",
  "legal.payment": "Payment & refunds",
  "legal.copyright": "Copyright",
  "legal.privacy": "Privacy",
  "legal.accountDeletion": "Delete account",
  "legal.policy": "Community policy",
};

const ja: Record<MessageKey, string> = {
  "nav.home": "ホーム",
  "nav.explore": "探索",
  "nav.discover": "マッチ",
  "nav.notifications": "通知",
  "nav.myPage": "マイページ",
  "nav.communities": "コミュニティ",
  "nav.messages": "メッセージ",
  "nav.star": "STAR",
  "nav.anime": "アニメ",
  "nav.cosplay": "コスプレ",
  "nav.live": "ライブ",
  "nav.liveStudio": "スタジオ",
  "nav.webtoon": "ウェブトゥーン",
  "nav.webtoonStudio": "ウェブトゥーンスタジオ",
  "nav.works": "作品販売",
  "nav.used": "フリマ",
  "nav.market": "ショップ",
  "nav.events": "イベント",
  "nav.games": "GAME",
  "nav.apt": "APT",
  "nav.rankings": "ランキング",
  "nav.support": "支援",
  "nav.wallet": "ウォレット",
  "nav.premium": "プレミアム",
  "nav.settings": "設定",
  "nav.signup": "登録",
  "nav.signin": "ログイン",
  "nav.compose": "投稿",
  "nav.more": "もっと見る",
  "nav.tier": "ランク",
  "sidebar.sponsored": "スポンサー",
  "sidebar.popularAnime": "人気アニメ",
  "sidebar.animeHubLink": "アニメハブへ →",
  "sidebar.eventsMapTitle": "サブカル・アニメイベント地図",
  "sidebar.eventsMapExpand": "地図を大きく見る →",
  "sidebar.fallbackEventAd": "開催中のイベント",
  "anime.wikiTitle": "アニメWiki",
  "anime.browseByGenre": "ジャンルから探す",
  "anime.postCount": "{count}件",
  "anime.trendingTitle": "人気記事",
  "anime.recentTitle": "最近の編集",
  "anime.trendingEmpty": "まだ閲覧データがありません。",
  "anime.recentEmpty": "編集された記事がありません。",
  "anime.seeMore": "もっと見る",
  "anime.randomArticle": "ランダム記事",
  "anime.newArticles": "新規記事",
  "anime.deleteRequests": "削除リクエスト",
  "anime.noticeAccount": "お知らせ · アカウント",
  "anime.collabNotice": "ログイン会員がアニメ記事をウィキのように共同編集します。悪意のある編集・スパムは通報・運営対応の対象です。",
  "anime.loggedInAs": "@{username} でログイン中",
  "anime.wikiGuideTitle": "アニメWikiガイド",
  "anime.statusLive": "利用可能",
  "anime.statusPartial": "一部対応",
  "anime.statusPlanned": "準備中",
  "anime.exampleLabel": "例:",
  "anime.searchPlaceholder": "アニメWiki検索（タイトル・本文）",
  "anime.searchNoResults": "結果なし · Enterで全体検索",
  "anime.popularSearches": "人気検索語",
  "anime.addLogin": "ログインして記事追加",
  "anime.addNew": "新規記事",
  "games.title": "ミニゲーム",
  "games.hubTitle": "ゲームハブ",
  "games.hubDesc": "リアルタイムマッチ · フレンドルーム · ランキング · 観戦",
  "games.playable": "プレイ可能 {count}",
  "games.comingSoon": "準備中 {count}",
  "games.friendRoom": "2~5人 · フレンドルーム",
  "games.ranking": "ランキング",
  "games.history": "戦績",
  "games.spectate": "観戦",
  "games.categories": "カテゴリ",
  "games.all": "すべて",
  "games.play": "プレイ",
  "games.close": "ゲームを閉じる",
  "games.aptTitle": "APT · マイホーム",
  "games.aptDesc": "ジオラマ飾り · ショップ · ライブTV · 近所訪問",
  "games.statusSoon": "準備",
  "games.statusComingTitle": "準備中です",
  "games.footer": "フレンド招待 · ルームコード · 観戦 · ランキング",
  "games.playerCount": "{count}人",
  "games.playerRange": "{min}~{max}人",
  "auth.signupTitle": "会員登録",
  "auth.signupDesc": "サブカル・コスプレコミュニティ",
  "auth.email": "メール",
  "auth.emailLocalPart": "ユーザー名",
  "auth.emailDomain": "ドメイン",
  "auth.emailCustom": "直接入力",
  "auth.emailLocalAria": "メールのユーザー名",
  "auth.emailDomainAria": "メールドメイン",
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
  "feed.tabs": "フォロー · おすすめ · 最新",
  "feed.emptyPrompt": "今日のキャンバスに最初の投稿を",
  "feed.compose": "投稿",
  "feed.posted": "投稿しました",
  "search.placeholder": "人・アニメ・投稿を検索",
  "compose.placeholder": "いまどうしてる？",
  "compose.post": "投稿",
  "compose.posting": "投稿中…",
  "compose.uploading": "アップロード中…",
  "compose.optionsOpen": "タグ · NSFW",
  "compose.optionsClose": "オプションを閉じる",
  "compose.tagsNsfw": "NSFW",
  "brand.tagline": "手描きサブカルストーリー",
  "brand.description": "サブカル · アニメ · コスプレ · グッズ · コミュニティ",
  "home.welcome": "{brand}へようこそ",
  "home.guestDescription": "{description} 手描きの物語 — 登録して投稿・DM・通話を楽しもう。",
  "home.signUpFree": "無料登録",
  "home.featureFeed": "SNSフィード",
  "home.featureAnime": "アニメ",
  "home.featureCosplay": "コスプレ",
  "home.featureSupport": "支援",
  "home.featureLive": "ライブ",
  "home.featureCommunities": "コミュニティ",
  "home.highlightsTitle": "今週のハイライト",
  "home.highlightsMeta": "過去7日 · 各2件",
  "home.likesTop": "いいね TOP",
  "home.viewsTop": "閲覧 TOP",
  "home.likes": "いいね",
  "home.views": "閲覧",
  "home.highlightsEmpty": "{title} — 今週のデータはまだありません",
  "auth.signInTitle": "{brand}にログイン",
  "auth.signIn": "ログイン",
  "auth.signingIn": "ログイン中...",
  "auth.socialSignIn": "ソーシャルログイン",
  "auth.signInDiscord": "Discordでログイン",
  "auth.signInTwitter": "Xでログイン",
  "auth.signInGoogle": "Googleでログイン",
  "auth.emailVerifyForgot": "メール認証 · パスワード再設定",
  "auth.callbackRedirect": "ログイン後、前の画面に戻ります。",
  "auth.oauthNotConfigured": "Google・X・DiscordログインはOAuth設定が必要です。",
  "auth.signupPageTitle": "{brand} 会員登録",
  "auth.signupPageDesc": "情報を入力し、メール認証で登録を完了します。",
  "auth.signupStep1": "登録情報",
  "auth.signupStep2": "本人確認",
  "auth.signupStep3": "メール認証",
  "auth.termsAgreement": "登録により利用規約・プライバシー・運営ポリシーに同意したものとみなします。",
  "auth.termsOfService": "利用規約",
  "auth.privacyPolicy": "プライバシー",
  "auth.operatingPolicy": "運営ポリシー",
  "auth.nextHumanVerify": "次へ · 本人確認",
  "auth.submitSignupEmail": "登録 · 認証メールを送信",
  "auth.checking": "確認中...",
  "auth.orSocialSignup": "またはソーシャルで登録",
  "auth.signUpDiscord": "Discordで登録",
  "auth.signUpTwitter": "Xで登録",
  "auth.signUpGoogle": "Googleで登録",
  "auth.invalidEmail": "有効なメールを入力してください。",
  "auth.serverError": "サーバーエラーです。しばらくして再試行してください。",
  "legal.terms": "利用規約",
  "legal.creatorTerms": "クリエイター規約",
  "legal.payment": "決済・返金",
  "legal.copyright": "著作権",
  "legal.privacy": "プライバシー",
  "legal.accountDeletion": "アカウント削除",
  "legal.policy": "運営ポリシー",
};

const zh: Record<MessageKey, string> = {
  "nav.home": "首页",
  "nav.explore": "探索",
  "nav.discover": "マッチ",
  "nav.notifications": "通知",
  "nav.myPage": "我的",
  "nav.communities": "社区",
  "nav.messages": "消息",
  "nav.star": "STAR",
  "nav.anime": "动漫",
  "nav.cosplay": "Cosplay",
  "nav.live": "直播",
  "nav.liveStudio": "工作室",
  "nav.webtoon": "网漫",
  "nav.webtoonStudio": "网漫工作室",
  "nav.works": "作品销售",
  "nav.used": "二手",
  "nav.market": "商店",
  "nav.events": "活动",
  "nav.games": "GAME",
  "nav.apt": "APT",
  "nav.rankings": "排行榜",
  "nav.support": "赞助",
  "nav.wallet": "钱包",
  "nav.premium": "会员",
  "nav.settings": "设置",
  "nav.signup": "注册",
  "nav.signin": "登录",
  "nav.compose": "发帖",
  "nav.more": "更多",
  "nav.tier": "等级",
  "sidebar.sponsored": "赞助",
  "sidebar.popularAnime": "热门动漫",
  "sidebar.animeHubLink": "前往动漫中心 →",
  "sidebar.eventsMapTitle": "亚文化·动漫活动地图",
  "sidebar.eventsMapExpand": "查看大地图 →",
  "sidebar.fallbackEventAd": "进行中的活动",
  "anime.wikiTitle": "动漫百科",
  "anime.browseByGenre": "按类型浏览",
  "anime.postCount": "{count} 篇",
  "anime.trendingTitle": "热门条目",
  "anime.recentTitle": "最近编辑",
  "anime.trendingEmpty": "暂无浏览记录。",
  "anime.recentEmpty": "暂无编辑记录。",
  "anime.seeMore": "查看更多",
  "anime.randomArticle": "随机条目",
  "anime.newArticles": "新条目",
  "anime.deleteRequests": "删除申请",
  "anime.noticeAccount": "公告 · 账户",
  "anime.collabNotice": "登录会员可像维基一样共同编辑动漫条目。恶意编辑与垃圾内容可被举报或处理。",
  "anime.loggedInAs": "已登录 @{username}",
  "anime.wikiGuideTitle": "动漫百科指南",
  "anime.statusLive": "可用",
  "anime.statusPartial": "部分支持",
  "anime.statusPlanned": "筹备中",
  "anime.exampleLabel": "示例：",
  "anime.searchPlaceholder": "搜索动漫百科（标题·正文）",
  "anime.searchNoResults": "无结果 · 按 Enter 全站搜索",
  "anime.popularSearches": "热门搜索",
  "anime.addLogin": "登录后添加条目",
  "anime.addNew": "新建条目",
  "games.title": "小游戏",
  "games.hubTitle": "游戏中心",
  "games.hubDesc": "实时匹配 · 好友房 · 排行榜 · 观战",
  "games.playable": "可玩 {count}",
  "games.comingSoon": "筹备中 {count}",
  "games.friendRoom": "2–5 人 · 好友房",
  "games.ranking": "排行榜",
  "games.history": "战绩",
  "games.spectate": "观战",
  "games.categories": "分类",
  "games.all": "全部",
  "games.play": "开始",
  "games.close": "关闭游戏",
  "games.aptTitle": "APT · 我的家",
  "games.aptDesc": "布置场景 · 商店 · 直播电视 · 拜访邻居",
  "games.statusSoon": "筹备",
  "games.statusComingTitle": "筹备中",
  "games.footer": "邀请好友 · 房间码 · 观战 · 排行榜",
  "games.playerCount": "{count} 人",
  "games.playerRange": "{min}–{max} 人",
  "auth.signupTitle": "注册",
  "auth.signupDesc": "亚文化与 Cosplay 社区",
  "auth.email": "邮箱",
  "auth.emailLocalPart": "用户名",
  "auth.emailDomain": "域名",
  "auth.emailCustom": "自定义",
  "auth.emailLocalAria": "邮箱用户名",
  "auth.emailDomainAria": "邮箱域名",
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
  "feed.tabs": "关注 · 推荐 · 最新",
  "feed.emptyPrompt": "成为今天画布上的第一个发帖者",
  "feed.compose": "发帖",
  "feed.posted": "已发布",
  "search.placeholder": "搜索用户、动漫、帖子",
  "compose.placeholder": "发生了什么？",
  "compose.post": "发布",
  "compose.posting": "发布中…",
  "compose.uploading": "上传中…",
  "compose.optionsOpen": "标签 · NSFW",
  "compose.optionsClose": "关闭选项",
  "compose.tagsNsfw": "NSFW",
  "brand.tagline": "手绘亚文化故事",
  "brand.description": "亚文化 · 动漫 · Cosplay · 周边 · 社区",
  "home.welcome": "欢迎来到 {brand}",
  "home.guestDescription": "{description} 手绘故事 — 注册后即可发帖、私信和通话。",
  "home.signUpFree": "免费注册",
  "home.featureFeed": "社交动态",
  "home.featureAnime": "动漫",
  "home.featureCosplay": "Cosplay",
  "home.featureSupport": "赞助",
  "home.featureLive": "直播",
  "home.featureCommunities": "社区",
  "home.highlightsTitle": "本周亮点",
  "home.highlightsMeta": "近7天 · 各2条",
  "home.likesTop": "点赞 TOP",
  "home.viewsTop": "浏览 TOP",
  "home.likes": "点赞",
  "home.views": "浏览",
  "home.highlightsEmpty": "{title} — 本周暂无数据",
  "auth.signInTitle": "登录 {brand}",
  "auth.signIn": "登录",
  "auth.signingIn": "登录中...",
  "auth.socialSignIn": "社交登录",
  "auth.signInDiscord": "用 Discord 登录",
  "auth.signInTwitter": "用 X 登录",
  "auth.signInGoogle": "用 Google 登录",
  "auth.emailVerifyForgot": "邮箱验证 · 找回密码",
  "auth.callbackRedirect": "登录后将返回之前的页面。",
  "auth.oauthNotConfigured": "Google、X、Discord 登录需要配置 OAuth。",
  "auth.signupPageTitle": "注册 {brand}",
  "auth.signupPageDesc": "填写信息后通过邮箱验证完成注册。",
  "auth.signupStep1": "注册信息",
  "auth.signupStep2": "人机验证",
  "auth.signupStep3": "邮箱验证",
  "auth.termsAgreement": "注册即表示同意服务条款、隐私政策和社区政策。",
  "auth.termsOfService": "服务条款",
  "auth.privacyPolicy": "隐私政策",
  "auth.operatingPolicy": "社区政策",
  "auth.nextHumanVerify": "下一步 · 人机验证",
  "auth.submitSignupEmail": "注册 · 发送验证邮件",
  "auth.checking": "检查中...",
  "auth.orSocialSignup": "或使用社交账号注册",
  "auth.signUpDiscord": "用 Discord 注册",
  "auth.signUpTwitter": "用 X 注册",
  "auth.signUpGoogle": "用 Google 注册",
  "auth.invalidEmail": "请输入有效的邮箱地址。",
  "auth.serverError": "服务器错误，请稍后再试。",
  "legal.terms": "服务条款",
  "legal.creatorTerms": "创作者条款",
  "legal.payment": "支付与退款",
  "legal.copyright": "版权",
  "legal.privacy": "隐私",
  "legal.accountDeletion": "删除账号",
  "legal.policy": "社区政策",
};

const TABLES: Record<Locale, Record<MessageKey, string>> = { ko, en, ja, zh };

function applyVars(text: string, vars?: Record<string, string>): string {
  if (!vars) return text;
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string>
): string {
  const text = TABLES[locale][key] ?? TABLES.en[key] ?? TABLES.ko[key] ?? key;
  return applyVars(text, vars);
}

export function createTranslator(locale: Locale) {
  return (key: MessageKey, vars?: Record<string, string>) => translate(locale, key, vars);
}
