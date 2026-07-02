import type { Locale } from "@/lib/i18n/config";
import type { HumanChallengeChoice } from "@/lib/human-challenge-types";
import type {
  OddOneChallenge,
  SequenceChallenge,
  TriviaChallenge,
} from "@/lib/human-challenge-bank";

type PickChallenge = OddOneChallenge | SequenceChallenge | TriviaChallenge;

const DEFAULT_HINT: Record<Locale, string> = {
  ko: "정답을 골라 주세요.",
  en: "Pick the correct answer.",
  ja: "正解を選んでください。",
  zh: "请选择正确答案。",
};

const MATH_HINTS: Record<Locale, { add: string; sub: string; mul: string }> = {
  ko: {
    add: "덧셈 정답을 고르세요.",
    sub: "뺄셈 정답을 고르세요.",
    mul: "곱셈 정답을 고르세요.",
  },
  en: {
    add: "Pick the correct sum.",
    sub: "Pick the correct difference.",
    mul: "Pick the correct product.",
  },
  ja: {
    add: "足し算の正解を選んでください。",
    sub: "引き算の正解を選んでください。",
    mul: "掛け算の正解を選んでください。",
  },
  zh: {
    add: "请选择正确的和。",
    sub: "请选择正确的差。",
    mul: "请选择正确的积。",
  },
};

const VERIFY_ERRORS: Record<
  Locale,
  { missing: string; expired: string; timeout: string; wrong: string }
> = {
  ko: {
    missing: "확인 퀴즈를 풀어 주세요.",
    expired: "확인 퀴즈가 만료되었습니다. 새로고침 후 다시 시도해 주세요.",
    timeout: "확인 퀴즈 시간이 지났습니다. 새로고침 후 다시 시도해 주세요.",
    wrong: "정답이 아닙니다. 다시 골라 주세요.",
  },
  en: {
    missing: "Please complete the human check quiz.",
    expired: "The quiz expired. Refresh and try again.",
    timeout: "The quiz timed out. Refresh and try again.",
    wrong: "That's not correct. Try again.",
  },
  ja: {
    missing: "本人確認クイズを完了してください。",
    expired: "クイズの有効期限が切れました。更新して再試行してください。",
    timeout: "クイズの時間切れです。更新して再試行してください。",
    wrong: "不正解です。もう一度選んでください。",
  },
  zh: {
    missing: "请完成人机验证测验。",
    expired: "测验已过期，请刷新后重试。",
    timeout: "测验超时，请刷新后重试。",
    wrong: "答案不正确，请重选。",
  },
};

