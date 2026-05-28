import type { HumanChallengeChoice } from "@/lib/human-challenge-types";

export type OddOneChallenge = {
  prompt: string;
  hint?: string;
  correct: HumanChallengeChoice;
  wrong: HumanChallengeChoice[];
};

export type SequenceChallenge = {
  prompt: string;
  hint?: string;
  correct: HumanChallengeChoice;
  wrong: HumanChallengeChoice[];
};

export type TriviaChallenge = {
  prompt: string;
  hint?: string;
  correct: HumanChallengeChoice;
  wrong: HumanChallengeChoice[];
};

/** 이상한 것 고르기 — 40+ */
export const ODD_ONE_BANK: OddOneChallenge[] = [
  {
    prompt: "과일이 아닌 것은?",
    correct: { id: "car", label: "🚗 자동차" },
    wrong: [
      { id: "apple", label: "🍎 사과" },
      { id: "grape", label: "🍇 포도" },
      { id: "banana", label: "🍌 바나나" },
      { id: "melon", label: "🍈 멜론" },
    ],
  },
  {
    prompt: "동물이 아닌 것은?",
    correct: { id: "book", label: "📚 책" },
    wrong: [
      { id: "cat", label: "🐱 고양이" },
      { id: "dog", label: "🐶 강아지" },
      { id: "rabbit", label: "🐰 토끼" },
      { id: "hamster", label: "🐹 햄스터" },
    ],
  },
  {
    prompt: "탈것이 아닌 것은?",
    correct: { id: "tree", label: "🌳 나무" },
    wrong: [
      { id: "plane", label: "✈️ 비행기" },
      { id: "train", label: "🚆 기차" },
      { id: "bike", label: "🚲 자전거" },
      { id: "bus", label: "🚌 버스" },
    ],
  },
  {
    prompt: "음식이 아닌 것은?",
    correct: { id: "pencil", label: "✏️ 연필" },
    wrong: [
      { id: "rice", label: "🍚 밥" },
      { id: "pizza", label: "🍕 피자" },
      { id: "sushi", label: "🍣 초밥" },
      { id: "bread", label: "🍞 빵" },
    ],
  },
  {
    prompt: "전자기기가 아닌 것은?",
    correct: { id: "flower", label: "🌸 꽃" },
    wrong: [
      { id: "phone", label: "📱 스마트폰" },
      { id: "laptop", label: "💻 노트북" },
      { id: "tv", label: "📺 TV" },
      { id: "camera", label: "📷 카메라" },
    ],
  },
  {
    prompt: "스포츠가 아닌 것은?",
    correct: { id: "guitar", label: "🎸 기타" },
    wrong: [
      { id: "soccer", label: "⚽ 축구" },
      { id: "basket", label: "🏀 농구" },
      { id: "tennis", label: "🎾 테니스" },
      { id: "baseball", label: "⚾ 야구" },
    ],
  },
  {
    prompt: "날씨·자연 현상이 아닌 것은?",
    correct: { id: "chair", label: "🪑 의자" },
    wrong: [
      { id: "sun", label: "☀️ 맑음" },
      { id: "rain", label: "🌧️ 비" },
      { id: "snow", label: "❄️ 눈" },
      { id: "cloud", label: "☁️ 구름" },
    ],
  },
  {
    prompt: "악기가 아닌 것은?",
    correct: { id: "cake", label: "🎂 케이크" },
    wrong: [
      { id: "piano", label: "🎹 피아노" },
      { id: "drum", label: "🥁 드럼" },
      { id: "violin", label: "🎻 바이올린" },
      { id: "trumpet", label: "🎺 트럼펫" },
    ],
  },
  {
    prompt: "바다에 사는 것이 아닌 것은?",
    correct: { id: "owl", label: "🦉 부엉이" },
    wrong: [
      { id: "fish", label: "🐟 물고기" },
      { id: "whale", label: "🐋 고래" },
      { id: "octopus", label: "🐙 문어" },
      { id: "crab", label: "🦀 게" },
    ],
  },
  {
    prompt: "옷·패션이 아닌 것은?",
    correct: { id: "clock", label: "⏰ 시계" },
    wrong: [
      { id: "shirt", label: "👕 티셔츠" },
      { id: "dress", label: "👗 원피스" },
      { id: "shoes", label: "👟 운동화" },
      { id: "hat", label: "🧢 모자" },
    ],
  },
  {
    prompt: "건물이 아닌 것은?",
    correct: { id: "mountain", label: "⛰️ 산" },
    wrong: [
      { id: "school", label: "🏫 학교" },
      { id: "hospital", label: "🏥 병원" },
      { id: "castle", label: "🏰 성" },
      { id: "store", label: "🏪 상점" },
    ],
  },
  {
    prompt: "곤충이 아닌 것은?",
    correct: { id: "penguin", label: "🐧 펭귄" },
    wrong: [
      { id: "bee", label: "🐝 벌" },
      { id: "butterfly", label: "🦋 나비" },
      { id: "ant", label: "🐜 개미" },
      { id: "ladybug", label: "🐞 무당벌레" },
    ],
  },
  {
    prompt: "한국 전통 음식이 아닌 것은?",
    correct: { id: "taco", label: "🌮 타코" },
    wrong: [
      { id: "kimchi", label: "🥬 김치" },
      { id: "bibim", label: "🍲 비빔밥" },
      { id: "tteok", label: "🍡 떡" },
      { id: "ramyeon", label: "🍜 라면" },
    ],
  },
  {
    prompt: "애니·만화 쪽이 아닌 것은?",
    correct: { id: "newspaper", label: "📰 신문" },
    wrong: [
      { id: "manga", label: "📖 만화책" },
      { id: "figure", label: "🎎 피규어" },
      { id: "cosplay", label: "🎭 코스프레" },
      { id: "poster", label: "🖼️ 포스터" },
    ],
  },
  {
    prompt: "게임 장르가 아닌 것은?",
    correct: { id: "cooking", label: "👨‍🍳 요리책" },
    wrong: [
      { id: "rpg", label: "⚔️ RPG" },
      { id: "fps", label: "🔫 슈팅" },
      { id: "puzzle", label: "🧩 퍼즐게임" },
      { id: "racing", label: "🏎️ 레이싱" },
    ],
  },
  {
    prompt: "감정 이모지가 아닌 것은?",
    correct: { id: "keyboard", label: "⌨️ 키보드" },
    wrong: [
      { id: "happy", label: "😊 웃음" },
      { id: "sad", label: "😢 슬픔" },
      { id: "angry", label: "😠 화남" },
      { id: "love", label: "😍 하트" },
    ],
  },
  {
    prompt: "새가 아닌 것은?",
    correct: { id: "dolphin", label: "🐬 돌고래" },
    wrong: [
      { id: "eagle", label: "🦅 독수리" },
      { id: "duck", label: "🦆 오리" },
      { id: "parrot", label: "🦜 앵무새" },
      { id: "chick", label: "🐤 병아리" },
    ],
  },
  {
    prompt: "야채가 아닌 것은?",
    correct: { id: "cookie", label: "🍪 쿠키" },
    wrong: [
      { id: "carrot", label: "🥕 당근" },
      { id: "broccoli", label: "🥦 브로콜리" },
      { id: "tomato", label: "🍅 토마토" },
      { id: "corn", label: "🌽 옥수수" },
    ],
  },
  {
    prompt: "직업이 아닌 것은?",
    correct: { id: "moon", label: "🌙 달" },
    wrong: [
      { id: "doctor", label: "👨‍⚕️ 의사" },
      { id: "chef", label: "👨‍🍳 요리사" },
      { id: "artist", label: "👨‍🎨 화가" },
      { id: "pilot", label: "👨‍✈️ 조종사" },
    ],
  },
  {
    prompt: "겨울 스포츠가 아닌 것은?",
    correct: { id: "surf", label: "🏄 서핑" },
    wrong: [
      { id: "ski", label: "⛷️ 스키" },
      { id: "skate", label: "⛸️ 스케이트" },
      { id: "sled", label: "🛷 썰매" },
      { id: "snowboard", label: "🏂 스노보드" },
    ],
  },
  {
    prompt: "꽃이 아닌 것은?",
    correct: { id: "rock", label: "🪨 돌" },
    wrong: [
      { id: "rose", label: "🌹 장미" },
      { id: "sunflower", label: "🌻 해바라기" },
      { id: "tulip", label: "🌷 튤립" },
      { id: "cherry", label: "🌸 벚꽃" },
    ],
  },
  {
    prompt: "물가에 있는 것이 아닌 것은?",
    correct: { id: "cactus", label: "🌵 선인장" },
    wrong: [
      { id: "duck2", label: "🦆 오리" },
      { id: "boat", label: "⛵ 요트" },
      { id: "anchor", label: "⚓ 닻" },
      { id: "wave", label: "🌊 파도" },
    ],
  },
  {
    prompt: "공포·호러 분위기가 아닌 것은?",
    correct: { id: "rainbow", label: "🌈 무지개" },
    wrong: [
      { id: "ghost", label: "👻 유령" },
      { id: "skull", label: "💀 해골" },
      { id: "spider", label: "🕷️ 거미" },
      { id: "bat", label: "🦇 박쥐" },
    ],
  },
  {
    prompt: "키보드·입력이 아닌 것은?",
    correct: { id: "balloon", label: "🎈 풍선" },
    wrong: [
      { id: "mouse", label: "🖱️ 마우스" },
      { id: "keyboard2", label: "⌨️ 키보드" },
      { id: "joystick", label: "🕹️ 조이스틱" },
      { id: "touch", label: "👆 터치" },
    ],
  },
  {
    prompt: "우주·천체가 아닌 것은?",
    correct: { id: "house", label: "🏠 집" },
    wrong: [
      { id: "star", label: "⭐ 별" },
      { id: "comet", label: "☄️ 혜성" },
      { id: "saturn", label: "🪐 토성" },
      { id: "rocket", label: "🚀 로켓" },
    ],
  },
  {
    prompt: "액체가 아닌 것은?",
    correct: { id: "brick", label: "🧱 벽돌" },
    wrong: [
      { id: "water", label: "💧 물" },
      { id: "milk", label: "🥛 우유" },
      { id: "juice", label: "🧃 주스" },
      { id: "coffee", label: "☕ 커피" },
    ],
  },
  {
    prompt: "축제·이벤트가 아닌 것은?",
    correct: { id: "laundry", label: "🧺 빨래" },
    wrong: [
      { id: "firework", label: "🎆 불꽃" },
      { id: "ticket", label: "🎫 티켓" },
      { id: "party", label: "🎉 파티" },
      { id: "gift", label: "🎁 선물" },
    ],
  },
  {
    prompt: "포유류가 아닌 것은?",
    correct: { id: "frog", label: "🐸 개구리" },
    wrong: [
      { id: "bear", label: "🐻 곰" },
      { id: "lion", label: "🦁 사자" },
      { id: "fox", label: "🦊 여우" },
      { id: "panda", label: "🐼 판다" },
    ],
  },
  {
    prompt: "학용품이 아닌 것은?",
    correct: { id: "umbrella", label: "☂️ 우산" },
    wrong: [
      { id: "notebook", label: "📓 공책" },
      { id: "ruler", label: "📏 자" },
      { id: "scissors", label: "✂️ 가위" },
      { id: "pen", label: "🖊️ 펜" },
    ],
  },
  {
    prompt: "디저트·간식이 아닌 것은?",
    correct: { id: "hammer", label: "🔨 망치" },
    wrong: [
      { id: "icecream", label: "🍦 아이스크림" },
      { id: "donut", label: "🍩 도넛" },
      { id: "choco", label: "🍫 초콜릿" },
      { id: "candy", label: "🍬 사탕" },
    ],
  },
  {
    prompt: "빨간색 계열이 아닌 것은?",
    correct: { id: "blue_circle", label: "🔵 파란 원" },
    wrong: [
      { id: "red_circle", label: "🔴 빨간 원" },
      { id: "strawberry", label: "🍓 딸기" },
      { id: "heart", label: "❤️ 하트" },
      { id: "rose2", label: "🌹 장미" },
    ],
  },
  {
    prompt: "악세서리가 아닌 것은?",
    correct: { id: "toaster", label: "🍞 토스터" },
    wrong: [
      { id: "ring", label: "💍 반지" },
      { id: "necklace", label: "📿 목걸이" },
      { id: "watch", label: "⌚ 시계" },
      { id: "glasses", label: "👓 안경" },
    ],
  },
  {
    prompt: "놀이공원이 아닌 것은?",
    correct: { id: "library", label: "📚 도서관" },
    wrong: [
      { id: "ferris", label: "🎡 관람차" },
      { id: "coaster", label: "🎢 롤러코스터" },
      { id: "carousel", label: "🎠 회전목마" },
      { id: "circus", label: "🎪 서커스" },
    ],
  },
  {
    prompt: "수영할 수 없는 것은?",
    correct: { id: "desk", label: "🗄️ 책상" },
    wrong: [
      { id: "swimmer", label: "🏊 수영" },
      { id: "pool", label: "🏊‍♂️ 수영장" },
      { id: "fish2", label: "🐠 열대어" },
      { id: "snorkel", label: "🤿 스노클" },
    ],
  },
  {
    prompt: "악당·보스 느낌이 아닌 것은?",
    correct: { id: "bunny", label: "🐇 토끼" },
    wrong: [
      { id: "dragon", label: "🐉 드래곤" },
      { id: "ogre", label: "👹 오니" },
      { id: "robot", label: "🤖 로봇" },
      { id: "alien", label: "👽 외계인" },
    ],
  },
  {
    prompt: "촬영·영상과 가장 멀 것은?",
    correct: { id: "onion", label: "🧅 양파" },
    wrong: [
      { id: "selfie", label: "🤳 셀카" },
      { id: "video", label: "📹 영상" },
      { id: "flash", label: "📸 플래시" },
      { id: "clapper", label: "🎬 촬영" },
    ],
  },
  {
    prompt: "MoCoMo 커뮤니티 주제와 가장 멀 것은?",
    hint: "서브컬처·굿즈·코스프레 중심",
    correct: { id: "tax", label: "📑 세금 신고" },
    wrong: [
      { id: "anime", label: "📺 애니" },
      { id: "goods", label: "🛍️ 굿즈" },
      { id: "cos", label: "🎭 코스프레" },
      { id: "fanart", label: "🎨 팬아트" },
    ],
  },
  {
    prompt: "소셜·채팅이 아닌 것은?",
    correct: { id: "tractor", label: "🚜 트랙터" },
    wrong: [
      { id: "chat", label: "💬 채팅" },
      { id: "dm", label: "✉️ DM" },
      { id: "voice", label: "🎙️ 보이스" },
      { id: "live", label: "📡 라이브" },
    ],
  },
  {
    prompt: "날아다니는 것이 아닌 것은?",
    correct: { id: "snail", label: "🐌 달팽이" },
    wrong: [
      { id: "heli", label: "🚁 헬기" },
      { id: "balloon2", label: "🎈 열기구" },
      { id: "kite", label: "🪁 연" },
      { id: "bird", label: "🐦 새" },
    ],
  },
  {
    prompt: "숫자가 아닌 것은?",
    correct: { id: "letter", label: "🔤 글자 A" },
    wrong: [
      { id: "one", label: "1️⃣ 하나" },
      { id: "five", label: "5️⃣ 다섯" },
      { id: "ten", label: "🔟 열" },
      { id: "hundred", label: "💯 백" },
    ],
  },
];

