import type { Locale } from "@/lib/i18n/config";
import { ERROR_CODES } from "@/lib/error-codes";

type ChallengeLang = "en" | "ja" | "zh";
import type { HumanChallengeChoice } from "@/lib/human-challenge-types";
import type {
  OddOneChallenge,
  SequenceChallenge,
  TriviaChallenge,
} from "@/lib/human-challenge-bank";

type PickChallenge = OddOneChallenge | SequenceChallenge | TriviaChallenge;

const DEFAULT_HINT: Partial<Record<Locale, string>> = {
  en: "Pick the correct answer.",
};

const MATH_HINTS: Partial<Record<Locale, { add: string; sub: string; mul: string }>> = {
  en: {
    add: "Pick the correct sum.",
    sub: "Pick the correct difference.",
    mul: "Pick the correct product.",
  },
};


const ODD_PROMPTS: Record<string, Partial<Record<ChallengeLang, { prompt: string; hint?: string }>>> =
  {
    car: { en: { prompt: "Which is not a fruit?" }, },
    book: { en: { prompt: "Which is not an animal?" }, },
    tree: { en: { prompt: "Which is not a vehicle?" }, },
    pencil: { en: { prompt: "Which is not food?" }, },
    flower: { en: { prompt: "Which is not an electronic device?" }, },
    guitar: { en: { prompt: "Which is not a sport?" }, },
    chair: { en: { prompt: "Which is not weather or nature?" }, },
    cake: { en: { prompt: "Which is not a musical instrument?" }, },
    owl: { en: { prompt: "Which does not live in the sea?" }, },
    clock: { en: { prompt: "Which is not clothing or fashion?" }, },
    mountain: { en: { prompt: "Which is not a building?" }, },
    penguin: { en: { prompt: "Which is not an insect?" }, },
    taco: { en: { prompt: "Which is not traditional Korean food?" }, },
    newspaper: { en: { prompt: "Which is not anime or manga related?" }, },
    cooking: { en: { prompt: "Which is not a game genre?" }, },
    keyboard: { en: { prompt: "Which is not an emotion emoji?" }, },
    dolphin: { en: { prompt: "Which is not a bird?" }, },
    cookie: { en: { prompt: "Which is not a vegetable?" }, },
    moon: { en: { prompt: "Which is not a job?" }, },
    surf: { en: { prompt: "Which is not a winter sport?" }, },
    rock: { en: { prompt: "Which is not a flower?" }, },
    cactus: { en: { prompt: "Which is not found by the water?" }, },
    rainbow: { en: { prompt: "Which is not horror-themed?" }, },
    balloon: { en: { prompt: "Which is not keyboard or input related?" }, },
    house: { en: { prompt: "Which is not a space or celestial body?" }, },
    brick: { en: { prompt: "Which is not a liquid?" }, },
    laundry: { en: { prompt: "Which is not a festival or event?" }, },
    frog: { en: { prompt: "Which is not a mammal?" }, },
    umbrella: { en: { prompt: "Which is not school supplies?" }, },
    hammer: { en: { prompt: "Which is not a dessert or snack?" }, },
    blue_circle: { en: { prompt: "Which is not red-themed?" }, },
    toaster: { en: { prompt: "Which is not an accessory?" }, },
    library: { en: { prompt: "Which is not an amusement park item?" }, },
    desk: { en: { prompt: "Which cannot swim?" }, },
    bunny: { en: { prompt: "Which is not villain or boss themed?" }, },
    onion: { en: { prompt: "Which is farthest from filming or video?" }, },
    tax: {
      en: { prompt: "Which is farthest from MoCoMo community topics?", hint: "Subculture, goods, cosplay" },
    },
    tractor: { en: { prompt: "Which is not social or chat related?" }, },
    snail: { en: { prompt: "Which does not fly?" }, },
    letter: { en: { prompt: "Which is not a number?" }, },
  };

const TRIVIA_PROMPTS: Record<string, Partial<Record<ChallengeLang, string>>> = {
  anime: {
    en: "What do we call Japanese animation?",
  },
  cosplay: {
    en: "What is recreating a character's outfit called?",
  },
  fanart: {
    en: "What do we call fan-made artwork?",
  },
  goods: {
    en: "Where do you buy and sell figures and merch?",
  },
  figure: {
    en: "Which hobby is closest to otaku culture?",
  },
  ln_anime: {
    en: "Which field has many works based on light novels?",
  },
  live2: {
    en: "What is closest to VTubers and streaming?",
  },
  post: {
    en: "What is it called when you share text or photos in a community?",
  },
};

const SEQUENCE_HINTS: Record<string, Partial<Record<ChallengeLang, string>>> = {
  "2 → 4 → 6 → ?": {
    en: "Find the pattern and pick the next number.",
  },
  "10 → 9 → 8 → ?": {
    en: "The numbers are decreasing.",
  },
  "1 → 2 → 4 → 8 → ?": {
    en: "Each number doubles.",
  },
  "1 → 4 → 9 → ?": {
    en: "It's a square number sequence.",
  },
};

const CHOICE_LABELS: Partial<Record<ChallengeLang, Record<string, string>>> = {
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
};

// ja/zh choice labels: fallback to English emoji labels where not overridden
CHOICE_LABELS.ja = { ...CHOICE_LABELS.en };
CHOICE_LABELS.zh = { ...CHOICE_LABELS.en };

function resolveLocale(locale: Locale): ChallengeLang {
  
  
  return "en";
}

function localizeChoice(choice: HumanChallengeChoice, locale: Locale): HumanChallengeChoice {
  
  const lang = resolveLocale(locale);
  const label = CHOICE_LABELS[lang]?.[choice.id];
  if (!label) return choice;
  return { id: choice.id, label };
}

export function getDefaultChallengeHint(locale: Locale): string {
  return DEFAULT_HINT[locale] ?? DEFAULT_HINT.en ?? "Pick the correct answer.";
}

export function getMathChallengeHint(
  locale: Locale,
  kind: "add" | "sub" | "mul"
): string {
  return MATH_HINTS[locale]?.[kind] ?? MATH_HINTS.en?.[kind] ?? MATH_HINTS.en!.add;
}

export function getVerifyChallengeErrors(_locale: Locale) {
  return {
    missing: ERROR_CODES.humanChallengeMissing,
    expired: ERROR_CODES.humanChallengeExpired,
    timeout: ERROR_CODES.humanChallengeTimeout,
    wrong: ERROR_CODES.humanChallengeWrong,
  };
}

export function localizePickChallenge<T extends PickChallenge>(challenge: T, locale: Locale): T {
  

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
