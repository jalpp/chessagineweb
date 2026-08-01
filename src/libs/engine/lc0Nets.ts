/**
 * Registry of selectable lc0 network "personalities" -- alternate base nets
 * a person can swap in instead of the default T1-256 distilled net, each
 * with a distinct playing style (human-rating-targeted, aggressive, etc).
 *
 * All files live under public/static/engine/lc0/net/ and are fetched by
 * {@link Lc0EngineWorker} the same way the default net already is; adding a
 * new personality is just adding an entry here plus the .pb/.pb.gz file.
 */

export type Lc0NetEra = "classic" | "modern";

export interface Lc0NetDefinition {
  /** Stable id used in UI state / persisted settings. */
  id: string;
  /** Short display name. */
  name: string;
  /** One-line description of the playing style, shown in the net picker. */
  description: string;
  /** Path under /public the net file is fetched from. */
  path: string;
  /** Rough release era, for grouping in the UI. */
  era: Lc0NetEra;
  /** Approximate human-rating strength this net targets/plays like, if known. */
  approxRating?: number;
}

const PERSONALITIES_DIR = "/static/engine/lc0/net/personalities";

export const LC0_NETS: Lc0NetDefinition[] = [
  {
    id: "t1-256-default",
    name: "T1-256 (Default)",
    description: "Modern distilled transformer net -- the strongest, most objective option.",
    path: "/static/engine/lc0/net/t1-256x10-distilled-swa-2432500.pb",
    era: "modern",
  },
  {
    id: "maia-1100",
    name: "Maia 1100",
    description: "Plays like a human rated ~1100 -- trained on Lichess games at that rating band.",
    path: `${PERSONALITIES_DIR}/maia-1100.pb.gz`,
    era: "classic",
    approxRating: 1100,
  },
  {
    id: "maia-1200",
    name: "Maia 1200",
    description: "Plays like a human rated ~1200.",
    path: `${PERSONALITIES_DIR}/maia-1200.pb.gz`,
    era: "classic",
    approxRating: 1200,
  },
  {
    id: "maia-1300",
    name: "Maia 1300",
    description: "Plays like a human rated ~1300.",
    path: `${PERSONALITIES_DIR}/maia-1300.pb.gz`,
    era: "classic",
    approxRating: 1300,
  },
  {
    id: "maia-1400",
    name: "Maia 1400",
    description: "Plays like a human rated ~1400.",
    path: `${PERSONALITIES_DIR}/maia-1400.pb.gz`,
    era: "classic",
    approxRating: 1400,
  },
  {
    id: "maia-1500",
    name: "Maia 1500",
    description: "Plays like a human rated ~1500.",
    path: `${PERSONALITIES_DIR}/maia-1500.pb.gz`,
    era: "classic",
    approxRating: 1500,
  },
  {
    id: "maia-1600",
    name: "Maia 1600",
    description: "Plays like a human rated ~1600.",
    path: `${PERSONALITIES_DIR}/maia-1600.pb.gz`,
    era: "classic",
    approxRating: 1600,
  },
  {
    id: "maia-1700",
    name: "Maia 1700",
    description: "Plays like a human rated ~1700.",
    path: `${PERSONALITIES_DIR}/maia-1700.pb.gz`,
    era: "classic",
    approxRating: 1700,
  },
  {
    id: "maia-1800",
    name: "Maia 1800",
    description: "Plays like a human rated ~1800.",
    path: `${PERSONALITIES_DIR}/maia-1800.pb.gz`,
    era: "classic",
    approxRating: 1800,
  },
  {
    id: "maia-1900",
    name: "Maia 1900",
    description: "Plays like a human rated ~1900 -- the strongest of the original Maia release.",
    path: `${PERSONALITIES_DIR}/maia-1900.pb.gz`,
    era: "classic",
    approxRating: 1900,
  },
  {
    id: "maia-2200",
    name: "Maia 2200",
    description: "Newer, stronger Maia variant trained on 2200-2299-rated Lichess games.",
    path: `${PERSONALITIES_DIR}/maia-2200.pb.gz`,
    era: "modern",
    approxRating: 2200,
  },
  {
    id: "mean-girl-8",
    name: "Mean Girl 8",
    description: "Aggressive, unorthodox attacking style -- a classic community sparring-partner net.",
    path: `${PERSONALITIES_DIR}/mean-girl-8.pb.gz`,
    era: "classic",
  },
];

export const LC0_DEFAULT_NET_ID = "t1-256-default";

export function getLc0Net(id: string | undefined): Lc0NetDefinition {
  return LC0_NETS.find(n => n.id === id) ?? LC0_NETS.find(n => n.id === LC0_DEFAULT_NET_ID)!;
}