/** 다음에 올 숫자 */
export const SEQUENCE_BANK: SequenceChallenge[] = [
  {
    prompt: "2 → 4 → 6 → ?",
    hint: "규칙을 찾아 다음 숫자를 고르세요.",
    correct: { id: "8", label: "8" },
    wrong: [
      { id: "7", label: "7" },
      { id: "9", label: "9" },
      { id: "10", label: "10" },
      { id: "12", label: "12" },
    ],
  },
  {
    prompt: "1 → 3 → 5 → ?",
    correct: { id: "7", label: "7" },
    wrong: [
      { id: "6", label: "6" },
      { id: "8", label: "8" },
      { id: "9", label: "9" },
      { id: "4", label: "4" },
    ],
  },
  {
    prompt: "10 → 9 → 8 → ?",
    hint: "줄어드는 패턴입니다.",
    correct: { id: "7", label: "7" },
    wrong: [
      { id: "6", label: "6" },
      { id: "8", label: "8" },
      { id: "11", label: "11" },
      { id: "5", label: "5" },
    ],
  },
  {
    prompt: "3 → 6 → 9 → ?",
    correct: { id: "12", label: "12" },
    wrong: [
      { id: "10", label: "10" },
      { id: "11", label: "11" },
      { id: "15", label: "15" },
      { id: "8", label: "8" },
    ],
  },
  {
    prompt: "5 → 10 → 15 → ?",
    correct: { id: "20", label: "20" },
    wrong: [
      { id: "18", label: "18" },
      { id: "22", label: "22" },
      { id: "25", label: "25" },
      { id: "16", label: "16" },
    ],
  },
  {
    prompt: "1 → 2 → 4 → 8 → ?",
    hint: "두 배씩 늘어납니다.",
    correct: { id: "16", label: "16" },
    wrong: [
      { id: "10", label: "10" },
      { id: "12", label: "12" },
      { id: "14", label: "14" },
      { id: "18", label: "18" },
    ],
  },
  {
    prompt: "100 → 90 → 80 → ?",
    correct: { id: "70", label: "70" },
    wrong: [
      { id: "60", label: "60" },
      { id: "75", label: "75" },
      { id: "85", label: "85" },
      { id: "50", label: "50" },
    ],
  },
  {
    prompt: "1 → 4 → 9 → ?",
    hint: "제곱 수열입니다.",
    correct: { id: "16", label: "16" },
    wrong: [
      { id: "12", label: "12" },
      { id: "14", label: "14" },
      { id: "18", label: "18" },
      { id: "20", label: "20" },
    ],
  },
];

