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
  | "nav.mailbox"
  | "common.search"
  | "explore.quickNavAria"
  | "explore.matchSub"
  | "explore.liveSub"
  | "explore.gamesSub"
  | "explore.usedSub"
  | "explore.matchTitle"
  | "explore.matchDesc"
  | "explore.start"
  | "explore.liveNow"
  | "explore.viewAll"
  | "explore.viewers"
  | "explore.trendingPosts"
  | "explore.trendingEmpty"
  | "explore.newUsers"
  | "explore.beFirstUser"
  | "explore.dbError"
  | "live.heroDesc"
  | "live.feature.webcam"
  | "live.feature.voice"
  | "live.feature.chat"
  | "live.feature.moderation"
  | "live.feature.support"
  | "live.searchPlaceholder"
  | "live.modeAll"
  | "live.modeVideo"
  | "live.modeVoice"
  | "live.scheduled"
  | "live.followedLive"
  | "live.recommendedStreamers"
  | "live.followFeed"
  | "live.followFeedDesc"
  | "live.goHomeFeed"
  | "live.onAir"
  | "live.totalViewers"
  | "live.liveBroadcasts"
  | "live.emptyCategory"
  | "live.followers"
  | "live.voiceBadge"
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
  | "post.menu.ariaLabel"
  | "post.menu.delete"
  | "post.menu.deleteConfirm"
  | "post.menu.pinToProfile"
  | "post.menu.unpinFromProfile"
  | "translate.viewTranslation"
  | "translate.viewOriginal"
  | "translate.sourceLanguage"
  | "translate.loading"
  | "translate.failed"
  | "settings.title"
  | "settings.localeTitle"
  | "settings.localeDesc"
  | "settings.country"
  | "settings.language"
  | "settings.save"
  | "settings.saved"
  | "settings.feedDisplayTitle"
  | "settings.feedDisplayDesc"
  | "settings.feedDisplayTimeline"
  | "settings.feedDisplayTimelineDesc"
  | "settings.feedDisplayCompact"
  | "settings.feedDisplayCompactDesc"
  | "settings.account"
  | "settings.nickname"
  | "settings.email"
  | "settings.level"
  | "settings.premium"
  | "settings.profile"
  | "settings.noBio"
  | "settings.editProfile"
  | "settings.creatorRevenue"
  | "settings.supportTier"
  | "settings.discoverTitle"
  | "settings.discoverDesc"
  | "settings.discoverStart"
  | "settings.discoverSettings"
  | "settings.cosplayTitle"
  | "settings.cosplayRegistered"
  | "settings.cosplayProfile"
  | "settings.cosplayApplyDesc"
  | "settings.cosplayApply"
  | "settings.otakuTitle"
  | "settings.favoriteChars"
  | "settings.none"
  | "settings.security"
  | "settings.twoFactor"
  | "settings.twoFactorOn"
  | "settings.twoFactorOff"
  | "settings.nsfw"
  | "settings.nsfwOn"
  | "settings.nsfwOff"
  | "settings.legalTitle"
  | "settings.legalTerms"
  | "settings.legalCreator"
  | "settings.legalPayment"
  | "settings.legalCopyright"
  | "settings.legalPrivacy"
  | "settings.legalDeletion"
  | "settings.legalPolicy"
  | "common.loading"
  | "feed.title"
  | "feed.displayMode.compactHasMedia"
  | "feed.displayMode.openPost"
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
  | "auth.emailSignIn"
  | "auth.signInDiscord"
  | "auth.signInTwitter"
  | "auth.signInGoogle"
  | "auth.emailVerifyForgot"
  | "auth.callbackRedirect"
  | "auth.oauthNotConfigured"
  | "auth.signupPageTitle"
  | "auth.signupPageDesc"
  | "auth.signupOAuthDesc"
  | "auth.signupGmailTitle"
  | "auth.signupGmailDesc"
  | "auth.signupNaverTitle"
  | "auth.signupNaverDesc"
  | "auth.backToSignupMethods"
  | "auth.invalidGmail"
  | "auth.invalidNaver"
  | "auth.gmailLocalHint"
  | "auth.naverLocalHint"
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
  | "auth.signUpGmail"
  | "auth.signInGmail"
  | "auth.signUpNaver"
  | "auth.signInNaver"
  | "auth.oauthProviderUnavailable"
  | "auth.invalidEmail"
  | "auth.serverError"
  | "auth.signupCheckFailed"
  | "auth.humanCheckTitle"
  | "auth.humanCheckDesc"
  | "auth.humanQuizBadge"
  | "auth.humanQuizRefresh"
  | "auth.sendingVerifyEmail"
  | "auth.editSignupInfo"
  | "auth.challengeBootFailed"
  | "auth.challengePreparing"
  | "auth.pickAnswer"
  | "auth.challengeLoading"
  | "auth.backToSignup"
  | "auth.reload"
  | "auth.emailCodeTitle"
  | "auth.emailCodeDescSignup"
  | "auth.emailCodeDescGeneric"
  | "auth.signupVerifyTab"
  | "auth.passwordResetTab"
  | "auth.resendCode"
  | "auth.sendCode"
  | "auth.sending"
  | "auth.codePlaceholder"
  | "auth.verifyGoHome"
  | "auth.verifyChecking"
  | "auth.verifyCodeToPassword"
  | "auth.checkSpam"
  | "auth.backToSigninLink"
  | "auth.emailVerifyDone"
  | "auth.verifyDoneLoginDesc"
  | "auth.signupPasswordHint"
  | "auth.hidePassword"
  | "auth.showPassword"
  | "auth.loginAndHome"
  | "auth.forgetPasswordInfo"
  | "auth.setNewPasswordAction"
  | "auth.passwordResetDone"
  | "auth.loginAction"
  | "auth.newPasswordTitle"
  | "auth.newPasswordDesc"
  | "auth.newPasswordPlaceholder"
  | "auth.confirmPasswordPlaceholder"
  | "auth.saving"
  | "auth.changePassword"
  | "auth.reenterCode"
  | "auth.signingInProgress"
  | "auth.verifyLoginProgress"
  | "auth.turnstileLoading"
  | "auth.turnstileRequired"
  | "auth.codeSent"
  | "auth.checkEmailCode"
  | "auth.noticeDialogTitle"
  | "auth.confirmAction"
  | "auth.unregisteredEmail"
  | "auth.passwordMinLength"
  | "auth.passwordMismatch"
  | "auth.verifyDoneLoginHint"
  | "auth.setNewPasswordPrompt"
  | "auth.rateLimitHint"
  | "auth.emailDeliveryHelp"
  | "auth.emailDeliveryHelpMicrosoft"
  | "auth.emailDeliveryHelpApple"
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
  "nav.mailbox": "우편함",
  "common.search": "검색",
  "explore.quickNavAria": "빠른 이동",
  "explore.matchSub": "취향·거리",
  "explore.liveSub": "실시간 시청",
  "explore.gamesSub": "미니게임",
  "explore.usedSub": "전국 거래",
  "explore.matchTitle": "친구 · 코스어 매칭",
  "explore.matchDesc": "원할 때만 참여 · 취향·거리·나이 필터 · ㅊㅊ & 매칭",
  "explore.start": "시작",
  "explore.liveNow": "지금 라이브",
  "explore.viewAll": "전체 보기",
  "explore.viewers": "{count}명",
  "explore.trendingPosts": "인기 게시물",
  "explore.trendingEmpty": "게시물 없음 — 가입 후 첫 글을 작성해 보세요",
  "explore.newUsers": "새로운 유저",
  "explore.beFirstUser": "첫 번째 유저 되기",
  "explore.dbError": "DB 연결 후 탐색 목록이 표시됩니다.",
  "live.heroDesc": "브라우저에서 바로 방송(유튜브·치지직 방식) · 실시간 시청 · 후원·채팅. 스트리머마다 독립 방입니다.",
  "live.feature.webcam": "웹캠 · 화면공유",
  "live.feature.voice": "보이스 라이브",
  "live.feature.chat": "실시간 채팅",
  "live.feature.moderation": "슬로우·금칙어",
  "live.feature.support": "후원·시청자",
  "live.searchPlaceholder": "스트리머·태그·게시물 검색",
  "live.modeAll": "전체",
  "live.modeVideo": "영상",
  "live.modeVoice": "보이스",
  "live.scheduled": "예약 방송",
  "live.followedLive": "팔로우 중 라이브",
  "live.recommendedStreamers": "추천 스트리머",
  "live.followFeed": "팔로우 피드",
  "live.followFeedDesc": "팔로우한 크리에이터의 게시물은 홈 피드에서 확인할 수 있습니다.",
  "live.goHomeFeed": "홈 피드로 이동",
  "live.onAir": "지금 방송",
  "live.totalViewers": "총 시청자",
  "live.liveBroadcasts": "실시간 방송",
  "live.emptyCategory": "이 카테고리에 진행 중인 라이브가 없습니다.",
  "live.followers": "{count} 팔로워",
  "live.voiceBadge": "보이스",
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
  "post.menu.ariaLabel": "게시물 메뉴",
  "post.menu.delete": "삭제하기",
  "post.menu.deleteConfirm": "이 게시물을 삭제할까요? 되돌릴 수 없습니다.",
  "post.menu.pinToProfile": "내 프로필 메인에 올리기",
  "post.menu.unpinFromProfile": "프로필 메인에서 내리기",
  "translate.viewTranslation": "번역 보기",
  "translate.viewOriginal": "원본 보기",
  "translate.sourceLanguage": "원문 언어 {language}",
  "translate.loading": "번역 중…",
  "translate.failed": "번역할 수 없습니다",
  "settings.title": "설정",
  "settings.localeTitle": "국가 · 언어",
  "settings.localeDesc": "프로필 국기와 앱 표시 언어를 변경합니다",
  "settings.country": "국가",
  "settings.language": "언어",
  "settings.save": "저장",
  "settings.saved": "저장되었습니다",
  "settings.feedDisplayTitle": "피드 보기 방식",
  "settings.feedDisplayDesc": "피드에서 글과 사진을 어떻게 보여줄지 선택합니다.",
  "settings.feedDisplayTimeline": "타임라인",
  "settings.feedDisplayTimelineDesc": "글·사진을 바로 펼쳐서 봅니다.",
  "settings.feedDisplayCompact": "목록형",
  "settings.feedDisplayCompactDesc": "제목만 보이고, 눌러야 본문과 사진이 열립니다.",
  "settings.account": "계정",
  "settings.nickname": "닉네임",
  "settings.email": "이메일",
  "settings.level": "레벨: Lv.{level} (XP {xp})",
  "settings.premium": "프리미엄",
  "settings.profile": "프로필",
  "settings.noBio": "소개 없음",
  "settings.editProfile": "프로필 수정",
  "settings.creatorRevenue": "크리에이터 수익",
  "settings.supportTier": "후원 등급",
  "settings.discoverTitle": "친구 · 코스어 매칭",
  "settings.discoverDesc": "원할 때만 참여 · 거리·나이·취향 필터 · ㅊㅊ·좋아요·매칭",
  "settings.discoverStart": "매칭 시작",
  "settings.discoverSettings": "매칭 설정",
  "settings.cosplayTitle": "코스프레",
  "settings.cosplayRegistered": "코스프레 프로필이 등록되어 있습니다.",
  "settings.cosplayProfile": "코스프레 프로필",
  "settings.cosplayApplyDesc": "사진 1장 · 소개 300자 · 애니 연동",
  "settings.cosplayApply": "코스프레 등록",
  "settings.otakuTitle": "애니덕질 프로필",
  "settings.favoriteChars": "좋아하는 캐릭터: {chars}",
  "settings.none": "없음",
  "settings.security": "보안",
  "settings.twoFactor": "2차 인증",
  "settings.twoFactorOn": "활성",
  "settings.twoFactorOff": "비활성",
  "settings.nsfw": "NSFW 표시",
  "settings.nsfwOn": "켜짐",
  "settings.nsfwOff": "꺼짐",
  "settings.legalTitle": "약관 및 정책",
  "settings.legalTerms": "이용약관",
  "settings.legalCreator": "크리에이터 약관",
  "settings.legalPayment": "결제 및 환불 정책",
  "settings.legalCopyright": "저작권 정책",
  "settings.legalPrivacy": "개인정보처리방침",
  "settings.legalDeletion": "계정 및 데이터 삭제",
  "settings.legalPolicy": "운영원칙 및 이용정책",
  "common.loading": "불러오는 중…",
  "feed.title": "커뮤니티 피드",
  "feed.displayMode.compactHasMedia": "첨부 이미지 있음",
  "feed.displayMode.openPost": "게시글 보기",
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
  "auth.emailSignIn": "이메일로 로그인",
  "auth.signInDiscord": "Discord로 로그인",
  "auth.signInTwitter": "X로 로그인",
  "auth.signInGoogle": "Google로 로그인",
  "auth.emailVerifyForgot": "이메일 인증 · 비밀번호 찾기",
  "auth.callbackRedirect": "로그인 후 글쓰기 등 이전 화면으로 이동합니다.",
  "auth.oauthNotConfigured": "Google·X·Discord 로그인은 Vercel에 OAuth 키 추가 후 사용할 수 있습니다.",
  "auth.signupPageTitle": "{brand} 회원가입",
  "auth.signupPageDesc": "가입 정보를 입력한 뒤 이메일 인증으로 계정을 완성합니다.",
  "auth.signupOAuthDesc": "Discord, Gmail, 네이버, X 중 하나로 시작하세요.",
  "auth.signupGmailTitle": "{brand} Gmail 가입",
  "auth.signupGmailDesc": "Gmail 주소와 가입 정보를 입력해 주세요.",
  "auth.signupNaverTitle": "{brand} 네이버 가입",
  "auth.signupNaverDesc": "네이버 메일 주소와 가입 정보를 입력해 주세요.",
  "auth.backToSignupMethods": "다른 가입 방법으로",
  "auth.invalidGmail": "Gmail 주소(@gmail.com)를 입력해 주세요.",
  "auth.invalidNaver": "네이버 메일(@naver.com)을 입력해 주세요.",
  "auth.gmailLocalHint": "@ 앞부분만 입력하면 됩니다.",
  "auth.naverLocalHint": "@naver.com 은 자동으로 붙습니다.",
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
  "auth.signUpGmail": "Gmail로 가입",
  "auth.signInGmail": "Gmail로 로그인",
  "auth.signUpNaver": "네이버로 가입",
  "auth.signInNaver": "네이버로 로그인",
  "auth.oauthProviderUnavailable": "이 로그인 방식은 곧 지원됩니다. Discord 또는 X를 이용해 주세요.",
  "auth.invalidEmail": "올바른 이메일을 입력해 주세요. (아이디 @ 도메인)",
  "auth.serverError": "서버 연결 오류입니다. 잠시 후 다시 시도해 주세요.",
  "auth.signupCheckFailed": "가입 정보를 확인할 수 없습니다.",
  "auth.humanCheckTitle": "사람인지 확인",
  "auth.humanCheckDesc": "{email}로 인증 메일을 보냅니다. 아래 퀴즈를 푼 뒤 계속해 주세요.",
  "auth.humanQuizBadge": "사람인지 확인 · 무료 퀴즈",
  "auth.humanQuizRefresh": "다른 문제로 바꾸기",
  "auth.sendingVerifyEmail": "인증 메일 발송 중...",
  "auth.editSignupInfo": "가입 정보 수정",
  "auth.challengeBootFailed": "확인 문제를 불러오지 못했습니다. 새로고침해 주세요.",
  "auth.challengePreparing": "확인 문제 준비 중...",
  "auth.pickAnswer": "정답을 골라 주세요.",
  "auth.challengeLoading": "확인 문제를 불러오는 중입니다.",
  "auth.backToSignup": "가입 정보로 돌아가기",
  "auth.reload": "새로고침",
  "auth.emailCodeTitle": "이메일 인증 코드 입력",
  "auth.emailCodeDescSignup": "메일함(스팸함 포함)의 6자리 코드를 입력하세요.",
  "auth.emailCodeDescGeneric": "6자리 코드로 이메일을 확인하고, 필요하면 비밀번호를 설정합니다.",
  "auth.signupVerifyTab": "가입 인증",
  "auth.passwordResetTab": "비밀번호 찾기",
  "auth.resendCode": "인증 코드 다시 받기",
  "auth.sendCode": "인증 코드 보내기",
  "auth.sending": "전송 중...",
  "auth.codePlaceholder": "6자리 인증 코드",
  "auth.verifyGoHome": "코드 확인 · 홈으로 이동",
  "auth.verifyChecking": "확인 중...",
  "auth.verifyCodeToPassword": "코드 확인 → 비밀번호 설정",
  "auth.checkSpam": "스팸함도 확인해 주세요.",
  "auth.backToSigninLink": "로그인으로",
  "auth.emailVerifyDone": "이메일 인증 완료",
  "auth.verifyDoneLoginDesc": "인증이 완료되었습니다. 아래 비밀번호로 로그인하세요.",
  "auth.signupPasswordHint": "가입 시 설정한 비밀번호",
  "auth.hidePassword": "숨기기",
  "auth.showPassword": "보기",
  "auth.loginAndHome": "로그인하고 홈으로",
  "auth.forgetPasswordInfo": "가입할 때 입력한 비밀번호로 로그인하세요. 잊으셨다면 아래에서 새로 설정할 수 있습니다.",
  "auth.setNewPasswordAction": "새 비밀번호 설정하기",
  "auth.passwordResetDone": "새 비밀번호가 설정되었습니다.",
  "auth.loginAction": "로그인하기",
  "auth.newPasswordTitle": "새 비밀번호 설정",
  "auth.newPasswordDesc": "인증 코드 확인 완료. 새 비밀번호를 입력하세요.",
  "auth.newPasswordPlaceholder": "새 비밀번호 (8자 이상)",
  "auth.confirmPasswordPlaceholder": "새 비밀번호 확인",
  "auth.saving": "저장 중...",
  "auth.changePassword": "비밀번호 변경",
  "auth.reenterCode": "코드 다시 입력",
  "auth.signingInProgress": "로그인 중...",
  "auth.verifyLoginProgress": "인증 · 로그인 중...",
  "auth.turnstileLoading": "보안 확인 준비 중...",
  "auth.turnstileRequired": "아래 보안 확인을 완료해 주세요. 위젯이 보이지 않으면 「제한 모드로 계속」을 눌러 주세요.",
  "auth.codeSent": "인증 코드를 보냈습니다.",
  "auth.checkEmailCode": "이메일로 6자리 인증 코드를 확인해 주세요.",
  "auth.noticeDialogTitle": "안내",
  "auth.confirmAction": "확인",
  "auth.unregisteredEmail": "등록되지 않은 이메일입니다.",
  "auth.passwordMinLength": "비밀번호는 8자 이상이어야 합니다.",
  "auth.passwordMismatch": "비밀번호 확인이 일치하지 않습니다.",
  "auth.verifyDoneLoginHint": "인증은 완료되었습니다. 아래에서 로그인해 주세요.",
  "auth.setNewPasswordPrompt": "새 비밀번호를 설정하려면 인증 코드를 다시 받으세요.",
  "auth.rateLimitHint": "이메일·IP당 요청 횟수가 제한됩니다. 스팸 방지를 위해 보안 확인이 필요할 수 있습니다.",
  "auth.emailDeliveryHelp": "메일이 안 보이면 스팸·정크함을 확인하고, 1분 후 「인증 코드 다시 받기」를 눌러 보세요.",
  "auth.emailDeliveryHelpMicrosoft": "Outlook/Hotmail은 처음 받는 발신자를 정크(Junk)함으로 보내는 경우가 많습니다. 받은편지함·정크·스팸을 모두 확인해 주세요.",
  "auth.emailDeliveryHelpApple": "iCloud 메일은 스팸함·휴지통·「정크」 필터를 확인해 주세요. Hide My Email을 쓰는 경우 relay 주소로 옵니다.",
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
  "nav.mailbox": "Mailbox",
  "common.search": "Search",
  "explore.quickNavAria": "Quick links",
  "explore.matchSub": "Taste · distance",
  "explore.liveSub": "Watch live",
  "explore.gamesSub": "Mini-games",
  "explore.usedSub": "Marketplace",
  "explore.matchTitle": "Friends · cosplayer matching",
  "explore.matchDesc": "Opt in anytime · taste, distance & age filters · likes & matches",
  "explore.start": "Start",
  "explore.liveNow": "Live now",
  "explore.viewAll": "View all",
  "explore.viewers": "{count} viewers",
  "explore.trendingPosts": "Trending posts",
  "explore.trendingEmpty": "No posts yet — sign up and write the first one",
  "explore.newUsers": "New users",
  "explore.beFirstUser": "Be the first user",
  "explore.dbError": "Explore list appears after the database connects.",
  "live.heroDesc": "Broadcast in your browser · watch live · tips & chat. Each streamer has their own channel.",
  "live.feature.webcam": "Webcam · screen share",
  "live.feature.voice": "Voice live",
  "live.feature.chat": "Live chat",
  "live.feature.moderation": "Slow mode · word filter",
  "live.feature.support": "Tips · viewers",
  "live.searchPlaceholder": "Search streamers, tags, posts",
  "live.modeAll": "All",
  "live.modeVideo": "Video",
  "live.modeVoice": "Voice",
  "live.scheduled": "Scheduled",
  "live.followedLive": "Following live",
  "live.recommendedStreamers": "Recommended streamers",
  "live.followFeed": "Follow feed",
  "live.followFeedDesc": "Posts from creators you follow appear on the home feed.",
  "live.goHomeFeed": "Go to home feed",
  "live.onAir": "On air now",
  "live.totalViewers": "Total viewers",
  "live.liveBroadcasts": "Live broadcasts",
  "live.emptyCategory": "No live streams in this category.",
  "live.followers": "{count} followers",
  "live.voiceBadge": "Voice",
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
  "post.menu.ariaLabel": "Post menu",
  "post.menu.delete": "Delete",
  "post.menu.deleteConfirm": "Delete this post? This can't be undone.",
  "post.menu.pinToProfile": "Pin to your profile",
  "post.menu.unpinFromProfile": "Unpin from profile",
  "translate.viewTranslation": "View translation",
  "translate.viewOriginal": "Show original",
  "translate.sourceLanguage": "Translated from {language}",
  "translate.loading": "Translating…",
  "translate.failed": "Could not translate",
  "settings.title": "Settings",
  "settings.localeTitle": "Country & language",
  "settings.localeDesc": "Profile flag and app display language",
  "settings.country": "Country",
  "settings.language": "Language",
  "settings.save": "Save",
  "settings.saved": "Saved",
  "settings.feedDisplayTitle": "Feed layout",
  "settings.feedDisplayDesc": "Choose how posts and images appear in your feed.",
  "settings.feedDisplayTimeline": "Timeline",
  "settings.feedDisplayTimelineDesc": "Text and images shown inline.",
  "settings.feedDisplayCompact": "Compact list",
  "settings.feedDisplayCompactDesc": "Preview only; tap to expand body and images.",
  "settings.account": "Account",
  "settings.nickname": "Username",
  "settings.email": "Email",
  "settings.level": "Level: Lv.{level} (XP {xp})",
  "settings.premium": "Premium",
  "settings.profile": "Profile",
  "settings.noBio": "No bio yet",
  "settings.editProfile": "Edit profile",
  "settings.creatorRevenue": "Creator earnings",
  "settings.supportTier": "Support tier",
  "settings.discoverTitle": "Friends & cosplayer matching",
  "settings.discoverDesc": "Opt in anytime · distance, age & taste filters · likes & matches",
  "settings.discoverStart": "Start matching",
  "settings.discoverSettings": "Matching settings",
  "settings.cosplayTitle": "Cosplay",
  "settings.cosplayRegistered": "Your cosplay profile is registered.",
  "settings.cosplayProfile": "Cosplay profile",
  "settings.cosplayApplyDesc": "1 photo · 300-char bio · anime link",
  "settings.cosplayApply": "Register as cosplayer",
  "settings.otakuTitle": "Anime fan profile",
  "settings.favoriteChars": "Favorite characters: {chars}",
  "settings.none": "None",
  "settings.security": "Security",
  "settings.twoFactor": "Two-factor auth",
  "settings.twoFactorOn": "On",
  "settings.twoFactorOff": "Off",
  "settings.nsfw": "NSFW content",
  "settings.nsfwOn": "On",
  "settings.nsfwOff": "Off",
  "settings.legalTitle": "Terms & policies",
  "settings.legalTerms": "Terms of service",
  "settings.legalCreator": "Creator terms",
  "settings.legalPayment": "Payment & refunds",
  "settings.legalCopyright": "Copyright policy",
  "settings.legalPrivacy": "Privacy policy",
  "settings.legalDeletion": "Account & data deletion",
  "settings.legalPolicy": "Community policy",
  "common.loading": "Loading…",
  "feed.title": "Community feed",
  "feed.displayMode.compactHasMedia": "Has image",
  "feed.displayMode.openPost": "View post",
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
  "auth.emailSignIn": "Sign in with email",
  "auth.signInDiscord": "Sign in with Discord",
  "auth.signInTwitter": "Sign in with X",
  "auth.signInGoogle": "Sign in with Google",
  "auth.emailVerifyForgot": "Email verify · Forgot password",
  "auth.callbackRedirect": "After sign-in you'll return to your previous screen.",
  "auth.oauthNotConfigured": "Google, X, and Discord sign-in need OAuth keys on Vercel.",
  "auth.signupPageTitle": "Sign up for {brand}",
  "auth.signupPageDesc": "Enter your details, then verify your email to finish.",
  "auth.signupOAuthDesc": "Get started with Discord, Gmail, Naver, or X.",
  "auth.signupGmailTitle": "Sign up with Gmail",
  "auth.signupGmailDesc": "Enter your Gmail address and account details.",
  "auth.signupNaverTitle": "Sign up with Naver",
  "auth.signupNaverDesc": "Enter your Naver Mail address and account details.",
  "auth.backToSignupMethods": "Other sign-up options",
  "auth.invalidGmail": "Please use a Gmail address (@gmail.com).",
  "auth.invalidNaver": "Please use a Naver Mail address (@naver.com).",
  "auth.gmailLocalHint": "Enter only the part before @.",
  "auth.naverLocalHint": "@naver.com is added automatically.",
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
  "auth.signUpGmail": "Sign up with Gmail",
  "auth.signInGmail": "Sign in with Gmail",
  "auth.signUpNaver": "Sign up with Naver",
  "auth.signInNaver": "Sign in with Naver",
  "auth.oauthProviderUnavailable": "This sign-in method is not ready yet. Please use Discord or X for now.",
  "auth.invalidEmail": "Enter a valid email (user @ domain).",
  "auth.serverError": "Server error. Please try again shortly.",
  "auth.signupCheckFailed": "We couldn't verify your signup details.",
  "auth.humanCheckTitle": "Human check",
  "auth.humanCheckDesc": "We'll send a verification email to {email}. Solve the quiz below to continue.",
  "auth.humanQuizBadge": "Human check · free quiz",
  "auth.humanQuizRefresh": "Try another question",
  "auth.sendingVerifyEmail": "Sending verification email...",
  "auth.editSignupInfo": "Edit signup details",
  "auth.challengeBootFailed": "Couldn't load the challenge. Please refresh.",
  "auth.challengePreparing": "Preparing challenge...",
  "auth.pickAnswer": "Please pick an answer.",
  "auth.challengeLoading": "Loading challenge...",
  "auth.backToSignup": "Back to signup",
  "auth.reload": "Reload",
  "auth.emailCodeTitle": "Enter email verification code",
  "auth.emailCodeDescSignup": "Enter the 6-digit code from your inbox (check spam too).",
  "auth.emailCodeDescGeneric": "Verify your email with a 6-digit code, or reset your password.",
  "auth.signupVerifyTab": "Signup verify",
  "auth.passwordResetTab": "Forgot password",
  "auth.resendCode": "Resend verification code",
  "auth.sendCode": "Send verification code",
  "auth.sending": "Sending...",
  "auth.codePlaceholder": "6-digit code",
  "auth.verifyGoHome": "Verify code · go to home",
  "auth.verifyChecking": "Checking...",
  "auth.verifyCodeToPassword": "Verify code → set password",
  "auth.checkSpam": "Check your spam folder too.",
  "auth.backToSigninLink": "Back to sign in",
  "auth.emailVerifyDone": "Email verified",
  "auth.verifyDoneLoginDesc": "Verification complete. Sign in with your password below.",
  "auth.signupPasswordHint": "Password you set during signup",
  "auth.hidePassword": "Hide",
  "auth.showPassword": "Show",
  "auth.loginAndHome": "Sign in and go home",
  "auth.forgetPasswordInfo": "Sign in with the password you chose. If you forgot it, set a new one below.",
  "auth.setNewPasswordAction": "Set a new password",
  "auth.passwordResetDone": "Your new password has been set.",
  "auth.loginAction": "Sign in",
  "auth.newPasswordTitle": "Set new password",
  "auth.newPasswordDesc": "Code verified. Enter your new password.",
  "auth.newPasswordPlaceholder": "New password (8+ characters)",
  "auth.confirmPasswordPlaceholder": "Confirm new password",
  "auth.saving": "Saving...",
  "auth.changePassword": "Change password",
  "auth.reenterCode": "Re-enter code",
  "auth.signingInProgress": "Signing in...",
  "auth.verifyLoginProgress": "Verifying · signing in...",
  "auth.turnstileLoading": "Preparing security check...",
  "auth.turnstileRequired": "Complete the security check below. If the widget doesn't appear, use continue in restricted mode.",
  "auth.codeSent": "Verification code sent.",
  "auth.checkEmailCode": "Check your email for the 6-digit verification code.",
  "auth.noticeDialogTitle": "Notice",
  "auth.confirmAction": "OK",
  "auth.unregisteredEmail": "This email is not registered.",
  "auth.passwordMinLength": "Password must be at least 8 characters.",
  "auth.passwordMismatch": "Passwords do not match.",
  "auth.verifyDoneLoginHint": "Verification complete. Please sign in below.",
  "auth.setNewPasswordPrompt": "Request a new code to set a new password.",
  "auth.rateLimitHint": "Requests are limited per email and IP. A security check may be required.",
  "auth.emailDeliveryHelp": "Can't find the email? Check spam/junk, then tap Resend after 1 minute.",
  "auth.emailDeliveryHelpMicrosoft": "Outlook/Hotmail often puts new senders in Junk. Check Inbox, Junk, and Spam folders.",
  "auth.emailDeliveryHelpApple": "Check iCloud Mail spam, trash, and junk filters. Hide My Email delivers to your relay address.",
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
  "nav.mailbox": "メールボックス",
  "common.search": "検索",
  "explore.quickNavAria": "クイックリンク",
  "explore.matchSub": "好み・距離",
  "explore.liveSub": "ライブ視聴",
  "explore.gamesSub": "ミニゲーム",
  "explore.usedSub": "フリマ",
  "explore.matchTitle": "フレンド · コスプレマッチ",
  "explore.matchDesc": "任意参加 · 好み·距離·年齢フィルター · いいね & マッチ",
  "explore.start": "開始",
  "explore.liveNow": "ライブ中",
  "explore.viewAll": "すべて見る",
  "explore.viewers": "{count}人",
  "explore.trendingPosts": "人気投稿",
  "explore.trendingEmpty": "投稿なし — 登録して最初の投稿をどうぞ",
  "explore.newUsers": "新しいユーザー",
  "explore.beFirstUser": "最初のユーザーになる",
  "explore.dbError": "DB接続後に探索リストが表示されます。",
  "live.heroDesc": "ブラウザで配信 · ライブ視聴 · 投げ銭·チャット。ストリーマーごとに独立チャンネル。",
  "live.feature.webcam": "ウェブカム · 画面共有",
  "live.feature.voice": "ボイスライブ",
  "live.feature.chat": "ライブチャット",
  "live.feature.moderation": "スロー · NGワード",
  "live.feature.support": "投げ銭 · 視聴者",
  "live.searchPlaceholder": "配信者·タグ·投稿を検索",
  "live.modeAll": "すべて",
  "live.modeVideo": "動画",
  "live.modeVoice": "ボイス",
  "live.scheduled": "予約配信",
  "live.followedLive": "フォロー中ライブ",
  "live.recommendedStreamers": "おすすめ配信者",
  "live.followFeed": "フォローフィード",
  "live.followFeedDesc": "フォロー中のクリエイターの投稿はホームフィードで確認できます。",
  "live.goHomeFeed": "ホームフィードへ",
  "live.onAir": "配信中",
  "live.totalViewers": "総視聴者",
  "live.liveBroadcasts": "ライブ配信",
  "live.emptyCategory": "このカテゴリに配信中のライブはありません。",
  "live.followers": "{count} フォロワー",
  "live.voiceBadge": "ボイス",
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
  "post.menu.ariaLabel": "投稿メニュー",
  "post.menu.delete": "削除",
  "post.menu.deleteConfirm": "この投稿を削除しますか？元に戻せません。",
  "post.menu.pinToProfile": "プロフィールに固定",
  "post.menu.unpinFromProfile": "プロフィールの固定を解除",
  "translate.viewTranslation": "翻訳を表示",
  "translate.viewOriginal": "原文を表示",
  "translate.sourceLanguage": "原文の言語: {language}",
  "translate.loading": "翻訳中…",
  "translate.failed": "翻訳できませんでした",
  "settings.title": "設定",
  "settings.localeTitle": "国・言語",
  "settings.localeDesc": "プロフィールの国旗と表示言語",
  "settings.country": "国",
  "settings.language": "言語",
  "settings.save": "保存",
  "settings.saved": "保存しました",
  "settings.feedDisplayTitle": "フィード表示",
  "settings.feedDisplayDesc": "フィードでの投稿・画像の見え方を選びます。",
  "settings.feedDisplayTimeline": "タイムライン",
  "settings.feedDisplayTimelineDesc": "本文と画像をそのまま表示。",
  "settings.feedDisplayCompact": "リスト",
  "settings.feedDisplayCompactDesc": "一覧のみ、タップで本文・画像を展開。",
  "settings.account": "アカウント",
  "settings.nickname": "ユーザー名",
  "settings.email": "メール",
  "settings.level": "レベル: Lv.{level} (XP {xp})",
  "settings.premium": "プレミアム",
  "settings.profile": "プロフィール",
  "settings.noBio": "自己紹介なし",
  "settings.editProfile": "プロフィール編集",
  "settings.creatorRevenue": "クリエイター収益",
  "settings.supportTier": "支援ティア",
  "settings.discoverTitle": "友達 · コスプレマッチ",
  "settings.discoverDesc": "任意参加 · 距離·年齢·好みフィルター",
  "settings.discoverStart": "マッチング開始",
  "settings.discoverSettings": "マッチング設定",
  "settings.cosplayTitle": "コスプレ",
  "settings.cosplayRegistered": "コスプレプロフィールが登録されています。",
  "settings.cosplayProfile": "コスプレプロフィール",
  "settings.cosplayApplyDesc": "写真1枚 · 300字 · アニメ連携",
  "settings.cosplayApply": "コスプレ登録",
  "settings.otakuTitle": "オタクプロフィール",
  "settings.favoriteChars": "好きなキャラ: {chars}",
  "settings.none": "なし",
  "settings.security": "セキュリティ",
  "settings.twoFactor": "二段階認証",
  "settings.twoFactorOn": "有効",
  "settings.twoFactorOff": "無効",
  "settings.nsfw": "NSFW表示",
  "settings.nsfwOn": "オン",
  "settings.nsfwOff": "オフ",
  "settings.legalTitle": "規約とポリシー",
  "settings.legalTerms": "利用規約",
  "settings.legalCreator": "クリエイター規約",
  "settings.legalPayment": "決済・返金",
  "settings.legalCopyright": "著作権",
  "settings.legalPrivacy": "プライバシー",
  "settings.legalDeletion": "アカウント削除",
  "settings.legalPolicy": "コミュニティポリシー",
  "common.loading": "読み込み中…",
  "feed.title": "コミュニティフィード",
  "feed.displayMode.compactHasMedia": "画像あり",
  "feed.displayMode.openPost": "投稿を見る",
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
  "auth.emailSignIn": "メールでログイン",
  "auth.signInDiscord": "Discordでログイン",
  "auth.signInTwitter": "Xでログイン",
  "auth.signInGoogle": "Googleでログイン",
  "auth.emailVerifyForgot": "メール認証 · パスワード再設定",
  "auth.callbackRedirect": "ログイン後、前の画面に戻ります。",
  "auth.oauthNotConfigured": "Google・X・DiscordログインはOAuth設定が必要です。",
  "auth.signupPageTitle": "{brand} 会員登録",
  "auth.signupPageDesc": "情報を入力し、メール認証で登録を完了します。",
  "auth.signupOAuthDesc": "Discord、Gmail、Naver、X のいずれかで始めましょう。",
  "auth.signupGmailTitle": "Gmailで{brand}に登録",
  "auth.signupGmailDesc": "Gmailアドレスと登録情報を入力してください。",
  "auth.signupNaverTitle": "Naverで{brand}に登録",
  "auth.signupNaverDesc": "Naverメールアドレスと登録情報を入力してください。",
  "auth.backToSignupMethods": "他の登録方法へ",
  "auth.invalidGmail": "Gmailアドレス（@gmail.com）を入力してください。",
  "auth.invalidNaver": "Naverメール（@naver.com）を入力してください。",
  "auth.gmailLocalHint": "@ の前だけ入力してください。",
  "auth.naverLocalHint": "@naver.com は自動で付きます。",
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
  "auth.signUpGmail": "Gmailで登録",
  "auth.signInGmail": "Gmailでログイン",
  "auth.signUpNaver": "Naverで登録",
  "auth.signInNaver": "Naverでログイン",
  "auth.oauthProviderUnavailable": "このログイン方法は準備中です。DiscordまたはXをご利用ください。",
  "auth.invalidEmail": "有効なメールを入力してください。",
  "auth.serverError": "サーバーエラーです。しばらくして再試行してください。",
  "auth.signupCheckFailed": "登録情報を確認できませんでした。",
  "auth.humanCheckTitle": "本人確認",
  "auth.humanCheckDesc": "{email} に認証メールを送ります。下のクイズを解いて続けてください。",
  "auth.humanQuizBadge": "本人確認 · 無料クイズ",
  "auth.humanQuizRefresh": "別の問題にする",
  "auth.sendingVerifyEmail": "認証メール送信中...",
  "auth.editSignupInfo": "登録情報を修正",
  "auth.challengeBootFailed": "問題を読み込めませんでした。更新してください。",
  "auth.challengePreparing": "問題を準備中...",
  "auth.pickAnswer": "正解を選んでください。",
  "auth.challengeLoading": "問題を読み込み中...",
  "auth.backToSignup": "登録情報に戻る",
  "auth.reload": "更新",
  "auth.emailCodeTitle": "メール認証コード入力",
  "auth.emailCodeDescSignup": "受信トレイ（迷惑メール含む）の6桁コードを入力してください。",
  "auth.emailCodeDescGeneric": "6桁コードでメールを確認するか、パスワードを再設定します。",
  "auth.signupVerifyTab": "登録認証",
  "auth.passwordResetTab": "パスワード再設定",
  "auth.resendCode": "認証コードを再送信",
  "auth.sendCode": "認証コードを送信",
  "auth.sending": "送信中...",
  "auth.codePlaceholder": "6桁の認証コード",
  "auth.verifyGoHome": "コード確認 · ホームへ",
  "auth.verifyChecking": "確認中...",
  "auth.verifyCodeToPassword": "コード確認 → パスワード設定",
  "auth.checkSpam": "迷惑メールもご確認ください。",
  "auth.backToSigninLink": "ログインへ",
  "auth.emailVerifyDone": "メール認証完了",
  "auth.verifyDoneLoginDesc": "認証が完了しました。下のパスワードでログインしてください。",
  "auth.signupPasswordHint": "登録時に設定したパスワード",
  "auth.hidePassword": "隠す",
  "auth.showPassword": "表示",
  "auth.loginAndHome": "ログインしてホームへ",
  "auth.forgetPasswordInfo": "登録時のパスワードでログインしてください。忘れた場合は下で再設定できます。",
  "auth.setNewPasswordAction": "新しいパスワードを設定",
  "auth.passwordResetDone": "新しいパスワードが設定されました。",
  "auth.loginAction": "ログイン",
  "auth.newPasswordTitle": "新しいパスワード設定",
  "auth.newPasswordDesc": "コード確認完了。新しいパスワードを入力してください。",
  "auth.newPasswordPlaceholder": "新しいパスワード（8文字以上）",
  "auth.confirmPasswordPlaceholder": "新しいパスワード確認",
  "auth.saving": "保存中...",
  "auth.changePassword": "パスワード変更",
  "auth.reenterCode": "コードを再入力",
  "auth.signingInProgress": "ログイン中...",
  "auth.verifyLoginProgress": "認証 · ログイン中...",
  "auth.turnstileLoading": "セキュリティ確認を準備中...",
  "auth.turnstileRequired": "下のセキュリティ確認を完了してください。",
  "auth.codeSent": "認証コードを送信しました。",
  "auth.checkEmailCode": "メールの6桁認証コードをご確認ください。",
  "auth.noticeDialogTitle": "お知らせ",
  "auth.confirmAction": "確認",
  "auth.unregisteredEmail": "登録されていないメールです。",
  "auth.passwordMinLength": "パスワードは8文字以上必要です。",
  "auth.passwordMismatch": "パスワード確認が一致しません。",
  "auth.verifyDoneLoginHint": "認証は完了しました。下からログインしてください。",
  "auth.setNewPasswordPrompt": "新しいパスワードを設定するには認証コードを再取得してください。",
  "auth.rateLimitHint": "メール・IPごとにリクエスト回数が制限されます。",
  "auth.emailDeliveryHelp": "届かない場合は迷惑メールを確認し、1分後に再送信してください。",
  "auth.emailDeliveryHelpMicrosoft": "Outlook/Hotmailは新しい送信者を迷惑メールに入れることがあります。受信トレイ・迷惑メールを確認してください。",
  "auth.emailDeliveryHelpApple": "iCloudメールの迷惑メール・ゴミ箱を確認してください。Hide My Email利用時はリレーアドレスを確認してください。",
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
  "nav.mailbox": "邮箱",
  "common.search": "搜索",
  "explore.quickNavAria": "快捷入口",
  "explore.matchSub": "喜好·距离",
  "explore.liveSub": "观看直播",
  "explore.gamesSub": "小游戏",
  "explore.usedSub": "二手市场",
  "explore.matchTitle": "好友 · Cosplay 匹配",
  "explore.matchDesc": "随时参与 · 喜好·距离·年龄筛选 · 点赞与匹配",
  "explore.start": "开始",
  "explore.liveNow": "正在直播",
  "explore.viewAll": "查看全部",
  "explore.viewers": "{count} 人观看",
  "explore.trendingPosts": "热门帖子",
  "explore.trendingEmpty": "暂无帖子 — 注册后发布第一条吧",
  "explore.newUsers": "新用户",
  "explore.beFirstUser": "成为第一个用户",
  "explore.dbError": "数据库连接后将显示探索列表。",
  "live.heroDesc": "浏览器开播 · 实时观看 · 打赏与聊天。每位主播有独立频道。",
  "live.feature.webcam": "摄像头 · 屏幕共享",
  "live.feature.voice": "语音直播",
  "live.feature.chat": "实时聊天",
  "live.feature.moderation": "慢速 · 敏感词",
  "live.feature.support": "打赏 · 观众",
  "live.searchPlaceholder": "搜索主播、标签、帖子",
  "live.modeAll": "全部",
  "live.modeVideo": "视频",
  "live.modeVoice": "语音",
  "live.scheduled": "预约直播",
  "live.followedLive": "关注的直播",
  "live.recommendedStreamers": "推荐主播",
  "live.followFeed": "关注动态",
  "live.followFeedDesc": "你关注的创作者帖子会出现在首页动态。",
  "live.goHomeFeed": "前往首页动态",
  "live.onAir": "正在播出",
  "live.totalViewers": "总观众",
  "live.liveBroadcasts": "实时直播",
  "live.emptyCategory": "该分类暂无进行中的直播。",
  "live.followers": "{count} 粉丝",
  "live.voiceBadge": "语音",
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
  "post.menu.ariaLabel": "帖子菜单",
  "post.menu.delete": "删除",
  "post.menu.deleteConfirm": "确定删除这篇帖子吗？此操作无法撤销。",
  "post.menu.pinToProfile": "置顶到个人主页",
  "post.menu.unpinFromProfile": "取消主页置顶",
  "translate.viewTranslation": "查看翻译",
  "translate.viewOriginal": "查看原文",
  "translate.sourceLanguage": "原文语言：{language}",
  "translate.loading": "翻译中…",
  "translate.failed": "无法翻译",
  "settings.title": "设置",
  "settings.localeTitle": "国家与语言",
  "settings.localeDesc": "个人资料国旗与应用显示语言",
  "settings.country": "国家/地区",
  "settings.language": "语言",
  "settings.save": "保存",
  "settings.saved": "已保存",
  "settings.feedDisplayTitle": "动态布局",
  "settings.feedDisplayDesc": "选择动态中文字与图片的展示方式。",
  "settings.feedDisplayTimeline": "时间线",
  "settings.feedDisplayTimelineDesc": "正文与图片直接展示。",
  "settings.feedDisplayCompact": "列表",
  "settings.feedDisplayCompactDesc": "仅预览，点击展开正文与图片。",
  "settings.account": "账户",
  "settings.nickname": "用户名",
  "settings.email": "邮箱",
  "settings.level": "等级: Lv.{level} (XP {xp})",
  "settings.premium": "会员",
  "settings.profile": "个人资料",
  "settings.noBio": "暂无简介",
  "settings.editProfile": "编辑资料",
  "settings.creatorRevenue": "创作者收益",
  "settings.supportTier": "支持等级",
  "settings.discoverTitle": "好友 ·  cosplay 匹配",
  "settings.discoverDesc": "随时参与 · 距离/年龄/喜好筛选",
  "settings.discoverStart": "开始匹配",
  "settings.discoverSettings": "匹配设置",
  "settings.cosplayTitle": "Cosplay",
  "settings.cosplayRegistered": "已注册 cosplay 资料。",
  "settings.cosplayProfile": "Cosplay 资料",
  "settings.cosplayApplyDesc": "1 张照片 · 300 字简介 · 动漫关联",
  "settings.cosplayApply": "注册 cosplayer",
  "settings.otakuTitle": "动漫粉丝资料",
  "settings.favoriteChars": "喜欢的角色: {chars}",
  "settings.none": "无",
  "settings.security": "安全",
  "settings.twoFactor": "两步验证",
  "settings.twoFactorOn": "已开启",
  "settings.twoFactorOff": "已关闭",
  "settings.nsfw": "NSFW 内容",
  "settings.nsfwOn": "开启",
  "settings.nsfwOff": "关闭",
  "settings.legalTitle": "条款与政策",
  "settings.legalTerms": "服务条款",
  "settings.legalCreator": "创作者条款",
  "settings.legalPayment": "支付与退款",
  "settings.legalCopyright": "版权政策",
  "settings.legalPrivacy": "隐私政策",
  "settings.legalDeletion": "账户与数据删除",
  "settings.legalPolicy": "社区政策",
  "common.loading": "加载中…",
  "feed.title": "社区动态",
  "feed.displayMode.compactHasMedia": "含图片",
  "feed.displayMode.openPost": "查看帖子",
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
  "auth.emailSignIn": "邮箱登录",
  "auth.signInDiscord": "用 Discord 登录",
  "auth.signInTwitter": "用 X 登录",
  "auth.signInGoogle": "用 Google 登录",
  "auth.emailVerifyForgot": "邮箱验证 · 找回密码",
  "auth.callbackRedirect": "登录后将返回之前的页面。",
  "auth.oauthNotConfigured": "Google、X、Discord 登录需要配置 OAuth。",
  "auth.signupPageTitle": "注册 {brand}",
  "auth.signupPageDesc": "填写信息后通过邮箱验证完成注册。",
  "auth.signupOAuthDesc": "使用 Discord、Gmail、Naver 或 X 开始。",
  "auth.signupGmailTitle": "用 Gmail 注册 {brand}",
  "auth.signupGmailDesc": "请输入 Gmail 地址和注册信息。",
  "auth.signupNaverTitle": "用 Naver 注册 {brand}",
  "auth.signupNaverDesc": "请输入 Naver 邮箱地址和注册信息。",
  "auth.backToSignupMethods": "其他注册方式",
  "auth.invalidGmail": "请输入 Gmail 地址（@gmail.com）。",
  "auth.invalidNaver": "请输入 Naver 邮箱（@naver.com）。",
  "auth.gmailLocalHint": "只需输入 @ 前面的部分。",
  "auth.naverLocalHint": "会自动添加 @naver.com。",
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
  "auth.signUpGmail": "用 Gmail 注册",
  "auth.signInGmail": "用 Gmail 登录",
  "auth.signUpNaver": "用 Naver 注册",
  "auth.signInNaver": "用 Naver 登录",
  "auth.oauthProviderUnavailable": "该登录方式尚未就绪，请暂时使用 Discord 或 X。",
  "auth.invalidEmail": "请输入有效的邮箱地址。",
  "auth.serverError": "服务器错误，请稍后再试。",
  "auth.signupCheckFailed": "无法验证您的注册信息。",
  "auth.humanCheckTitle": "人机验证",
  "auth.humanCheckDesc": "我们将向 {email} 发送验证邮件。请完成下方测验后继续。",
  "auth.humanQuizBadge": "人机验证 · 免费测验",
  "auth.humanQuizRefresh": "换一题",
  "auth.sendingVerifyEmail": "正在发送验证邮件...",
  "auth.editSignupInfo": "修改注册信息",
  "auth.challengeBootFailed": "无法加载题目，请刷新页面。",
  "auth.challengePreparing": "正在准备题目...",
  "auth.pickAnswer": "请选择正确答案。",
  "auth.challengeLoading": "正在加载题目...",
  "auth.backToSignup": "返回注册信息",
  "auth.reload": "刷新",
  "auth.emailCodeTitle": "输入邮箱验证码",
  "auth.emailCodeDescSignup": "请输入收件箱（含垃圾邮件）中的 6 位验证码。",
  "auth.emailCodeDescGeneric": "用 6 位验证码确认邮箱，或重置密码。",
  "auth.signupVerifyTab": "注册验证",
  "auth.passwordResetTab": "找回密码",
  "auth.resendCode": "重新发送验证码",
  "auth.sendCode": "发送验证码",
  "auth.sending": "发送中...",
  "auth.codePlaceholder": "6 位验证码",
  "auth.verifyGoHome": "验证 · 前往首页",
  "auth.verifyChecking": "验证中...",
  "auth.verifyCodeToPassword": "验证 → 设置密码",
  "auth.checkSpam": "也请检查垃圾邮件文件夹。",
  "auth.backToSigninLink": "返回登录",
  "auth.emailVerifyDone": "邮箱验证完成",
  "auth.verifyDoneLoginDesc": "验证完成，请使用下方密码登录。",
  "auth.signupPasswordHint": "注册时设置的密码",
  "auth.hidePassword": "隐藏",
  "auth.showPassword": "显示",
  "auth.loginAndHome": "登录并前往首页",
  "auth.forgetPasswordInfo": "请使用注册时的密码登录。如忘记可在下方重新设置。",
  "auth.setNewPasswordAction": "设置新密码",
  "auth.passwordResetDone": "新密码已设置。",
  "auth.loginAction": "登录",
  "auth.newPasswordTitle": "设置新密码",
  "auth.newPasswordDesc": "验证码已确认，请输入新密码。",
  "auth.newPasswordPlaceholder": "新密码（至少 8 位）",
  "auth.confirmPasswordPlaceholder": "确认新密码",
  "auth.saving": "保存中...",
  "auth.changePassword": "更改密码",
  "auth.reenterCode": "重新输入验证码",
  "auth.signingInProgress": "登录中...",
  "auth.verifyLoginProgress": "验证 · 登录中...",
  "auth.turnstileLoading": "正在准备安全验证...",
  "auth.turnstileRequired": "请完成下方安全验证。",
  "auth.codeSent": "验证码已发送。",
  "auth.checkEmailCode": "请查收邮件中的 6 位验证码。",
  "auth.noticeDialogTitle": "提示",
  "auth.confirmAction": "确定",
  "auth.unregisteredEmail": "该邮箱未注册。",
  "auth.passwordMinLength": "密码至少需要 8 个字符。",
  "auth.passwordMismatch": "两次输入的密码不一致。",
  "auth.verifyDoneLoginHint": "验证已完成，请在下方登录。",
  "auth.setNewPasswordPrompt": "如需设置新密码，请重新获取验证码。",
  "auth.rateLimitHint": "每个邮箱和 IP 的请求次数有限制。",
  "auth.emailDeliveryHelp": "没收到邮件？请检查垃圾邮件文件夹，1 分钟后点「重新发送验证码」。",
  "auth.emailDeliveryHelpMicrosoft": "Outlook/Hotmail 常将新发件人归入垃圾邮件。请检查收件箱和垃圾邮件文件夹。",
  "auth.emailDeliveryHelpApple": "请检查 iCloud 邮件的垃圾邮件和废纸篓。使用 Hide My Email 时请查看中继地址。",
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
