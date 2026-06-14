/**
 * @file explainerContent.ts
 * @description Content for the "How Agine Theme Analysis Works" page.
 *
 * Written for an average club player checking their Agine Analyzer report,
 * not for developers — no function names, file paths, or API details.
 * Formulas are kept because they're useful for understanding what a number
 * represents, but everything else is plain chess language: what the theme
 * means, what a high score means for you, what a low score means for you,
 * and example values with context.
 *
 * After the Agine Analyzer's perspective fix, every score below is from
 * YOUR point of view: positive means you have the edge in that theme,
 * negative means your opponent does, 0 means it's balanced.
 */

import { ThemeScore } from "@/libs/themes/helper";

export interface ExampleValue {
  value: string;
  meaning: string;
}

export interface ThemeExplainer {
  key: keyof ThemeScore;
  /** Plain-language name shown as the section title. */
  displayName: string;
  /** One or two sentence chess definition, no jargon. */
  definition: string;
  /** Short plain-language description of how the number is built up. */
  howItsBuilt: string[];
  /** Simplified formula, written in plain variable names. */
  formula: string;
  /** What it means for you when this score is high (positive). */
  highMeaning: string;
  /** What it means for you when this score is low (negative). */
  lowMeaning: string;
  /** Example raw values and what they mean for the position. */
  examples: ExampleValue[];
  /** Typical scale / range note. */
  range: string;
}