/** 서브컬처 상식 */
export const TRIVIA_BANK: TriviaChallenge[] = [
  {
    prompt: "일본 애니메이션을 뜻하는 말은?",
    correct: { id: "anime", label: "애니메이션(애니)" },
    wrong: [
      { id: "kdrama", label: "케이드라마" },
      { id: "bollywood", label: "발리우드" },
      { id: "opera", label: "오페라" },
      { id: "ballet", label: "발레" },
    ],
  },
  {
    prompt: "캐릭터 의상을 재현하는 활동은?",
    correct: { id: "cosplay", label: "코스프레" },
    wrong: [
      { id: "cooking2", label: "요리" },
      { id: "garden", label: "정원 가꾸기" },
      { id: "fishing", label: "낚시" },
      { id: "running", label: "마라톤" },
    ],
  },
  {
    prompt: "팬이 그린 2차 창작 그림을 흔히 뭐라고 부를까요?",
    correct: { id: "fanart", label: "팬아트" },
    wrong: [
      { id: "blueprint", label: "청사진" },
      { id: "invoice", label: "송장" },
      { id: "map", label: "지도" },
      { id: "recipe", label: "레시피" },
    ],
  },
  {
    prompt: "굿즈·피규어를 사고파는 마켓은?",
    correct: { id: "goods", label: "굿즈 마켓" },
    wrong: [
      { id: "fishmarket", label: "수산 시장" },
      { id: "stock", label: "주식 시장" },
      { id: "flea", label: "벼룩시장만" },
      { id: "gas", label: "주유소" },
    ],
  },
  {
    prompt: "오타쿠 문화와 가장 가까운 취미는?",
    correct: { id: "figure", label: "피규어 수집" },
    wrong: [
      { id: "golf", label: "골프" },
      { id: "chess", label: "체스만" },
      { id: "knit", label: "뜨개질만" },
      { id: "stamp", label: "우표 수집만" },
    ],
  },
  {
    prompt: "라이트 노벨을 원작으로 한 작품이 많은 분야는?",
    correct: { id: "ln_anime", label: "라노벨·애니" },
    wrong: [
      { id: "news", label: "뉴스" },
      { id: "sports", label: "스포츠 중계만" },
      { id: "weather", label: "일기예보만" },
      { id: "cook", label: "요리책만" },
    ],
  },
  {
    prompt: "VTuber·스트리밍과 가까운 것은?",
    correct: { id: "live2", label: "라이브 방송" },
    wrong: [
      { id: "mail", label: "우편" },
      { id: "fax", label: "팩스" },
      { id: "typewriter", label: "타자기" },
      { id: "scroll", label: "두루마리" },
    ],
  },
  {
    prompt: "커뮤니티에서 글·사진을 올리는 행위는?",
    correct: { id: "post", label: "게시·포스팅" },
    wrong: [
      { id: "sleep", label: "수면" },
      { id: "dig", label: "땅 파기" },
      { id: "fold", label: "빨래 개기만" },
      { id: "park", label: "주차만" },
    ],
  },
];
