import { Chess, Color } from "chess.js";
import { BOARD_CENTRE, BOARD_FLANK, SpaceControl } from "../types";

function getSpaceControl(chess: Chess, side: Color): number {
   let spaceMeasure = 0;
   for(const sq of BOARD_CENTRE){
     spaceMeasure += chess.attackers(sq, side).length;
   }
   return spaceMeasure;
}

function getFlankSpaceControl(chess: Chess, side: Color): number {
  let flankMeasure = 0;
  for(const sq of BOARD_FLANK){
    flankMeasure += chess.attackers(sq, side).length;
  }
  return flankMeasure;
}

export function getSideSpaceControl(chess: Chess, side: Color): SpaceControl {
    const centre = getSpaceControl(chess, side);
    const flank = getFlankSpaceControl(chess, side);
    return {
        centerspacecontrolscore: centre,
        flankspacecontrolscore: flank,
        totalspacecontrolscore: centre + flank
    };
}