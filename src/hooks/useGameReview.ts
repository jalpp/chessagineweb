import { useState, useCallback } from "react";
import { Chess, Move, Color } from "chess.js";
import { isFenInAllDatabases } from "../libs/openingdatabase/ecoDatabase";
import { useSessionStorage } from "usehooks-ts";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { useChessDB } from "./useChessDb";
import { isVeryGoodMove,evaluationToWinRate, percentToNumber, normalizeChessDBScore, getMoveBasicClassification } from "@/libs/game/gamereview";
import { StockfishEaseMetricCalculator } from "@/libs/easemetric/stockfishEaseMetric";
import { ChessDBEaseMetricCalculator } from "@/libs/easemetric/chessDbEaseMetric";
import { useNets } from "./useNets";
import { MoveAnalysis } from "@/libs/agine/helper";


/**
 * Some of move classification logic is taken from ChessKit devs 
 * https://github.com/GuillaumeSD/Chesskit/blob/main/src/lib/engine/helpers/moveClassification.ts
 * 
 * other functions are my addition on top of it.
 * 
 * thanks to chessKit devs!
 * 
 * @author
 * jalpp, ChessKit devs
 */

const useGameReview = (stockfishEngine: UciEngine | undefined, searchDepth: number) => {
  
  const [gameReview, setGameReview] = useSessionStorage<MoveAnalysis[]>("agine_current_game_review",[]);
  const [gameReviewLoading, setGameReviewLoading] = useState(false);
  const [gameReviewProgress, setGameReviewProgress] = useState(0);
  const [rootCurrentMove, setRootCurrentMove] = useState(0);
  const {fetchChessDBData} = useChessDB("", true);
  const { analyzePositionNet } = useNets({fen: "", gameReviewMode: true, useLichessBook: false, maxRetries: 1, enabledModels: ['bigLeela']}); 
  const stockfishEmCalculator = new StockfishEaseMetricCalculator(false);
  const chessDbEmCalculator = new ChessDBEaseMetricCalculator(false);


  const generateGameReview = useCallback(
    async (gameNotation: string[], customFen?: string): Promise<void> => {
      setGameReviewLoading(true);
      setGameReviewProgress(0);

      if (!stockfishEngine) {
        console.warn("Chess engine unavailable");
        setGameReviewLoading(false);
        return;
      }

      interface GameState {
        preMovefen: string;
        preMoveWinRate: number;
        postMoveWinRate: number;
        secondOptionWinRate: number | undefined;
        sanBestMove: string | undefined;
        postMovefen: string;
        activePlayer: Color;
        evalMove: number;
        moveNotation: string;
        arrowMove: Move;
        bestMove: string | undefined;
        plyIndex: number;
        easeMetric?: number;
        openingMatch: boolean;
      }

      try {
        const gameBoard = new Chess(customFen);
        const moveEvaluations: MoveAnalysis[] = [];
        const analysisDepth = searchDepth;
        const gameStates: GameState[] = [];
        const moveHistory: string[] = [];

        const totalMoves = gameNotation.length;

        const phase1Weight = 0.95;
        const phase2Weight = 0.05;

        // Phase 1: Collect all game states
        for (let ply = 0; ply < gameNotation.length; ply++) {
          const preMovefen = gameBoard.fen();
          const activePlayer = gameBoard.turn();
          const moveNotation = gameNotation[ply];

          const moveObject = gameBoard.move(moveNotation);

          const postMovefen = gameBoard.fen();
          if (!moveObject) {
            console.error(
              `Illegal move detected: ${moveNotation} at ply ${ply}`
            );
            continue;
          }

          const uciNotation =
            moveObject.from + moveObject.to + (moveObject.promotion || "");
          const sanNotation = moveObject.san;
          moveHistory.push(uciNotation);

          let preMoveWinRate = 0;
          let postMoveWinRate = 0;
          let secondBestWinRate: number | undefined = 0;
          let bestMove;
          let evalMove = 0.0;
          let easeMetric;
          const openingMatch = isFenInAllDatabases(postMovefen);

          if (openingMatch) {
            gameStates.push({
              activePlayer: activePlayer,
              preMoveWinRate: preMoveWinRate,
              postMoveWinRate: postMoveWinRate,
              secondOptionWinRate: secondBestWinRate,
              preMovefen: preMovefen,
              postMovefen: postMovefen,
              moveNotation: moveNotation,
              arrowMove: moveObject,
              evalMove: evalMove,
              plyIndex: ply,
              easeMetric: 0.90,
              bestMove: bestMove,
              sanBestMove: sanNotation,
              openingMatch: true,
            });

            const phase1Progress =
              ((ply + 1) / totalMoves) * phase1Weight * 100;
            setGameReviewProgress(Math.round(phase1Progress));
            continue;
          }
          const data = await fetchChessDBData(preMovefen);
          const chessDbEvals = data ? data : [];
          
          let sanBestMove;

          // Evaluate PRE-MOVE position (convert to player's perspective)
          if (chessDbEvals.length == 0) {
            const positionAnalysis =
              await stockfishEngine.evaluatePositionWithUpdate({
                fen: preMovefen,
                depth: analysisDepth,
                multiPv: 3,
              });

            // Get win rate from White's perspective, then convert to player's perspective
            const whiteWinRate = evaluationToWinRate(positionAnalysis.lines?.[0]);
            preMoveWinRate = activePlayer === "w" ? whiteWinRate : 100 - whiteWinRate;

            const secondBestEval = positionAnalysis.lines?.[1];
            const secondWhiteWinRate = secondBestEval
              ? evaluationToWinRate(secondBestEval)
              : undefined;
            secondBestWinRate = secondWhiteWinRate
              ? (activePlayer === "w" ? secondWhiteWinRate : 100 - secondWhiteWinRate)
              : undefined;

            bestMove = positionAnalysis.bestMove;
            evalMove = positionAnalysis.lines[0].cp || 0;
            const chess = new Chess(preMovefen);
            const moveObjSan = bestMove ? chess.move(bestMove) : undefined;
            sanBestMove = moveObjSan ? moveObjSan.san : undefined;

            const netResult = await analyzePositionNet?.(preMovefen)
            if(netResult?.bigLeela){
              easeMetric = stockfishEmCalculator.calculateEaseMetric(netResult?.bigLeela, positionAnalysis)  
            }else{
              easeMetric = undefined;
            }

          } else {
            // ChessDB winrate is already from the side to move (player's perspective)
            preMoveWinRate = percentToNumber(chessDbEvals[0].winrate);
            evalMove = normalizeChessDBScore(
              Number(chessDbEvals[0].score || 0),
              activePlayer
            );
            secondBestWinRate = chessDbEvals[1]
              ? percentToNumber(chessDbEvals[1].winrate)
              : undefined;
            bestMove = chessDbEvals[0].uci;
            sanBestMove = chessDbEvals[0].san;

            const netResult = await analyzePositionNet?.(preMovefen)
            if(netResult?.bigLeela){
              easeMetric = chessDbEmCalculator.calculateEaseMetric(netResult.bigLeela, chessDbEvals);
            }else{
              easeMetric = undefined;
            }
          }

          // Evaluate POST-MOVE position (convert to player's perspective)
           const datapost = await fetchChessDBData(postMovefen);
           const chessDbEvalsPost = datapost ? datapost : [];
          
          if (chessDbEvalsPost.length == 0) {
            const postAnalysis =
              await stockfishEngine.evaluatePositionWithUpdate({
                fen: postMovefen,
                depth: analysisDepth,
                multiPv: 1,
              });
            
            // Get evaluation from White's perspective
            const postWhiteWinRate = evaluationToWinRate(postAnalysis.lines?.[0]);
            // Convert to the player who just moved (activePlayer)
            postMoveWinRate = activePlayer === "w" ? postWhiteWinRate : 100 - postWhiteWinRate;
          } else {
            // ChessDB winrate is from side to move (opponent), so flip it to get player's perspective
            const opponentWinRate = percentToNumber(chessDbEvalsPost[0].winrate);
            postMoveWinRate = 100 - opponentWinRate;
          }

          gameStates.push({
            activePlayer: activePlayer,
            preMoveWinRate: preMoveWinRate,
            postMoveWinRate: postMoveWinRate,
            secondOptionWinRate: secondBestWinRate,
            preMovefen: preMovefen,
            postMovefen: postMovefen,
            moveNotation: moveNotation,
            plyIndex: ply,
            evalMove: evalMove,
            arrowMove: moveObject,
            bestMove: bestMove,
            easeMetric: easeMetric,
            sanBestMove: sanBestMove,
            openingMatch: false,
          });

          const phase1Progress = ((ply + 1) / totalMoves) * phase1Weight * 100;
          setGameReviewProgress(Math.round(phase1Progress));
        }

        // Phase 2: Classify all moves
        for (let ply = 0; ply < gameStates.length; ply++) {
          const currentState = gameStates[ply];
          const {
            activePlayer,
            moveNotation,
            plyIndex,
            preMovefen,
            postMovefen,
            preMoveWinRate,
            postMoveWinRate,
            secondOptionWinRate,
            bestMove,
            openingMatch,
            sanBestMove,
            arrowMove,
            evalMove,
            easeMetric,
          } = currentState;

          if (openingMatch) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              fen: preMovefen,
              notation: moveNotation,
              sanNotation: sanBestMove,
              evalMove,
              currenFen: postMovefen,
              arrowMove: arrowMove,
              quality: "Book",
              easeMetric: 0.90,
              player: activePlayer,
            });

            const phase2Progress =
              phase1Weight * 100 +
              ((ply + 1) / gameStates.length) * phase2Weight * 100;
            setGameReviewProgress(Math.round(phase2Progress));
            continue;
          }

          const secondBestWinRate = secondOptionWinRate;
          const playedMove = moveHistory[ply];
          const engineChoice = bestMove;

          // Check for Very Good move
          if (
            isVeryGoodMove(
              preMoveWinRate,
              postMoveWinRate,
              secondBestWinRate
            )
          ) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              notation: moveNotation,
              sanNotation: sanBestMove,
              fen: preMovefen,
              evalMove,
              currenFen: postMovefen,
              easeMetric: easeMetric,
              arrowMove: arrowMove,
              quality: "Very Good",
              player: activePlayer,
            });

            const phase2Progress =
              phase1Weight * 100 +
              ((ply + 1) / gameStates.length) * phase2Weight * 100;
            setGameReviewProgress(Math.round(phase2Progress));
            continue;
          }

          // Check if played move matches best move
          if (playedMove === engineChoice) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              notation: moveNotation,
              sanNotation: sanBestMove,
              fen: preMovefen,
              quality: "Best",
              evalMove,
              easeMetric: easeMetric,
              arrowMove: arrowMove,
              currenFen: postMovefen,
              player: activePlayer,
            });

            const phase2Progress =
              phase1Weight * 100 +
              ((ply + 1) / gameStates.length) * phase2Weight * 100;
            setGameReviewProgress(Math.round(phase2Progress));
            continue;
          }

          // Get basic classification (Good, Dubious, Mistake, Blunder)
          const qualityRating = getMoveBasicClassification(
            preMoveWinRate,
            postMoveWinRate
          );

          moveEvaluations.push({
            plyNumber: plyIndex,
            notation: moveNotation,
            sanNotation: sanBestMove,
            quality: qualityRating,
            arrowMove: arrowMove,
            fen: preMovefen,
            evalMove,
            easeMetric: easeMetric,
            currenFen: postMovefen,
            player: activePlayer,
          });

          const phase2Progress =
            phase1Weight * 100 +
            ((ply + 1) / gameStates.length) * phase2Weight * 100;
          setGameReviewProgress(Math.round(phase2Progress));
        }

        console.log("Analysis Complete:", moveEvaluations);
        setGameReview(moveEvaluations);
        setGameReviewProgress(100);
      } catch (error) {
        console.error("Analysis failed:", error);
      } finally {
        setGameReviewLoading(false);
      }
    },
    [stockfishEngine, searchDepth, fetchChessDBData]
  );

  return {
    gameReview,
    gameReviewLoading,
    gameReviewProgress,
    setGameReview,
    setGameReviewLoading,
    generateGameReview,
    setRootCurrentMove,
    rootCurrentMove
  };
};

export default useGameReview;