const ODD_PROMPTS: Record<string, Record<Exclude<Locale, "ko">, { prompt: string; hint?: string }>> =
  {
    car: { en: { prompt: "Which is not a fruit?" }, ja: { prompt: "果物ではないものは？" }, zh: { prompt: "哪个不是水果？" } },
    book: { en: { prompt: "Which is not an animal?" }, ja: { prompt: "動物ではないものは？" }, zh: { prompt: "哪个不是动物？" } },
    tree: { en: { prompt: "Which is not a vehicle?" }, ja: { prompt: "乗り物ではないものは？" }, zh: { prompt: "哪个不是交通工具？" } },
    pencil: { en: { prompt: "Which is not food?" }, ja: { prompt: "食べ物ではないものは？" }, zh: { prompt: "哪个不是食物？" } },
    flower: { en: { prompt: "Which is not an electronic device?" }, ja: { prompt: "電子機器ではないものは？" }, zh: { prompt: "哪个不是电子设备？" } },
    guitar: { en: { prompt: "Which is not a sport?" }, ja: { prompt: "スポーツではないものは？" }, zh: { prompt: "哪个不是运动？" } },
    chair: { en: { prompt: "Which is not weather or nature?" }, ja: { prompt: "天気・自然現象ではないものは？" }, zh: { prompt: "哪个不是天气或自然现象？" } },
    cake: { en: { prompt: "Which is not a musical instrument?" }, ja: { prompt: "楽器ではないものは？" }, zh: { prompt: "哪个不是乐器？" } },
    owl: { en: { prompt: "Which does not live in the sea?" }, ja: { prompt: "海に住んでいないものは？" }, zh: { prompt: "哪个不生活在海里？" } },
    clock: { en: { prompt: "Which is not clothing or fashion?" }, ja: { prompt: "服・ファッションではないものは？" }, zh: { prompt: "哪个不是服装？" } },
    mountain: { en: { prompt: "Which is not a building?" }, ja: { prompt: "建物ではないものは？" }, zh: { prompt: "哪个不是建筑？" } },
    penguin: { en: { prompt: "Which is not an insect?" }, ja: { prompt: "昆虫ではないものは？" }, zh: { prompt: "哪个不是昆虫？" } },
    taco: { en: { prompt: "Which is not traditional Korean food?" }, ja: { prompt: "韓国の伝統料理ではないものは？" }, zh: { prompt: "哪个不是韩国传统食物？" } },
    newspaper: { en: { prompt: "Which is not anime or manga related?" }, ja: { prompt: "アニメ・漫画関連ではないものは？" }, zh: { prompt: "哪个与动漫无关？" } },
    cooking: { en: { prompt: "Which is not a game genre?" }, ja: { prompt: "ゲームジャンルではないものは？" }, zh: { prompt: "哪个不是游戏类型？" } },
    keyboard: { en: { prompt: "Which is not an emotion emoji?" }, ja: { prompt: "感情の絵文字ではないものは？" }, zh: { prompt: "哪个不是表情符号？" } },
    dolphin: { en: { prompt: "Which is not a bird?" }, ja: { prompt: "鳥ではないものは？" }, zh: { prompt: "哪个不是鸟？" } },
    cookie: { en: { prompt: "Which is not a vegetable?" }, ja: { prompt: "野菜ではないものは？" }, zh: { prompt: "哪个不是蔬菜？" } },
    moon: { en: { prompt: "Which is not a job?" }, ja: { prompt: "職業ではないものは？" }, zh: { prompt: "哪个不是职业？" } },
    surf: { en: { prompt: "Which is not a winter sport?" }, ja: { prompt: "ウィンタースポーツではないものは？" }, zh: { prompt: "哪个不是冬季运动？" } },
    rock: { en: { prompt: "Which is not a flower?" }, ja: { prompt: "花ではないものは？" }, zh: { prompt: "哪个不是花？" } },
    cactus: { en: { prompt: "Which is not found by the water?" }, ja: { prompt: "水辺にあるものではないのは？" }, zh: { prompt: "哪个不在水边？" } },
    rainbow: { en: { prompt: "Which is not horror-themed?" }, ja: { prompt: "ホラー系ではないものは？" }, zh: { prompt: "哪个不是恐怖主题？" } },
    balloon: { en: { prompt: "Which is not keyboard or input related?" }, ja: { prompt: "キーボード・入力ではないものは？" }, zh: { prompt: "哪个与键盘输入无关？" } },
    house: { en: { prompt: "Which is not a space or celestial body?" }, ja: { prompt: "宇宙・天体ではないものは？" }, zh: { prompt: "哪个不是天体？" } },
    brick: { en: { prompt: "Which is not a liquid?" }, ja: { prompt: "液体ではないものは？" }, zh: { prompt: "哪个不是液体？" } },
    laundry: { en: { prompt: "Which is not a festival or event?" }, ja: { prompt: "祭り・イベントではないものは？" }, zh: { prompt: "哪个不是节日或活动？" } },
    frog: { en: { prompt: "Which is not a mammal?" }, ja: { prompt: "哺乳類ではないものは？" }, zh: { prompt: "哪个不是哺乳动物？" } },
    umbrella: { en: { prompt: "Which is not school supplies?" }, ja: { prompt: "文房具・学用品ではないものは？" }, zh: { prompt: "哪个不是学习用品？" } },
    hammer: { en: { prompt: "Which is not a dessert or snack?" }, ja: { prompt: "デザート・お菓子ではないものは？" }, zh: { prompt: "哪个不是甜点或零食？" } },
    blue_circle: { en: { prompt: "Which is not red-themed?" }, ja: { prompt: "赤系ではないものは？" }, zh: { prompt: "哪个不是红色系？" } },
    toaster: { en: { prompt: "Which is not an accessory?" }, ja: { prompt: "アクセサリーではないものは？" }, zh: { prompt: "哪个不是饰品？" } },
    library: { en: { prompt: "Which is not an amusement park item?" }, ja: { prompt: "遊園地ではないものは？" }, zh: { prompt: "哪个不是游乐园设施？" } },
    desk: { en: { prompt: "Which cannot swim?" }, ja: { prompt: "泳げないものは？" }, zh: { prompt: "哪个不能游泳？" } },
    bunny: { en: { prompt: "Which is not villain or boss themed?" }, ja: { prompt: "悪役・ボス系ではないものは？" }, zh: { prompt: "哪个不是反派或Boss风格？" } },
    onion: { en: { prompt: "Which is farthest from filming or video?" }, ja: { prompt: "撮影・映像と最も遠いものは？" }, zh: { prompt: "哪个与拍摄视频最无关？" } },
    tax: {
      en: { prompt: "Which is farthest from MoCoMo community topics?", hint: "Subculture, goods, cosplay" },
      ja: { prompt: "MoCoMoコミュニティの話題と最も遠いものは？", hint: "サブカル・グッズ・コスプレ" },
      zh: { prompt: "哪个与 MoCoMo 社区主题最无关？", hint: "亚文化、周边、Cosplay" },
    },
    tractor: { en: { prompt: "Which is not social or chat related?" }, ja: { prompt: "ソーシャル・チャットではないものは？" }, zh: { prompt: "哪个与社交聊天无关？" } },
    snail: { en: { prompt: "Which does not fly?" }, ja: { prompt: "飛ばないものは？" }, zh: { prompt: "哪个不会飞？" } },
    letter: { en: { prompt: "Which is not a number?" }, ja: { prompt: "数字ではないものは？" }, zh: { prompt: "哪个不是数字？" } },
  };

