import { Mastra } from "@mastra/core";
import { chessAgine } from "./agents";

export const mastra = new Mastra({
  agents: { chessAgine },
});