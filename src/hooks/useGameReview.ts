
import { useState, useCallback } from "react";
import { Chess, Move, validateFen, Color } from "chess.js";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { LineEval } from "@/stockfish/engine/engine";
import { CandidateMove } from "@/libs/agine/helper";
import { isFenInAllDatabases } from "../libs/openingdatabase/ecoDatabase";
import { getOpeningStats } from "@/libs/openingdatabase/helper";
import { useSessionStorage } from "usehooks-ts";

export type MoveQuality =
  | "Best"
  | "Very Good"
  | "Good"
  | "Dubious"
  | "Mistake"
  | "Blunder"
  | "Book";

export interface MoveAnalysis {
  plyNumber: number;
  notation: string;
  sanNotation: string | undefined;
  quality: MoveQuality;
  arrowMove: Move;
  evalMove: number;
  fen: string;
  currenFen: string;
  player: "w" | "b";
}

/**
 * Some of move classifcation logic is taken from ChessKit devs 
 * https://github.com/GuillaumeSD/Chesskit/blob/main/src/lib/engine/helpers/moveClassification.ts
 * 
 * other functions are my addition on top of it.
 * 
 * thanks to chessKit devs!
 */

const useGameReview = (
  stockfishEngine: UciEngine | undefined,
  searchDepth: number
) => {
  if (!stockfishEngine) {
    console.log("invalid engine waiting for it to start");
  }

  const [gameReview, setGameReview] = useSessionStorage<MoveAnalysis[]>("agine_current_game_review",[]);
  const [gameReviewLoading, setGameReviewLoading] = useState(false);
  const [gameReviewProgress, setGameReviewProgress] = useState(0);
  const [rootCurrentMove, setRootCurrentMove] = useState(0);

  // Convert centipawn to win percentage
  const centipawnToWinRate = (centipawn: number): number => {
    const clampedCp = Math.max(-1100, Math.min(centipawn, 1100));
    const conversionFactor = -0.0038988;
    const probability = 2 / (1 + Math.exp(conversionFactor * clampedCp)) - 1;
    return 55 + 55 * probability;
  };

  // Convert mate score to win percentage
  const mateToWinRate = (mateDistance: number): number => {
    if (mateDistance === 0) return 55;
    return mateDistance > 0 ? 100 : 0;
  };

  // Convert evaluation to win percentage
  const evaluationToWinRate = (evaluation: LineEval | undefined): number => {
    if (!evaluation) return 55;

    if (evaluation.cp !== undefined) {
      return centipawnToWinRate(evaluation.cp);
    }

    if (evaluation.mate !== undefined) {
      return mateToWinRate(evaluation.mate);
    }

    return 50;
  };

  // Normalize ChessDB score based on turn
  function normalizeChessDBScore(score: number, turn: Color): number {
    if (turn === "b") {
      return -score;
    }
    return score;
  }

  // Convert percentage string to number
  function percentToNumber(percentStr: string): number {
    return parseFloat(percentStr.replace('%', '').trim());
  }

  const getHasChangedGameOutcome = (
    lastPositionWinPercentage: number,
    positionWinPercentage: number,
    isWhiteMove: boolean
  ): boolean => {
    const winPercentageDiff =
      (positionWinPercentage - lastPositionWinPercentage) *
      (isWhiteMove ? 1 : -1);
    return (
      winPercentageDiff > 10 &&
      ((lastPositionWinPercentage < 50 && positionWinPercentage > 50) ||
        (lastPositionWinPercentage > 50 && positionWinPercentage < 50))
    );
  };

  const getIsTheOnlyGoodMove = (
    positionWinPercentage: number,
    lastPositionAlternativeLineWinPercentage: number,
    isWhiteMove: boolean
  ): boolean => {
    const winPercentageDiff =
      (positionWinPercentage - lastPositionAlternativeLineWinPercentage) *
      (isWhiteMove ? 1 : -1);
    return winPercentageDiff > 10;
  };

  const isLosingOrAlternateCompletelyWinning = (
    positionWinPercentage: number,
    lastPositionAlternativeLineWinPercentage: number,
    isWhiteMove: boolean
  ): boolean => {
    const isLosing = isWhiteMove
      ? positionWinPercentage < 50
      : positionWinPercentage > 50;
    const isAlternateCompletelyWinning = isWhiteMove
      ? lastPositionAlternativeLineWinPercentage > 97
      : lastPositionAlternativeLineWinPercentage < 3;

    return isLosing || isAlternateCompletelyWinning;
  };

  const isVeryGoodMove = (
    lastPositionWinPercentage: number,
    positionWinPercentage: number,
    isWhiteMove: boolean,
    lastPositionAlternativeLineWinPercentage: number | undefined
  ): boolean => {
    if (!lastPositionAlternativeLineWinPercentage) return false;

    const winPercentageDiff =
      (positionWinPercentage - lastPositionWinPercentage) *
      (isWhiteMove ? 1 : -1);
    if (winPercentageDiff < -2) return false;

    if (
      isLosingOrAlternateCompletelyWinning(
        positionWinPercentage,
        lastPositionAlternativeLineWinPercentage,
        isWhiteMove
      )
    ) {
      return false;
    }

    const hasChangedGameOutcome = getHasChangedGameOutcome(
      lastPositionWinPercentage,
      positionWinPercentage,
      isWhiteMove
    );

    const isTheOnlyGoodMove = getIsTheOnlyGoodMove(
      positionWinPercentage,
      lastPositionAlternativeLineWinPercentage,
      isWhiteMove
    );

    return hasChangedGameOutcome || isTheOnlyGoodMove;
  };

  const getMoveBasicClassification = (
    lastPositionWinPercentage: number,
    positionWinPercentage: number,
    isWhiteMove: boolean
  ): MoveQuality => {
    const winPercentageDiff =
      (positionWinPercentage - lastPositionWinPercentage) *
      (isWhiteMove ? 1 : -1);

    if (winPercentageDiff < -20) return "Blunder";
    if (winPercentageDiff < -10) return "Mistake";
    if (winPercentageDiff < -5) return "Dubious";
    if (winPercentageDiff < -2) return "Good";
    return "Very Good";
  };

  // Fetch ChessDB data
  const fetchChessDBData = useCallback(async (fenString: string) => {
    if (!fenString.trim()) {
      return [];
    }

    if (!validateFen(fenString)) {
      return [];
    }

    try {
      const encodedFen = encodeURIComponent(fenString);
      const apiUrl = `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodedFen}&learn=0&json=1`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        return [];
      }

      const responseData = await response.json();

      if (responseData.status !== "ok") {
        return [];
      }

      const moves = responseData.moves;
      if (!Array.isArray(moves) || moves.length === 0) {
        return [];
      }

      const processedMoves = moves.slice(0, 5).map((move: CandidateMove) => {
        const scoreNum = Number(move.score);
        const scoreStr = isNaN(scoreNum) ? "N/A" : String(scoreNum);
        return {
          uci: move.uci || "N/A",
          san: move.san || "N/A",
          score: scoreStr || 0,
          winrate: move.winrate || "N/A",
        };
      });

      return processedMoves;
    } catch (err) {
      console.log("error!", err);
      return [];
    }
  }, []);

  const generateGameReview = useCallback(
    async (gameNotation: string[], customFen?: string): Promise<void> => {
      setGameReviewLoading(true);
      setGameReviewProgress(0);

      if (!stockfishEngine) {
        console.warn("Chess engine unavailable");
        alert("Current Stockfish unsupported, please try changing to lower Stockfish version");
        setGameReviewLoading(false);
        return;
      }

      interface GameState {
        preMovefen: string; 
        preMoveWinRate: number;
        secondOptionWinRate: number | undefined;
        sanBestMove: string | undefined;
        postMovefen: string;
        activePlayer: Color;
        evalMove: number;
        moveNotation: string;
        arrowMove: Move;
        bestMove: string | undefined;
        plyIndex: number;
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
          let secondBestWinRate: number | undefined = 0;
          let bestMove;
          let evalMove = 0.0;
          const fetchMasterDb = await getOpeningStats(postMovefen);
          const openingMatch = isFenInAllDatabases(postMovefen) || (fetchMasterDb && fetchMasterDb.topGames.length > 0);

          if (openingMatch) {
            gameStates.push({
              activePlayer: activePlayer,
              preMoveWinRate: preMoveWinRate,
              secondOptionWinRate: secondBestWinRate,
              preMovefen: preMovefen,
              postMovefen: postMovefen,
              moveNotation: moveNotation,
              arrowMove: moveObject,
              evalMove: evalMove,
              plyIndex: ply,
              bestMove: bestMove,
              sanBestMove: sanNotation,
              openingMatch: true,
            });

            const phase1Progress =
              ((ply + 1) / totalMoves) * phase1Weight * 100;
            setGameReviewProgress(Math.round(phase1Progress));
            continue;
          }

          const chessDbEvals = await fetchChessDBData(preMovefen);
          let sanBestMove;

          if (chessDbEvals.length == 0) {
            const positionAnalysis =
              await stockfishEngine.evaluatePositionWithUpdate({
                fen: preMovefen,
                depth: analysisDepth,
                multiPv: 3,
              });

            preMoveWinRate = evaluationToWinRate(positionAnalysis.lines?.[0]);
            const secondBestEval = positionAnalysis.lines?.[1];
            secondBestWinRate = secondBestEval
              ? evaluationToWinRate(secondBestEval)
              : undefined;
            bestMove = positionAnalysis.bestMove;
            evalMove = positionAnalysis.lines[0].cp || 0;
            const chess = new Chess(preMovefen);
            const moveObjSan = bestMove ? chess.move(bestMove) : undefined;
            sanBestMove = moveObjSan ? moveObjSan.san : undefined;
          } else {
            preMoveWinRate = percentToNumber(chessDbEvals[0].winrate);
            evalMove = normalizeChessDBScore(Number(chessDbEvals[0].score || 0), activePlayer);
            secondBestWinRate = chessDbEvals[1] ? percentToNumber(chessDbEvals[1].winrate) : undefined;
            bestMove = chessDbEvals[0].uci;
            sanBestMove = chessDbEvals[0].san;
          }

          gameStates.push({
            activePlayer: activePlayer,
            preMoveWinRate: preMoveWinRate,
            secondOptionWinRate: secondBestWinRate,
            preMovefen: preMovefen,
            postMovefen: postMovefen,
            moveNotation: moveNotation,
            plyIndex: ply,
            evalMove: evalMove,
            arrowMove: moveObject,
            bestMove: bestMove,
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
            secondOptionWinRate,
            bestMove,
            openingMatch,
            sanBestMove,
            arrowMove,
            evalMove
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
              player: activePlayer,
            });

            const phase2Progress =
              phase1Weight * 100 +
              ((ply + 1) / gameStates.length) * phase2Weight * 100;
            setGameReviewProgress(Math.round(phase2Progress));
            continue;
          }

          const nextState =
            ply < gameStates.length - 1 ? gameStates[ply + 1] : null;
          const postMoveWinRate = nextState
            ? nextState.preMoveWinRate
            : preMoveWinRate;

          const secondBestWinRate = secondOptionWinRate;

          const isWhitePlaying = activePlayer === "w";
          const playedMove = moveHistory[ply];
          const engineChoice = bestMove;

          if (
            isVeryGoodMove(
              preMoveWinRate,
              postMoveWinRate,
              isWhitePlaying,
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
            postMoveWinRate,
            isWhitePlaying
          );

          moveEvaluations.push({
            plyNumber: plyIndex,
            notation: moveNotation,
            sanNotation: sanBestMove,
            quality: qualityRating,
            arrowMove: arrowMove,
            fen: preMovefen,
            evalMove,
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