const TRIVIA_PROMPTS: Record<string, Record<Exclude<Locale, "ko">, string>> = {
  anime: {
    en: "What do we call Japanese animation?",
    ja: "日本のアニメーションを何と呼びますか？",
    zh: "日本动画通常叫什么？",
  },
  cosplay: {
    en: "What is recreating a character's outfit called?",
    ja: "キャラの衣装を再現する活動は？",
    zh: "还原角色服装的活动叫什么？",
  },
  fanart: {
    en: "What do we call fan-made artwork?",
    ja: "ファンが描いた二次創作イラストは？",
    zh: "粉丝创作的图画叫什么？",
  },
  goods: {
    en: "Where do you buy and sell figures and merch?",
    ja: "フィギュア・グッズを売買する場所は？",
    zh: "买卖手办周边的市场是？",
  },
  figure: {
    en: "Which hobby is closest to otaku culture?",
    ja: "オタク文化に最も近い趣味は？",
    zh: "哪种爱好最接近宅文化？",
  },
  ln_anime: {
    en: "Which field has many works based on light novels?",
    ja: "ライトノベル原作が多い分野は？",
    zh: "很多轻小说改编作品属于哪类？",
  },
  live2: {
    en: "What is closest to VTubers and streaming?",
    ja: "VTuber・配信に最も近いものは？",
    zh: "与虚拟主播和直播最接近的是？",
  },
  post: {
    en: "What is it called when you share text or photos in a community?",
    ja: "コミュニティに文章・写真を上げる行為は？",
    zh: "在社区发帖分享叫什么？",
  },
};

