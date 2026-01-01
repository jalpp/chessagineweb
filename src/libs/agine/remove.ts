import fs from "fs";
import path from "path";

/* =========================
   Paths
========================= */
const INPUT_FILE = path.resolve(__dirname, "dojoRequirements.json");
const OUTPUT_FILE = path.resolve(__dirname, "requirements.filtered.json");

/* =========================
   Types (match your input)
========================= */

interface Position {
  title: string;
  fen: string;
  limitSeconds: number;
  incrementSeconds: number;
  result: string;
}

interface Requirement {
  requirementName: string;
  shortName?: string;
  category: string;
  status: string;
  cohorts: string[];
  id: string;
  positionCount: number;
  positions: Position[];
}

interface PositionsOutput {
  requirements: Requirement[];
}

/* =========================
   Allowed requirement names
========================= */

const ALLOWED_REQUIREMENT_NAMES = new Set<string>([
  // Spar Middlegame
  "Spar Middlegame Position #1",
  "Spar Middlegame Position #2",
  "Spar Middlegame Position #3",
  "Spar Middlegame Position #4",
  "Spar Middlegame Position #5",
  "Spar Middlegame Position #7",
  "Spar Middlegame Position #9",
  "Spar Middlegame Position #11",
  "Spar Middlegame Position #13",
  "Spar Middlegame Position #16",
  "Spar Middlegame Position #19",
  "Spar Middlegame Position #22",
  "Spar Middlegame Position #25",
  "Spar Middlegame Position #29",
  "Spar Middlegame Position #33",

  // Complete Algorithm
  "Complete Algorithm #1",
  "Complete Algorithm #2",
  "Complete Algorithm #3",
  "Complete Algorithm #4",
  "Complete Algorithm #7",
  "Complete Algorithm #9",
  "Complete Algorithm #11",
  "Complete Algorithm #14",
  "Complete Algorithm #17",

  // Win Conversion
  "Win Conversion #1",
  "Win Conversion #2",

  // Spar Position
  "Spar Position #1",
  "Spar Position #2",
  "Spar Position #3",
  "Spar Position #4",
  "Spar Position #5",
  "Spar Position #7",
  "Spar Position #9",
  "Spar Position #11",
  "Spar Position #13",
  "Spar Position #16",
  "Spar Position #19",
  "Spar Position #22",
  "Spar Position #25",
  "Spar Position #29",
  "Spar Position #33",

  // Win REP
  "Win REP Match #1",
]);

/* =========================
   Main
========================= */

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}`);
  }

  const raw = fs.readFileSync(INPUT_FILE, "utf-8");
  const data: PositionsOutput = JSON.parse(raw);

  const originalCount = data.requirements.length;

  const filteredRequirements = data.requirements.filter((req) =>
    ALLOWED_REQUIREMENT_NAMES.has(req.requirementName)
  );

  const output: PositionsOutput = {
    requirements: filteredRequirements,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

  console.log("✅ Requirements filtered successfully");
  console.log(`Original count: ${originalCount}`);
  console.log(`Kept count: ${filteredRequirements.length}`);
  console.log(`Output file: ${OUTPUT_FILE}`);
}

main();
