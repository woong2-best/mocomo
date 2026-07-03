import type { Locale } from "@/lib/i18n/config";
import type { MinigameCategory } from "@/lib/minigames/types";
import {
  getAllMinigames,
  getMinigamesByCategory,
  type MinigameCatalogItem,
} from "@/lib/minigames/registry";

type GameText = { name: string; description: string };

const CATEGORY_LABELS: Record<Locale, Record<MinigameCategory, string>> = {
  ko: { board: "보드게임", word: "단어 게임", puzzle: "퍼즐", casual: "캐주얼" },
  en: { board: "Board", word: "Word", puzzle: "Puzzle", casual: "Casual" },
  ja: { board: "ボード", word: "言葉", puzzle: "パズル", casual: "カジュアル" },
  zh: { board: "桌游", word: "文字", puzzle: "益智", casual: "休闲" },
};

const GAME_TEXT: Record<string, Record<Locale, GameText>> = {
  "sketch-quiz": {
    ko: { name: "스케치퀴즈", description: "그림으로 맞히는 캐치마인드 · 친구 방 / 랜덤 매칭" },
    en: { name: "Sketch Quiz", description: "Draw & guess · friend rooms / random match" },
    ja: { name: "スケッチクイズ", description: "お絵描き当て · フレンドルーム / ランダム" },
    zh: { name: "你画我猜", description: "绘画猜词 · 好友房 / 随机匹配" },
  },
  "word-chain": {
    ko: { name: "끝말잇기", description: "국어사전 검증 · 실시간 턴제" },
    en: { name: "Word Chain", description: "Dictionary check · real-time turns" },
    ja: { name: "しりとり", description: "辞書検証 · リアルタイムターン" },
    zh: { name: "接龙", description: "词典校验 · 实时回合" },
  },
  "chosung-quiz": {
    ko: { name: "초성퀴즈", description: "초성으로 단어 맞히기 · 5라운드" },
    en: { name: "Initial Quiz", description: "Guess words from initials · 5 rounds" },
    ja: { name: "頭文字クイズ", description: "頭文字で単語を当てる · 5ラウンド" },
    zh: { name: "首字母猜词", description: "根据首字母猜词 · 5 轮" },
  },
  "word-guess": {
    ko: { name: "단어 맞추기", description: "힌트 자동 공개 · 실시간 정답 경쟁 · 8라운드" },
    en: { name: "Word Guess", description: "Auto hints · real-time race · 8 rounds" },
    ja: { name: "単語当て", description: "ヒント付き単語クイズ" },
    zh: { name: "猜词", description: "提示与反馈猜词" },
  },
  omok: {
    ko: { name: "오목", description: "15×15 · 5목 승리 · 관전" },
    en: { name: "Omok", description: "15×15 · five in a row · spectate" },
    ja: { name: "五目並べ", description: "15×15 · 五連 · 観戦" },
    zh: { name: "五子棋", description: "15×15 · 五连 · 观战" },
  },
  chess: {
    ko: { name: "체스", description: "FIDE 규칙 · 블리츠/인크 · 무승부·50수 · 퍼즐 · a1~h8" },
    en: { name: "Chess", description: "FIDE rules · blitz/inc · 50-move draw · puzzles · a1–h8" },
    ja: { name: "チェス", description: "FIDEルール · ブリッツ/インク · 50手 · パズル" },
    zh: { name: "国际象棋", description: "FIDE 规则 · 快棋/加时 · 50 步和棋 · 谜题" },
  },
  janggi: {
    ko: { name: "장기", description: "한국 장기 · 9×10 · 장군 · 턴 타이머" },
    en: { name: "Janggi", description: "Korean chess · 9×10 · check · turn timer" },
    ja: { name: "janggi", description: "韓国将棋 · 9×10 · 王手 · ターンタイマー" },
    zh: { name: "韩国象棋", description: "韩国将棋 · 9×10 · 将军 · 回合计时" },
  },
  alkkagi: {
    ko: { name: "알까기", description: "물리 시뮬 · 드래그 발사" },
    en: { name: "Alkkagi", description: "Physics sim · drag to flick" },
    ja: { name: "アルカギ", description: "物理シミュ · ドラッグ発射" },
    zh: { name: "弹棋", description: "物理模拟 · 拖拽弹射" },
  },
  baduk: {
    ko: { name: "바둑", description: "19×19 · 따내기 · 패 · 집 계산 · 30초 턴" },
    en: { name: "Go", description: "19×19 · captures · ko · scoring · 30s turns" },
    ja: { name: "囲碁", description: "19×19 · 取り · コウ · 目数 · 30秒" },
    zh: { name: "围棋", description: "19×19 · 提子 · 劫 · 数目 · 30 秒" },
  },
  reversi: {
    ko: { name: "리버시", description: "8×8 오셀로 · 8방향 뒤집기 · 자동 패스 · 돌 개수 승패" },
    en: { name: "Reversi", description: "8×8 Othello · 8-way flips · auto-pass · stone count" },
    ja: { name: "リバーシ", description: "8×8 オセロ · 8方向反転 · 自動パス" },
    zh: { name: "黑白棋", description: "8×8 奥赛罗 · 八向翻转 · 自动 pass" },
  },
  jigsaw: {
    ko: { name: "직소 퍼즐", description: "4×4 조각 맞추기" },
    en: { name: "Jigsaw", description: "4×4 piece matching" },
    ja: { name: "ジグソー", description: "4×4 ピース合わせ" },
    zh: { name: "拼图", description: "4×4 拼块" },
  },
  "slide-puzzle": {
    ko: { name: "슬라이드 퍼즐", description: "15-puzzle · 최단 기록" },
    en: { name: "Slide Puzzle", description: "15-puzzle · best moves" },
    ja: { name: "スライドパズル", description: "15パズル · 最少手数" },
    zh: { name: "滑块拼图", description: "15 拼图 · 最少步数" },
  },
  "picture-match": {
    ko: { name: "그림 맞추기", description: "메모리 카드 6쌍" },
    en: { name: "Picture Match", description: "6-pair memory cards" },
    ja: { name: "絵合わせ", description: "神経衰弱 6ペア" },
    zh: { name: "翻牌配对", description: "6 对记忆卡" },
  },
  "spot-diff": {
    ko: { name: "틀린 그림 찾기", description: "이미지 14종 · 무한 · 대결/협동 · 클리어 랭킹" },
    en: { name: "Spot the Difference", description: "14 scenes · endless · vs/co-op · clear ranking" },
    ja: { name: "間違い探し", description: "14種 · 無限 · 対戦/協力 · クリアランキング" },
    zh: { name: "找不同", description: "14 种图 · 无尽 · 对战/合作 · 通关榜" },
  },
  "piano-rush": {
    ko: { name: "피아노 러쉬", description: "PD 클래식 8곡 · Beethoven·Bach·Mozart · 1:1·배틀·싱글 · 서버 판정" },
    en: { name: "Piano Rush", description: "8 PD classics · Beethoven/Bach/Mozart · 1v1 · battle · solo" },
    ja: { name: "ピアノラッシュ", description: "PDクラシック8曲 · 1:1 · バトル · ソロ" },
    zh: { name: "钢琴冲刺", description: "8 首 PD 古典 · 1v1 · 对战 · 单人" },
  },
  "parking-rush": {
    ko: { name: "주차 러쉬", description: "로우폴리 3D 주차 · 최대 16인 · 싱글·대전·랭크 · PC·모바일" },
    en: { name: "Parking Rush", description: "Low-poly 3D parking · up to 16 · solo · vs · ranked" },
    ja: { name: "パーキングラッシュ", description: "ローポリ3D駐車 · 最大16人 · ソロ/対戦/ランク" },
    zh: { name: "停车冲刺", description: "低模 3D 停车 · 最多 16 人 · 单人/对战/排位" },
  },
  "tower-rush": {
    ko: { name: "타워 러쉬", description: "블록 타이밍 쌓기 · Perfect 정렬 · 50인 배틀로얄 · PC·모바일·태블릿" },
    en: { name: "Tower Rush", description: "Stack blocks · perfect timing · 50-player battle royale" },
    ja: { name: "タワーラッシュ", description: "ブロック積み · Perfect判定 · 50人バトロワ" },
    zh: { name: "叠塔冲刺", description: "叠方块 · Perfect 判定 · 50 人大逃杀" },
  },
  rps: {
    ko: { name: "가위바위보", description: "3판 2선승" },
    en: { name: "Rock Paper Scissors", description: "Best of 3" },
    ja: { name: "じゃんけん", description: "3本先取" },
    zh: { name: "石头剪刀布", description: "三局两胜" },
  },
  "number-guess": {
    ko: { name: "숫자 맞추기", description: "UP/DOWN · 1~100" },
    en: { name: "Number Guess", description: "Higher/Lower · 1–100" },
    ja: { name: "数字当て", description: "UP/DOWN · 1~100" },
    zh: { name: "猜数字", description: "大/小 · 1–100" },
  },
  "memory-cards": {
    ko: { name: "카드 뒤집기", description: "8쌍 메모리 대결" },
    en: { name: "Memory Cards", description: "8-pair memory battle" },
    ja: { name: "カードめくり", description: "8ペア対戦" },
    zh: { name: "翻牌记忆", description: "8 对记忆对战" },
  },
};

function localeSort(locale: Locale): string {
  if (locale === "ko") return "ko";
  if (locale === "ja") return "ja";
  if (locale === "zh") return "zh-Hans";
  return "en";
}

export function getLocalizedCategoryLabel(category: MinigameCategory, locale: Locale): string {
  return (CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.en)[category];
}

export function localizeMinigame(game: MinigameCatalogItem, locale: Locale): MinigameCatalogItem {
  const text = GAME_TEXT[game.id]?.[locale] ?? GAME_TEXT[game.id]?.ko;
  if (!text) return game;
  return { ...game, name: text.name, description: text.description };
}

export function getLocalizedAllMinigames(locale: Locale): MinigameCatalogItem[] {
  const collator = localeSort(locale);
  return getAllMinigames()
    .map((g) => localizeMinigame(g, locale))
    .sort((a, b) => a.name.localeCompare(b.name, collator));
}

export function getLocalizedMinigamesByCategory(
  category: MinigameCategory,
  locale: Locale
): MinigameCatalogItem[] {
  const collator = localeSort(locale);
  return getMinigamesByCategory(category)
    .map((g) => localizeMinigame(g, locale))
    .sort((a, b) => a.name.localeCompare(b.name, collator));
}
