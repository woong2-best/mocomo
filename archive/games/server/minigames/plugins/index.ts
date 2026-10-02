import { omokPlugin } from "./omok";
import { rpsPlugin } from "./rps";
import { wordChainPlugin } from "./word-chain";
import { reversiPlugin } from "./reversi";
import { chessPlugin } from "./chess";
import { janggiPlugin } from "./janggi";
import { badukPlugin } from "./baduk";
import { alkkagiPlugin } from "./alkkagi";
import { chosungQuizPlugin } from "./chosung-quiz";
import { wordGuessPlugin } from "./word-guess";
import { numberGuessPlugin } from "./number-guess";
import { memoryCardsPlugin, pictureMatchPlugin } from "./memory-match";
import { slidePuzzlePlugin } from "./slide-puzzle";
import { spotDiffPlugin } from "./spot-diff";
import { pianoRushPlugin } from "./piano-rush";
import { parkingRushPlugin } from "./parking-rush";
import { towerRushPlugin } from "./tower-rush";
import { jigsawPlugin } from "./jigsaw";
import type { MinigamePlugin } from "../types";

export const ALL_MINIGAME_PLUGINS: MinigamePlugin[] = [
  omokPlugin,
  rpsPlugin,
  wordChainPlugin,
  reversiPlugin,
  chessPlugin,
  janggiPlugin,
  badukPlugin,
  alkkagiPlugin,
  chosungQuizPlugin,
  wordGuessPlugin,
  numberGuessPlugin,
  memoryCardsPlugin,
  pictureMatchPlugin,
  slidePuzzlePlugin,
  spotDiffPlugin,
  pianoRushPlugin,
  parkingRushPlugin,
  towerRushPlugin,
  jigsawPlugin,
];

export const PLUGIN_BY_ID = new Map(ALL_MINIGAME_PLUGINS.map((p) => [p.id, p]));