export const THEME_EXPLAINERS: ThemeExplainer[] = [
  {
    key: "material",
    displayName: "Material",
    definition:
      "The total point value of your pieces compared to your opponent's, using the standard pawn=1, knight=3, bishop=3, rook=5, queen=9 values.",
    howItsBuilt: [
      "Add up the point value of every piece you have left.",
      "Add up the point value of every piece your opponent has left.",
      "Subtract the opponent's total from yours.",
      "A small +0.5 bonus is added if you still have both bishops (the 'bishop pair'), and the same bonus is subtracted if your opponent has theirs.",
    ],
    formula:
      "Material = (Your point total + bishop pair bonus) − (Opponent's point total + their bishop pair bonus)",
    highMeaning:
      "You're up material — you have more pawns and/or pieces than your opponent. The higher the number, the bigger your material edge.",
    lowMeaning:
      "You're down material — your opponent has captured more or has more pieces than you. The lower (more negative) the number, the bigger the deficit.",
    examples: [
      { value: "0.00", meaning: "Material is even — nothing has been won or lost yet." },
      { value: "+1.00", meaning: "You're up a clean pawn, everything else equal." },
      { value: "+9.00", meaning: "You're up a whole queen for nothing — a winning material advantage." },
      { value: "+0.50", meaning: "Material is otherwise even, but you've kept both bishops and your opponent has lost one." },
    ],
    range: "Realistically from about -39 to +39 (every piece on the board), but most positions stay between -9 and +9.",
  },
  {
    key: "mobility",
    displayName: "Mobility",
    definition:
      "How many total squares your queen, rooks, bishops and knights can move to right now, compared to your opponent's pieces.",
    howItsBuilt: [
      "Count every legal move available to your queen, rooks, bishops and knights (pawns and your king aren't counted).",
      "Do the same for your opponent's queen, rooks, bishops and knights.",
      "Subtract their total from yours.",
    ],
    formula: "Mobility = (Total moves available to your pieces) − (Total moves available to their pieces)",
    highMeaning:
      "Your pieces are more active and have more squares to go to — generally a sign your pieces are well-placed and not boxed in.",
    lowMeaning:
      "Your pieces are cramped compared to your opponent's — fewer useful moves available, often a sign of a passive or tangled position.",
    examples: [
      { value: "0", meaning: "Both sides' pieces have roughly the same number of moves available." },
      { value: "+5", meaning: "Your pieces have 5 more available squares between them than your opponent's — your pieces are more active." },
      { value: "-10", meaning: "Your pieces are noticeably more restricted than your opponent's — a sign of a passive position." },
    ],
    range: "Usually between -30 and +30; gaps of ±20 or more often mean one side's pieces are seriously tangled.",
  },
  {
    key: "space",
    displayName: "Space",
    definition:
      "How much of the centre of the board and the wing areas your pieces are pressing into, compared to your opponent's.",
    howItsBuilt: [
      "Count how many of your pieces attack or defend any of the central squares (roughly the middle of the board) and the wing squares (the a/b and g/h files, ranks 4-5).",
      "Do the same for your opponent.",
      "Subtract their total from yours.",
    ],
    formula: "Space = (Your pieces influencing central + wing squares) − (Opponent's pieces influencing the same squares)",
    highMeaning:
      "You control more territory — your pieces reach further into the centre and the wings, giving you more room to manoeuvre.",
    lowMeaning:
      "Your opponent controls more territory than you — your pieces are pushed back and have less room to work with.",
    examples: [
      { value: "0", meaning: "Both sides have a similar amount of influence over the centre and wings." },
      { value: "+4", meaning: "You have noticeably more pieces bearing on the centre and wings — more room to manoeuvre." },
      { value: "-6", meaning: "Your opponent dominates the key central and wing squares — you're cramped." },
    ],
    range: "Usually between -15 and +15.",
  },
  {
    key: "positional",
    displayName: "Positional (Pawn Structure)",
    definition:
      "How healthy your pawn structure is compared to your opponent's — rewarding passed pawns and penalizing doubled, isolated, and backward pawns.",
    howItsBuilt: [
      "Count your weak pawns: doubled (two pawns on the same file), isolated (no friendly pawn on either neighboring file), and backward (stuck behind your other pawns and unable to safely advance).",
      "Count your passed pawns (no enemy pawn can ever stop them from promoting) — these count three times as much as a single weakness, since they're especially valuable.",
      "Your score = (passed pawns × 3) − (weak pawns). Do the same for your opponent.",
      "Subtract your opponent's score from yours.",
    ],
    formula: "Positional = [Your passed pawns × 3 − Your weak pawns] − [Their passed pawns × 3 − Their weak pawns]",
    highMeaning:
      "Your pawn structure is healthier than your opponent's — you may have a passed pawn or two, or simply fewer structural weaknesses.",
    lowMeaning:
      "Your pawn structure has more problems than your opponent's — doubled, isolated, or backward pawns that could become long-term targets.",
    examples: [
      { value: "0", meaning: "Both pawn structures have roughly equal strengths and weaknesses." },
      { value: "+3", meaning: "Equivalent to having one extra passed pawn (or a couple fewer weaknesses) than your opponent." },
      { value: "-2", meaning: "You have a couple more weak pawns than your opponent, with no passed pawn to compensate." },
    ],
    range: "Usually a small number, roughly -6 to +6 — pawn structure changes slowly over a game.",
  },
  {
    key: "kingSafety",
    displayName: "King Safety",
    definition:
      "How exposed your king is right now — based on attackers and defenders nearby, your pawn shield, and whether you've castled.",
    howItsBuilt: [
      "Count enemy pieces attacking the squares around your king, and your own pieces defending it.",
      "Count the pawns shielding your king from the front.",
      "Your safety score = (defenders × 5 + pawn shield × 2) − (attackers × 10), plus a small bonus for having castled (+2) or still being able to castle (+1).",
      "Do the same for your opponent's king, then subtract their score from yours.",
    ],
    formula: "King Safety = [Your defenders×5 + your pawn shield×2 − your attackers×10 + castling bonus] − [the same for your opponent]",
    highMeaning:
      "Your king is safer than your opponent's — a solid pawn shield, you're castled, and few (if any) enemy pieces are bearing down on you.",
    lowMeaning:
      "Your king is more exposed than your opponent's — fewer defenders, a thin pawn shield, or enemy pieces actively attacking around your king. Watch out for tactics.",
    examples: [
      { value: "0", meaning: "Both kings are about equally safe (or equally exposed) right now." },
      { value: "+10", meaning: "Your king has a solid pawn shield and is castled, while your opponent's king is open and uncastled — a big safety edge." },
      { value: "-12", meaning: "Your king is under direct attack with little cover — danger sign, look for ways to defend or counterattack." },
    ],
    range: "Usually between -20 and +20; values beyond ±20 usually mean a king is under real attack.",
  },
  {
    key: "tactical",
    displayName: "Tactical",
    definition:
      "A snapshot of immediate tactics on the board right now: hanging pieces, pieces under equal pressure, pins, and forks.",
    howItsBuilt: [
      "A piece of yours that's attacked with no defenders (hanging) costs you points; an opponent piece that's hanging gains you points.",
      "A piece under equal attack and defense (an even trade is on) is worth a little less either way.",
      "Pins you've created on your opponent's pieces gain you points (more for a pin to their king, less for a pin to another valuable piece); pins against your own pieces cost you points the same way.",
      "Forks (one of your pieces attacking two or more of theirs at once, or vice versa) add or subtract points depending on whose fork it is and how dangerous it looks.",
    ],
    formula: "Tactical = (Points for threats in your favor: hanging pieces, pins, forks) − (Points for the same threats against you)",
    highMeaning:
      "There's a tactic working in your favor right now — maybe an opponent piece is hanging, pinned, or caught in a fork.",
    lowMeaning:
      "There's a tactic working against you right now — one of your pieces may be hanging, pinned, or caught in a fork. Look carefully before your next move.",
    examples: [
      { value: "0", meaning: "No hanging pieces, pins, or forks for either side right now — a quiet position." },
      { value: "+10", meaning: "Your opponent has a piece hanging (attacked and completely undefended) — a free piece may be available." },
      { value: "-8", meaning: "Your opponent has a piece (often a knight) forking two of your pieces — you're about to lose material unless you find a defense." },
    ],
    range: "Quiet positions score near 0; positions with hanging pieces or forks can swing by 10-20+ in a single move.",
  },
  {
    key: "darksqaureControl",
    displayName: "Dark Square Control",
    definition:
      "How many of your pieces sit on dark squares compared to how many of your opponent's pieces do.",
    howItsBuilt: [
      "Count how many of your pieces (of any kind) are currently on dark squares.",
      "Count how many of your opponent's pieces are on dark squares.",
      "Subtract their count from yours.",
    ],
    formula: "Dark Square Control = (Your pieces on dark squares) − (Opponent's pieces on dark squares)",
    highMeaning:
      "You have more pieces stationed on dark squares than your opponent — can matter if your dark-squared bishop is strong, or your opponent's light-squared bishop doesn't fit the position.",
    lowMeaning:
      "Your opponent has more pieces on dark squares than you — worth checking if their dark-squared pieces (especially a bishop) are dominating those squares.",
    examples: [
      { value: "0", meaning: "Both sides have the same number of pieces on dark squares." },
      { value: "+2", meaning: "You have two more pieces on dark squares than your opponent." },
    ],
    range: "Roughly -16 to +16 in theory, but usually a small single-digit number in practice.",
  },
  {
    key: "lightsqaureControl",
    displayName: "Light Square Control",
    definition:
      "How many of your pieces sit on light squares compared to how many of your opponent's pieces do.",
    howItsBuilt: [
      "Count how many of your pieces (of any kind) are currently on light squares.",
      "Count how many of your opponent's pieces are on light squares.",
      "Subtract their count from yours.",
    ],
    formula: "Light Square Control = (Your pieces on light squares) − (Opponent's pieces on light squares)",
    highMeaning:
      "You have more pieces stationed on light squares than your opponent — can matter if your light-squared bishop is strong, or your opponent's dark-squared pieces don't fit the position.",
    lowMeaning:
      "Your opponent has more pieces on light squares than you — worth checking if their light-squared pieces (especially a bishop) are dominating those squares.",
    examples: [
      { value: "0", meaning: "Both sides have the same number of pieces on light squares." },
      { value: "-2", meaning: "Your opponent has two more pieces on light squares than you." },
    ],
    range:
      "Roughly -16 to +16 in theory, usually a small number in practice. Note: light and dark square control always move in opposite directions for you, since every piece sits on one color or the other.",
  },
  {
    key: "tempo",
    displayName: "Tempo",
    definition:
      "An overall 'who's making better use of their moves right now' score — combining development, initiative, pressure on the enemy king, and piece activity. The weighting shifts depending on whether it's the opening, middlegame, or endgame.",
    howItsBuilt: [
      "Development: how many pieces you've moved off their starting squares compared to your opponent, plus bonuses for castling.",
      "Initiative: a blend of your Tactical score and your Space score compared to your opponent's.",
      "Attack: how much pressure you're putting on the opponent's king compared to the pressure on yours.",
      "Activity: your Mobility score compared to your opponent's.",
      "These four pieces are combined, with development counting more in the opening and initiative/attack counting more in the middlegame. The final number is capped between -10 and +10.",
    ],
    formula: "Tempo = (Development edge × weight) + (Initiative edge × weight) + (Attack edge × weight) + (Activity edge × weight), capped to [-10, +10]",
    highMeaning:
      "You're making better use of your moves than your opponent — ahead in development, initiative, or attacking chances, often a sign you're dictating the game.",
    lowMeaning:
      "Your opponent is making better use of their moves than you — they may be ahead in development, holding the initiative, or generating threats. A sign you may need to catch up or consolidate.",
    examples: [
      { value: "0.00", meaning: "Neither side has a clear edge in development, initiative, or activity right now." },
      { value: "+2.27", meaning: "A modest opening-stage edge — for example, slightly ahead in development with a small space or tactical edge." },
      { value: "+10.00 (max)", meaning: "A dominant combination of development, initiative, and attacking chances all at once — the scale has hit its ceiling." },
      { value: "-4.95", meaning: "Your opponent is significantly ahead on multiple fronts at once — for example, behind in material, activity, and space simultaneously." },
    ],
    range: "Always between -10 and +10 by design. Values near ±10 mean the position is heavily skewed in one side's favor across several themes at once.",
  },
];