const SEQUENCE_HINTS: Record<string, Record<Exclude<Locale, "ko">, string>> = {
  "2 → 4 → 6 → ?": {
    en: "Find the pattern and pick the next number.",
    ja: "規則を見つけて次の数字を選んでください。",
    zh: "找出规律并选择下一个数字。",
  },
  "10 → 9 → 8 → ?": {
    en: "The numbers are decreasing.",
    ja: "減っていくパターンです。",
    zh: "数字在递减。",
  },
  "1 → 2 → 4 → 8 → ?": {
    en: "Each number doubles.",
    ja: "2倍ずつ増えます。",
    zh: "每次翻倍。",
  },
  "1 → 4 → 9 → ?": {
    en: "It's a square number sequence.",
    ja: "平方数の数列です。",
    zh: "这是平方数列。",
  },
};

const CHOICE_LABELS: Record<Exclude<Locale, "ko">, Record<string, string>> = {
  en: {
    car: "🚗 Car",
    apple: "🍎 Apple",
    grape: "🍇 Grape",
    banana: "🍌 Banana",
    melon: "🍈 Melon",
    book: "📚 Book",
    cat: "🐱 Cat",
    dog: "🐶 Dog",
    rabbit: "🐰 Rabbit",
    hamster: "🐹 Hamster",
    tree: "🌳 Tree",
    plane: "✈️ Plane",
    train: "🚆 Train",
    bike: "🚲 Bicycle",
    bus: "🚌 Bus",
    pencil: "✏️ Pencil",
    rice: "🍚 Rice",
    pizza: "🍕 Pizza",
    sushi: "🍣 Sushi",
    bread: "🍞 Bread",
    flower: "🌸 Flower",
    phone: "📱 Smartphone",
    laptop: "💻 Laptop",
    tv: "📺 TV",
    camera: "📷 Camera",
    guitar: "🎸 Guitar",
    soccer: "⚽ Soccer",
    basket: "🏀 Basketball",
    tennis: "🎾 Tennis",
    baseball: "⚾ Baseball",
    chair: "🪑 Chair",
    sun: "☀️ Sunny",
    rain: "🌧️ Rain",
    snow: "❄️ Snow",
    cloud: "☁️ Cloud",
    cake: "🎂 Cake",
    piano: "🎹 Piano",
    drum: "🥁 Drum",
    violin: "🎻 Violin",
    trumpet: "🎺 Trumpet",
    owl: "🦉 Owl",
    fish: "🐟 Fish",
    whale: "🐋 Whale",
    octopus: "🐙 Octopus",
    crab: "🦀 Crab",
    clock: "⏰ Clock",
    shirt: "👕 T-shirt",
    dress: "👗 Dress",
    shoes: "👟 Sneakers",
    hat: "🧢 Cap",
    mountain: "⛰️ Mountain",
    school: "🏫 School",
    hospital: "🏥 Hospital",
    castle: "🏰 Castle",
    store: "🏪 Store",
    penguin: "🐧 Penguin",
    bee: "🐝 Bee",
    butterfly: "🦋 Butterfly",
    ant: "🐜 Ant",
    ladybug: "🐞 Ladybug",
    taco: "🌮 Taco",
    kimchi: "🥬 Kimchi",
    bibim: "🍲 Bibimbap",
    tteok: "🍡 Rice cake",
    ramyeon: "🍜 Ramen",
    newspaper: "📰 Newspaper",
    manga: "📖 Manga",
    figure: "🎎 Figure",
    cosplay: "🎭 Cosplay",
    poster: "🖼️ Poster",
    cooking: "👨‍🍳 Cookbook",
    rpg: "⚔️ RPG",
    fps: "🔫 Shooter",
    puzzle: "🧩 Puzzle game",
    racing: "🏎️ Racing",
    keyboard: "⌨️ Keyboard",
    happy: "😊 Happy",
    sad: "😢 Sad",
    angry: "😠 Angry",
    love: "😍 Love",
    dolphin: "🐬 Dolphin",
    eagle: "🦅 Eagle",
    duck: "🦆 Duck",
    parrot: "🦜 Parrot",
    chick: "🐤 Chick",
    cookie: "🍪 Cookie",
    carrot: "🥕 Carrot",
    broccoli: "🥦 Broccoli",
    tomato: "🍅 Tomato",
    corn: "🌽 Corn",
    moon: "🌙 Moon",
    doctor: "👨‍⚕️ Doctor",
    chef: "👨‍🍳 Chef",
    artist: "👨‍🎨 Artist",
    pilot: "👨‍✈️ Pilot",
    surf: "🏄 Surfing",
    ski: "⛷️ Skiing",
    skate: "⛸️ Skating",
    sled: "🛷 Sled",
    snowboard: "🏂 Snowboard",
    rock: "🪨 Rock",
    rose: "🌹 Rose",
    sunflower: "🌻 Sunflower",
    tulip: "🌷 Tulip",
    cherry: "🌸 Cherry blossom",
    cactus: "🌵 Cactus",
    duck2: "🦆 Duck",
    boat: "⛵ Boat",
    anchor: "⚓ Anchor",
    wave: "🌊 Wave",
    rainbow: "🌈 Rainbow",
    ghost: "👻 Ghost",
    skull: "💀 Skull",
    spider: "🕷️ Spider",
    bat: "🦇 Bat",
    balloon: "🎈 Balloon",
    mouse: "🖱️ Mouse",
    keyboard2: "⌨️ Keyboard",
    joystick: "🕹️ Joystick",
    touch: "👆 Touch",
    house: "🏠 House",
    star: "⭐ Star",
    comet: "☄️ Comet",
    saturn: "🪐 Saturn",
    rocket: "🚀 Rocket",
    brick: "🧱 Brick",
    water: "💧 Water",
    milk: "🥛 Milk",
    juice: "🧃 Juice",
    coffee: "☕ Coffee",
    laundry: "🧺 Laundry",
    firework: "🎆 Fireworks",
    ticket: "🎫 Ticket",
    party: "🎉 Party",
    gift: "🎁 Gift",
    frog: "🐸 Frog",
    bear: "🐻 Bear",
    lion: "🦁 Lion",
    fox: "🦊 Fox",
    panda: "🐼 Panda",
    umbrella: "☂️ Umbrella",
    notebook: "📓 Notebook",
    ruler: "📏 Ruler",
    scissors: "✂️ Scissors",
    pen: "🖊️ Pen",
    hammer: "🔨 Hammer",
    icecream: "🍦 Ice cream",
    donut: "🍩 Donut",
    choco: "🍫 Chocolate",
    candy: "🍬 Candy",
    blue_circle: "🔵 Blue circle",
    red_circle: "🔴 Red circle",
    strawberry: "🍓 Strawberry",
    heart: "❤️ Heart",
    rose2: "🌹 Rose",
    toaster: "🍞 Toaster",
    ring: "💍 Ring",
    necklace: "📿 Necklace",
    watch: "⌚ Watch",
    glasses: "👓 Glasses",
    library: "📚 Library",
    ferris: "🎡 Ferris wheel",
    coaster: "🎢 Roller coaster",
    carousel: "🎠 Carousel",
    circus: "🎪 Circus",
    desk: "🗄️ Desk",
    swimmer: "🏊 Swimming",
    pool: "🏊‍♂️ Pool",
    fish2: "🐠 Tropical fish",
    snorkel: "🤿 Snorkel",
    bunny: "🐇 Bunny",
    dragon: "🐉 Dragon",
    ogre: "👹 Ogre",
    robot: "🤖 Robot",
    alien: "👽 Alien",
    onion: "🧅 Onion",
    selfie: "🤳 Selfie",
    video: "📹 Video",
    flash: "📸 Flash",
    clapper: "🎬 Filming",
    tax: "📑 Tax filing",
    anime: "📺 Anime",
    goods: "🛍️ Merch market",
    cos: "🎭 Cosplay",
    fanart: "🎨 Fan art",
    tractor: "🚜 Tractor",
    chat: "💬 Chat",
    dm: "✉️ DM",
    voice: "🎙️ Voice",
    live: "📡 Live",
    snail: "🐌 Snail",
    heli: "🚁 Helicopter",
    balloon2: "🎈 Hot-air balloon",
    kite: "🪁 Kite",
    bird: "🐦 Bird",
    letter: "🔤 Letter A",
    one: "1️⃣ One",
    five: "5️⃣ Five",
    ten: "🔟 Ten",
    hundred: "💯 Hundred",
    kdrama: "K-drama",
    bollywood: "Bollywood",
    opera: "Opera",
    ballet: "Ballet",
    cooking2: "Cooking",
    garden: "Gardening",
    fishing: "Fishing",
    running: "Marathon",
    blueprint: "Blueprint",
    invoice: "Invoice",
    map: "Map",
    recipe: "Recipe",
    fishmarket: "Fish market",
    stock: "Stock market",
    flea: "Flea market only",
    gas: "Gas station",
    golf: "Golf",
    chess: "Chess only",
    knit: "Knitting only",
    stamp: "Stamp collecting only",
    news: "News",
    sports: "Sports broadcast only",
    weather: "Weather forecast only",
    cook: "Cookbook only",
    mail: "Mail",
    fax: "Fax",
    typewriter: "Typewriter",
    scroll: "Scroll",
    sleep: "Sleep",
    dig: "Digging",
    fold: "Folding laundry only",
    park: "Parking only",
    ln_anime: "Light novel · anime",
    live2: "Live stream",
    post: "Posting",
  },
  ja: {},
  zh: {},
};

