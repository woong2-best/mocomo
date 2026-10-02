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
    prompt: "Which is not a fruit?",
    correct: { id: "car", label: "🚗 Car" },
    wrong: [
      { id: "apple", label: "🍎 Apple" },
      { id: "grape", label: "🍇 Grapes" },
      { id: "banana", label: "🍌 Banana" },
      { id: "melon", label: "🍈 Melon" },
    ],
  },
  {
    prompt: "Which is not an animal?",
    correct: { id: "book", label: "📚 Book" },
    wrong: [
      { id: "cat", label: "🐱 Cat" },
      { id: "dog", label: "🐶 Dog" },
      { id: "rabbit", label: "🐰 Rabbit" },
      { id: "hamster", label: "🐹 Hamster" },
    ],
  },
  {
    prompt: "Which is not a vehicle?",
    correct: { id: "tree", label: "🌳 Tree" },
    wrong: [
      { id: "plane", label: "✈️ Airplane" },
      { id: "train", label: "🚆 Train" },
      { id: "bike", label: "🚲 Bicycle" },
      { id: "bus", label: "🚌 Bus" },
    ],
  },
  {
    prompt: "Which is not food?",
    correct: { id: "pencil", label: "✏️ Pencil" },
    wrong: [
      { id: "rice", label: "🍚 Rice" },
      { id: "pizza", label: "🍕 Pizza" },
      { id: "sushi", label: "🍣 Sushi" },
      { id: "bread", label: "🍞 Bread" },
    ],
  },
  {
    prompt: "Which is not an electronic device?",
    correct: { id: "flower", label: "🌸 Flower" },
    wrong: [
      { id: "phone", label: "📱 Smartphone" },
      { id: "laptop", label: "💻 Laptop" },
      { id: "tv", label: "📺 TV" },
      { id: "camera", label: "📷 Camera" },
    ],
  },
  {
    prompt: "Which is not a sport?",
    correct: { id: "guitar", label: "🎸 Guitar" },
    wrong: [
      { id: "soccer", label: "⚽ Soccer" },
      { id: "basket", label: "🏀 Basketball" },
      { id: "tennis", label: "🎾 Tennis" },
      { id: "baseball", label: "⚾ Baseball" },
    ],
  },
  {
    prompt: "Which is not weather or a natural phenomenon?",
    correct: { id: "chair", label: "🪑 Chair" },
    wrong: [
      { id: "sun", label: "☀️ Sunny" },
      { id: "rain", label: "🌧️ Rain" },
      { id: "snow", label: "❄️ Snow" },
      { id: "cloud", label: "☁️ Clouds" },
    ],
  },
  {
    prompt: "Which is not a musical instrument?",
    correct: { id: "cake", label: "🎂 Cake" },
    wrong: [
      { id: "piano", label: "🎹 Piano" },
      { id: "drum", label: "🥁 Drums" },
      { id: "violin", label: "🎻 Violin" },
      { id: "trumpet", label: "🎺 Trumpet" },
    ],
  },
  {
    prompt: "Which does not live in the sea?",
    correct: { id: "owl", label: "🦉 Owl" },
    wrong: [
      { id: "fish", label: "🐟 Fish" },
      { id: "whale", label: "🐋 Whale" },
      { id: "octopus", label: "🐙 Octopus" },
      { id: "crab", label: "🦀 Crab" },
    ],
  },
  {
    prompt: "Which is not clothing or fashion?",
    correct: { id: "clock", label: "⏰ Clock" },
    wrong: [
      { id: "shirt", label: "👕 T-shirt" },
      { id: "dress", label: "👗 Dress" },
      { id: "shoes", label: "👟 Sneakers" },
      { id: "hat", label: "🧢 Cap" },
    ],
  },
  {
    prompt: "Which is not a building?",
    correct: { id: "mountain", label: "⛰️ Mountain" },
    wrong: [
      { id: "school", label: "🏫 School" },
      { id: "hospital", label: "🏥 Hospital" },
      { id: "castle", label: "🏰 Castle" },
      { id: "store", label: "🏪 Store" },
    ],
  },
  {
    prompt: "Which is not an insect?",
    correct: { id: "penguin", label: "🐧 Penguin" },
    wrong: [
      { id: "bee", label: "🐝 Bee" },
      { id: "butterfly", label: "🦋 Butterfly" },
      { id: "ant", label: "🐜 Ant" },
      { id: "ladybug", label: "🐞 Ladybug" },
    ],
  },
  {
    prompt: "Which is not traditional Korean food?",
    correct: { id: "taco", label: "🌮 Taco" },
    wrong: [
      { id: "kimchi", label: "🥬 Kimchi" },
      { id: "bibim", label: "🍲 Bibimbap" },
      { id: "tteok", label: "🍡 Rice cake" },
      { id: "ramyeon", label: "🍜 Ramen" },
    ],
  },
  {
    prompt: "Which is not anime or manga related?",
    correct: { id: "newspaper", label: "📰 Newspaper" },
    wrong: [
      { id: "manga", label: "📖 Manga" },
      { id: "figure", label: "🎎 Figure" },
      { id: "cosplay", label: "🎭 Cosplay" },
      { id: "poster", label: "🖼️ Poster" },
    ],
  },
  {
    prompt: "Which is not a game genre?",
    correct: { id: "cooking", label: "👨‍🍳 Cookbook" },
    wrong: [
      { id: "rpg", label: "⚔️ RPG" },
      { id: "fps", label: "🔫 Shooter" },
      { id: "puzzle", label: "🧩 Puzzle game" },
      { id: "racing", label: "🏎️ Racing" },
    ],
  },
  {
    prompt: "Which is not an emotion emoji?",
    correct: { id: "keyboard", label: "⌨️ Keyboard" },
    wrong: [
      { id: "happy", label: "😊 Smile" },
      { id: "sad", label: "😢 Sad" },
      { id: "angry", label: "😠 Angry" },
      { id: "love", label: "😍 Heart eyes" },
    ],
  },
  {
    prompt: "Which is not a bird?",
    correct: { id: "dolphin", label: "🐬 Dolphin" },
    wrong: [
      { id: "eagle", label: "🦅 Eagle" },
      { id: "duck", label: "🦆 Duck" },
      { id: "parrot", label: "🦜 Parrot" },
      { id: "chick", label: "🐤 Chick" },
    ],
  },
  {
    prompt: "Which is not a vegetable?",
    correct: { id: "cookie", label: "🍪 Cookie" },
    wrong: [
      { id: "carrot", label: "🥕 Carrot" },
      { id: "broccoli", label: "🥦 Broccoli" },
      { id: "tomato", label: "🍅 Tomato" },
      { id: "corn", label: "🌽 Corn" },
    ],
  },
  {
    prompt: "Which is not a job?",
    correct: { id: "moon", label: "🌙 Moon" },
    wrong: [
      { id: "doctor", label: "👨‍⚕️ Doctor" },
      { id: "chef", label: "👨‍🍳 Chef" },
      { id: "artist", label: "👨‍🎨 Artist" },
      { id: "pilot", label: "👨‍✈️ Pilot" },
    ],
  },
  {
    prompt: "Which is not a winter sport?",
    correct: { id: "surf", label: "🏄 Surfing" },
    wrong: [
      { id: "ski", label: "⛷️ Skiing" },
      { id: "skate", label: "⛸️ Skating" },
      { id: "sled", label: "🛷 Sled" },
      { id: "snowboard", label: "🏂 Snowboard" },
    ],
  },
  {
    prompt: "Which is not a flower?",
    correct: { id: "rock", label: "🪨 Rock" },
    wrong: [
      { id: "rose", label: "🌹 Rose" },
      { id: "sunflower", label: "🌻 Sunflower" },
      { id: "tulip", label: "🌷 Tulip" },
      { id: "cherry", label: "🌸 Cherry blossom" },
    ],
  },
  {
    prompt: "Which is not found by the water?",
    correct: { id: "cactus", label: "🌵 Cactus" },
    wrong: [
      { id: "duck2", label: "🦆 Duck" },
      { id: "boat", label: "⛵ Yacht" },
      { id: "anchor", label: "⚓ Anchor" },
      { id: "wave", label: "🌊 Waves" },
    ],
  },
  {
    prompt: "Which is not horror themed?",
    correct: { id: "rainbow", label: "🌈 Rainbow" },
    wrong: [
      { id: "ghost", label: "👻 Ghost" },
      { id: "skull", label: "💀 Skull" },
      { id: "spider", label: "🕷️ Spider" },
      { id: "bat", label: "🦇 Bat" },
    ],
  },
  {
    prompt: "Which is not keyboard or input related?",
    correct: { id: "balloon", label: "🎈 Balloon" },
    wrong: [
      { id: "mouse", label: "🖱️ Mouse" },
      { id: "keyboard2", label: "⌨️ Keyboard" },
      { id: "joystick", label: "🕹️ Joystick" },
      { id: "touch", label: "👆 Touch" },
    ],
  },
  {
    prompt: "Which is not space or a celestial body?",
    correct: { id: "house", label: "🏠 House" },
    wrong: [
      { id: "star", label: "⭐ Star" },
      { id: "comet", label: "☄️ Comet" },
      { id: "saturn", label: "🪐 Saturn" },
      { id: "rocket", label: "🚀 Rocket" },
    ],
  },
  {
    prompt: "Which is not a liquid?",
    correct: { id: "brick", label: "🧱 Brick" },
    wrong: [
      { id: "water", label: "💧 Water" },
      { id: "milk", label: "🥛 Milk" },
      { id: "juice", label: "🧃 Juice" },
      { id: "coffee", label: "☕ Coffee" },
    ],
  },
  {
    prompt: "Which is not a festival or event?",
    correct: { id: "laundry", label: "🧺 Laundry" },
    wrong: [
      { id: "firework", label: "🎆 Fireworks" },
      { id: "ticket", label: "🎫 Ticket" },
      { id: "party", label: "🎉 Party" },
      { id: "gift", label: "🎁 Gift" },
    ],
  },
  {
    prompt: "Which is not a mammal?",
    correct: { id: "frog", label: "🐸 Frog" },
    wrong: [
      { id: "bear", label: "🐻 Bear" },
      { id: "lion", label: "🦁 Lion" },
      { id: "fox", label: "🦊 Fox" },
      { id: "panda", label: "🐼 Panda" },
    ],
  },
  {
    prompt: "Which is not school supplies?",
    correct: { id: "umbrella", label: "☂️ Umbrella" },
    wrong: [
      { id: "notebook", label: "📓 Notebook" },
      { id: "ruler", label: "📏 Ruler" },
      { id: "scissors", label: "✂️ Scissors" },
      { id: "pen", label: "🖊️ Pen" },
    ],
  },
  {
    prompt: "Which is not a dessert or snack?",
    correct: { id: "hammer", label: "🔨 Hammer" },
    wrong: [
      { id: "icecream", label: "🍦 Ice cream" },
      { id: "donut", label: "🍩 Donut" },
      { id: "choco", label: "🍫 Chocolate" },
      { id: "candy", label: "🍬 Candy" },
    ],
  },
  {
    prompt: "Which is not in the red color family?",
    correct: { id: "blue_circle", label: "🔵 Blue circle" },
    wrong: [
      { id: "red_circle", label: "🔴 Red circle" },
      { id: "strawberry", label: "🍓 Strawberry" },
      { id: "heart", label: "❤️ Heart" },
      { id: "rose2", label: "🌹 Rose" },
    ],
  },
  {
    prompt: "Which is not an accessory?",
    correct: { id: "toaster", label: "🍞 Toaster" },
    wrong: [
      { id: "ring", label: "💍 Ring" },
      { id: "necklace", label: "📿 Necklace" },
      { id: "watch", label: "⌚ Watch" },
      { id: "glasses", label: "👓 Glasses" },
    ],
  },
  {
    prompt: "Which is not an amusement park attraction?",
    correct: { id: "library", label: "📚 Library" },
    wrong: [
      { id: "ferris", label: "🎡 Ferris wheel" },
      { id: "coaster", label: "🎢 Roller coaster" },
      { id: "carousel", label: "🎠 Carousel" },
      { id: "circus", label: "🎪 Circus" },
    ],
  },
  {
    prompt: "Which cannot swim?",
    correct: { id: "desk", label: "🗄️ Desk" },
    wrong: [
      { id: "swimmer", label: "🏊 Swimming" },
      { id: "pool", label: "🏊‍♂️ Pool" },
      { id: "fish2", label: "🐠 Tropical fish" },
      { id: "snorkel", label: "🤿 Snorkel" },
    ],
  },
  {
    prompt: "Which is not villain or boss themed?",
    correct: { id: "bunny", label: "🐇 Rabbit" },
    wrong: [
      { id: "dragon", label: "🐉 Dragon" },
      { id: "ogre", label: "👹 Oni" },
      { id: "robot", label: "🤖 Robot" },
      { id: "alien", label: "👽 Alien" },
    ],
  },
  {
    prompt: "Which is furthest from filming or video?",
    correct: { id: "onion", label: "🧅 Onion" },
    wrong: [
      { id: "selfie", label: "🤳 Selfie" },
      { id: "video", label: "📹 Video" },
      { id: "flash", label: "📸 Flash" },
      { id: "clapper", label: "🎬 Filming" },
    ],
  },
  {
    prompt: "Which is furthest from MoCoMo community topics?",
    hint: "Focused on subculture, goods, and cosplay",
    correct: { id: "tax", label: "📑 Tax filing" },
    wrong: [
      { id: "anime", label: "📺 Anime" },
      { id: "goods", label: "🛍️ Goods" },
      { id: "cos", label: "🎭 Cosplay" },
      { id: "fanart", label: "🎨 Fan art" },
    ],
  },
  {
    prompt: "Which is not social or chat related?",
    correct: { id: "tractor", label: "🚜 Tractor" },
    wrong: [
      { id: "chat", label: "💬 Chat" },
      { id: "dm", label: "✉️ DM" },
      { id: "voice", label: "🎙️ Voice" },
      { id: "live", label: "📡 Live" },
    ],
  },
  {
    prompt: "Which does not fly?",
    correct: { id: "snail", label: "🐌 Snail" },
    wrong: [
      { id: "heli", label: "🚁 Helicopter" },
      { id: "balloon2", label: "🎈 Hot air balloon" },
      { id: "kite", label: "🪁 Kite" },
      { id: "bird", label: "🐦 Bird" },
    ],
  },
  {
    prompt: "Which is not a number?",
    correct: { id: "letter", label: "🔤 Letter A" },
    wrong: [
      { id: "one", label: "1️⃣ One" },
      { id: "five", label: "5️⃣ Five" },
      { id: "ten", label: "🔟 Ten" },
      { id: "hundred", label: "💯 One hundred" },
    ],
  },
];