/**
 * Plain-language notes on reading the scores: what positive/negative/zero
 * mean, and what "low" vs "high" mean for you specifically.
 */
export const SCORE_ASSEMBLY_NOTES: string[] = [
  "Every score on this page is from YOUR point of view — positive means you have the edge in that theme, negative means your opponent does, and 0 means it's balanced.",
  "'High' (a big positive number) is good for you in every theme above — it means whatever that theme measures is currently working in your favor.",
  "'Low' (a big negative number) means the opposite — that theme is currently working against you, and is often a good place to focus when looking for ways to improve.",
  "The size of the number reflects how big the edge is, not just whether one exists. A score of +1 is a tiny edge; +10 or more is a large one. Material, King Safety, and Tactical scores tend to run larger than Space, Positional, or Square Control scores simply because of how each is measured — compare a theme's score to its own typical range (shown below each theme) rather than across different themes.",
];

/**
 * Plain-language notes on how the Agine Analyzer turns these per-position
 * scores into the charts on the Themes tab.
 */
export const ANALYZER_USAGE_NOTES: string[] = [
  "Per-game profile: each of your reviewed games gets one score per theme, averaged across every position in that game from your side of the board.",
  "Theme Strength bars: your average score for each theme across all profiled games, shown as a bar scaled relative to your biggest theme (positive or negative) — so your strongest or weakest area fills the bar completely, and the rest are shown proportionally. The exact number is printed next to each bar.",
  "Wins vs Losses radar: your average scores in games you won vs games you lost, plotted side by side so you can see which themes look different when you win compared to when you lose.",
  "Theme trend table & chart: your average score per theme for each game, oldest to newest, so you can see whether a theme is trending up or down across your recent games.",
  "Sample size: you can choose how many of your most recent games (10, 20, or 30) to include in the profile — more games give a steadier average, fewer games focus on your most recent form.",
];
