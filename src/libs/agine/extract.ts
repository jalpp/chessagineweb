import * as fs from "fs";
import * as path from "path";

interface Position {
  title: string;
  fen: string;
  limitSeconds: number;
  incrementSeconds: number;
  result: string;
}

interface Requirement {
  id: string;
  status: string;
  category: string;
  name: string;
  counts: Record<string, number>;
  shortName: string;
  positions: Position[];
  [key: string]: any;
}

interface RequirementsFile {
  requirements: Requirement[];
}

interface PositionsOutput {
  requirementName: string;
  shortName: string;
  cohorts: string[];
  category: string;
  positions: Position[];
}

/**
 * Extracts positions from a requirement by name
 * @param inputFilePath - Path to the input JSON file containing requirements
 * @param requirementName - Name of the requirement to extract positions from
 * @param outputFilePath - Path to save the extracted positions JSON file
 */
function extractPositions(
  inputFilePath: string,
  requirementName: string,
  outputFilePath: string
): void {
  try {
    // Read the input file
    const fileContent = fs.readFileSync(inputFilePath, "utf-8");
    const data: RequirementsFile = JSON.parse(fileContent);

    // Find the requirement by name
    const requirement = data.requirements.find(
      (req) => req.name === requirementName
    );

    if (!requirement) {
      console.error(`Requirement with name "${requirementName}" not found.`);
      process.exit(1);
    }

    // Extract positions
    const output: PositionsOutput = {
      requirementName: requirement.name,
      shortName: requirement.shortName,
      cohorts: requirement.counts ? Object.keys(requirement.counts) : [],
      category: requirement.category,
      positions: requirement.positions,
    };

    // Ensure output directory exists
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to output file
    fs.writeFileSync(outputFilePath, JSON.stringify(output, null, 2), "utf-8");

    console.log(
      `✓ Extracted ${output.positions.length} positions from "${requirementName}"`
    );
    console.log(`✓ Saved to: ${outputFilePath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("An unknown error occurred");
    }
    process.exit(1);
  }
}

/**
 * Extracts positions from all requirements that have positions
 * @param inputFilePath - Path to the input JSON file containing requirements
 * @param outputFilePath - Path to save the extracted positions JSON file
 */
function extractAllPositions(
  inputFilePath: string,
  outputFilePath: string
): void {
  try {
    // Read the input file
    const fileContent = fs.readFileSync(inputFilePath, "utf-8");
    const data: RequirementsFile = JSON.parse(fileContent);

    // Filter requirements that have positions and extract their data
    const allPositions = data.requirements
      .filter((req) => req.positions && req.positions.length > 0)
      .map((req) => ({
        requirementName: req.name,
        shortName: req.shortName,
        category: req.category,
        status: req.status,
        cohorts: req.counts ? Object.keys(req.counts) : [],
        id: req.id,
        positionCount: req.positions.length,
        positions: req.positions,
      }));

    // Ensure output directory exists
    const outputDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to output file
    fs.writeFileSync(
      outputFilePath,
      JSON.stringify({ requirements: allPositions }, null, 2),
      "utf-8"
    );

    const totalPositions = allPositions.reduce(
      (sum, req) => sum + req.positionCount,
      0
    );

    console.log(`✓ Found ${allPositions.length} requirements with positions`);
    console.log(`✓ Total positions: ${totalPositions}`);
    console.log(`✓ Saved to: ${outputFilePath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("An unknown error occurred");
    }
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage:");
    console.log("  Extract all requirements:");
    console.log("    ts-node extract-positions.ts <input-file> <output-file>");
    console.log("\n  Extract specific requirement:");
    console.log(
      "    ts-node extract-positions.ts <input-file> <requirement-name> <output-file>"
    );
    console.log("\nExamples:");
    console.log(
      "  ts-node extract-positions.ts requirements.json all-positions.json"
    );
    console.log(
      '  ts-node extract-positions.ts requirements.json "Complete Algorithm #8" positions.json'
    );
    process.exit(1);
  }

  const [inputFilePath, secondArg, thirdArg] = args;

  if (args.length === 2) {
    // Extract all requirements
    extractAllPositions(inputFilePath, secondArg);
  } else if (args.length === 3) {
    // Extract specific requirement
    extractPositions(inputFilePath, secondArg, thirdArg);
  } else {
    console.error("Invalid number of arguments");
    process.exit(1);
  }
}

// Export for use as a module
export { extractPositions, extractAllPositions };
