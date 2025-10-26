import { Chess, Color, Square, WHITE, BLACK } from "chess.js";
import { getPiecePlacement } from "./piecePlacement";
import { SideSquareControl } from "../types";

export function getSideSquareControl(chess: Chess, side: Color): SideSquareControl {
   const placement = getPiecePlacement(chess, side);
   const lightSquares: string[] = [];
   const darkSquares: string[] =  [];

   const allSquares = [...placement.knightplacement, ...placement.bishopplacement, ...placement.pawnplacement, ...placement.queenplacement, ...placement.rookplacement, ...placement.kingplacement];

   for(const square of allSquares){
     if(chess.squareColor(square as Square) === "light"){
       lightSquares.push(square);
     }else {
      darkSquares.push(square);
     }
   }

   // Calculate enemy's square control for comparison
   const enemySide = side === WHITE ? BLACK : WHITE;
   const enemyPlacement = getPiecePlacement(chess, enemySide);
   const enemyLightSquares: string[] = [];
   const enemyDarkSquares: string[] = [];

   const enemyAllSquares = [...enemyPlacement.knightplacement, ...enemyPlacement.bishopplacement, ...enemyPlacement.pawnplacement, ...enemyPlacement.queenplacement, ...enemyPlacement.rookplacement, ...enemyPlacement.kingplacement];

   for(const square of enemyAllSquares){
     if(chess.squareColor(square as Square) === "light"){
       enemyLightSquares.push(square);
     }else {
      enemyDarkSquares.push(square);
     }
   }

   // Calculate advantages
   const lightSquareAdvantage = lightSquares.length - enemyLightSquares.length;
   const darkSquareAdvantage = darkSquares.length - enemyDarkSquares.length;
   const totalSquareAdvantage = lightSquareAdvantage + darkSquareAdvantage;

   return {
    lightSquareControl: lightSquares.length,
    darkSqaureControl: darkSquares.length,
    lightSquares: lightSquares,
    darkSquares: darkSquares,
    lightSquareAdvantage: lightSquareAdvantage,
    darkSqaureAdvantage: darkSquareAdvantage,
    totalSqaureAdvantage: totalSquareAdvantage
   }
}