/** 다음에 올 숫자 */
export const SEQUENCE_BANK: SequenceChallenge[] = [
  {
    prompt: "2 → 4 → 6 → ?",
    hint: "Find the pattern and pick the next number.",
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
    hint: "This is a decreasing pattern.",
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
    hint: "It doubles each step.",
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
    hint: "This is a square number sequence.",
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
    prompt: "What do we call Japanese animation?",
    correct: { id: "anime", label: "Anime (animation)" },
    wrong: [
      { id: "kdrama", label: "K-drama" },
      { id: "bollywood", label: "Bollywood" },
      { id: "opera", label: "Opera" },
      { id: "ballet", label: "Ballet" },
    ],
  },
  {
    prompt: "What is the activity of recreating a character's outfit?",
    correct: { id: "cosplay", label: "Cosplay" },
    wrong: [
      { id: "cooking2", label: "Cooking" },
      { id: "garden", label: "Gardening" },
      { id: "fishing", label: "Fishing" },
      { id: "running", label: "Marathon" },
    ],
  },
  {
    prompt: "What do we often call fan-made artwork?",
    correct: { id: "fanart", label: "Fan art" },
    wrong: [
      { id: "blueprint", label: "Blueprint" },
      { id: "invoice", label: "Invoice" },
      { id: "map", label: "Map" },
      { id: "recipe", label: "Recipe" },
    ],
  },
  {
    prompt: "What market is for buying and selling goods and figures?",
    correct: { id: "goods", label: "Goods market" },
    wrong: [
      { id: "fishmarket", label: "Fish market" },
      { id: "stock", label: "Stock market" },
      { id: "flea", label: "Flea market only" },
      { id: "gas", label: "Gas station" },
    ],
  },
  {
    prompt: "Which hobby is closest to otaku culture?",
    correct: { id: "figure", label: "Figure collecting" },
    wrong: [
      { id: "golf", label: "Golf" },
      { id: "chess", label: "Chess only" },
      { id: "knit", label: "Knitting only" },
      { id: "stamp", label: "Stamp collecting only" },
    ],
  },
  {
    prompt: "Which field has many works based on light novels?",
    correct: { id: "ln_anime", label: "Light novels · anime" },
    wrong: [
      { id: "news", label: "News" },
      { id: "sports", label: "Sports broadcasts only" },
      { id: "weather", label: "Weather forecasts only" },
      { id: "cook", label: "Cookbooks only" },
    ],
  },
  {
    prompt: "What is closest to VTuber · streaming?",
    correct: { id: "live2", label: "Live streaming" },
    wrong: [
      { id: "mail", label: "Mail" },
      { id: "fax", label: "Fax" },
      { id: "typewriter", label: "Typewriter" },
      { id: "scroll", label: "Scroll" },
    ],
  },
  {
    prompt: "In a community, what is uploading posts and photos?",
    correct: { id: "post", label: "Posting" },
    wrong: [
      { id: "sleep", label: "Sleep" },
      { id: "dig", label: "Digging" },
      { id: "fold", label: "Folding laundry only" },
      { id: "park", label: "Parking only" },
    ],
  },
];