// ja/zh choice labels: fallback to English emoji labels where not overridden
CHOICE_LABELS.ja = { ...CHOICE_LABELS.en };
CHOICE_LABELS.zh = { ...CHOICE_LABELS.en };

function resolveLocale(locale: Locale): Exclude<Locale, "ko"> {
  return locale === "ko" ? "en" : locale;
}

function localizeChoice(choice: HumanChallengeChoice, locale: Locale): HumanChallengeChoice {
  if (locale === "ko") return choice;
  const lang = resolveLocale(locale);
  const label = CHOICE_LABELS[lang][choice.id];
  if (!label) return choice;
  return { id: choice.id, label };
}

export function getDefaultChallengeHint(locale: Locale): string {
  return DEFAULT_HINT[locale] ?? DEFAULT_HINT.en;
}

export function getMathChallengeHint(
  locale: Locale,
  kind: "add" | "sub" | "mul"
): string {
  return MATH_HINTS[locale]?.[kind] ?? MATH_HINTS.en[kind];
}

export function getVerifyChallengeErrors(locale: Locale) {
  return VERIFY_ERRORS[locale] ?? VERIFY_ERRORS.en;
}

export function localizePickChallenge<T extends PickChallenge>(challenge: T, locale: Locale): T {
  if (locale === "ko") return challenge;

  const lang = resolveLocale(locale);
  const key = challenge.correct.id;
  const odd = ODD_PROMPTS[key]?.[lang];
  const trivia = TRIVIA_PROMPTS[key]?.[lang];
  const seqHint = SEQUENCE_HINTS[challenge.prompt]?.[lang];

  const prompt = trivia ?? odd?.prompt ?? challenge.prompt;
  const hint = odd?.hint ?? seqHint ?? challenge.hint;

  return {
    ...challenge,
    prompt,
    hint,
    correct: localizeChoice(challenge.correct, locale),
    wrong: challenge.wrong.map((c) => localizeChoice(c, locale)),
  } as T;
}
