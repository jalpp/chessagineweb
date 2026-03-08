import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName, PositionEval, LineEval } from "@/stockfish/engine/engine";
import {
  MasterGames,
  getOpeningStatSpeech,
  getOpeningStats,
  Moves,
  getLichessOpeningStats,
} from "@/libs/openingdatabase/helper";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@clerk/nextjs";
import { Chess } from "chess.js";
import { CandidateMove } from "@/libs/agine/helper";
import { getChessDBSpeech } from "@/libs/agine/helper";
import { useChessDB } from "./useChessDb";
import { useLocalStorage } from "usehooks-ts";
import useGameReview from "./useGameReview";
import { MoveAnalysis } from "@/libs/agine/helper";
import { ApiSettings } from "@/libs/agine/helper";
import { DEFAULT_ENGINE_LINES, DEFAULT_ENGINE_DEPTH, MAX_PV_MOVES, ANALYSIS_DELAY } from "@/libs/setting/helper";
import { AgineState, isValidFEN, createChatMessage, AgentMessage, ChatMessage, AnalysisData, EngineLineData, MoveQuality } from "@/libs/agine/helper";

import { useThemeScore } from "./useThemeScore";
import { useChatContext } from "@/context/ChatContext";
import { useNets } from "./useNets";
import { addNetAnalysisToQuery } from "@/libs/nets/maiaPrompter";
import { getReverseStockfishCacheKey, getStockfishCacheKey, readStockfishCache, writeStockfishCache } from "@/stockfish/engine/cache";
import { LANGUAGES } from "@/libs/docs/helper";

export default function useAgine(fen: string) {


  const {
    chatMessages,
    chatInput,
    chatLoading,
    setChatMessages,
    addChatMessage,
    setChatInput,
    setChatLoading,
  } = useChatContext()

  const [state, setState] = useState<AgineState>({
    llmAnalysisResult: null,
    stockfishAnalysisResult: null,
    reverseStockfishAnalysisResult: null,
    openingData: null,
    lichessOpeningData: null,
    llmLoading: false,
    stockfishLoading: false,
    openingLoading: false,
    lichessOpeningLoading: false,
    moveSquares: {},
    analysisTab: 0,

  });

  // Engine settings with localStorage
  const [engineDepth, setEngineDepth] = useLocalStorage<number>(
    "engineDepth",
    DEFAULT_ENGINE_DEPTH
  );
  const [engineLines, setEngineLines] = useLocalStorage<number>(
    "engineLines",
    DEFAULT_ENGINE_LINES
  );

  const { evaluations, sanEvaluations, isLoading: isNetLoading, evaluationsFen } = useNets({ fen: fen });

  const [enginePicked] = useLocalStorage<EngineName>(
    "stockfish-engine-picked",
    EngineName.Stockfish17Point
  )

  const { session } = useSession();
  const engine = useEngine(true, enginePicked);
  const [stockfishFen, setStockfishFen] = useState<string | null>(null);
  const [stockfishDone, setStockfishDone] = useState(false);


  useEffect(() => {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("stockfish:"))
      .forEach((k) => sessionStorage.removeItem(k));
  }, [engine]);


  const { data: chessdbdata, loading, error, queueing, refetch, requestAnalysis } = useChessDB(fen);
  const {
    gameReview,
    setGameReview,
    gameReviewLoading,
    gameReviewProgress,
    setGameReviewLoading,
    generateGameReview,
    rootCurrentMove,
    setRootCurrentMove
  } = useGameReview(engine, engineDepth);

  const colorside = isValidFEN(fen) ? new Chess(fen).turn() : "w";
  const { scores, loading: themeScoreLoading, error: themeScoreError } = useThemeScore(fen, colorside);

  const currentFenRef = useRef(fen);
  const abortControllerRef = useRef<AbortController | null>(null);


  useEffect(() => {
    currentFenRef.current = fen;
  }, [fen]);





  const formatEvaluation = useCallback((line: LineEval): string => {
    if (line.mate !== undefined) {
      return `M${line.mate}`;
    }
    if (line.cp !== undefined) {
      const eval1 = line.cp / 100;
      return eval1 > 0 ? `+${eval1.toFixed(2)}` : eval1.toFixed(2);
    }
    return "0.00";
  }, []);

  const formatPrincipalVariation = useCallback(
    (pv: string[], startFen: string): string => {
      const tempGame = new Chess(startFen);
      const moves: string[] = [];

      for (const uciMove of pv.slice(0, MAX_PV_MOVES)) {
        try {
          const move = tempGame.move({
            from: uciMove.slice(0, 2),
            to: uciMove.slice(2, 4),
            promotion: uciMove.length > 4 ? (uciMove[4] as string) : undefined,
          });
          if (move) {
            moves.push(move.san);
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      return moves.join(" ");
    },
    []
  );

  const formatLineForLLM = useCallback(
    (line: LineEval, lineIndex: number): string => {
      const evaluation = formatEvaluation(line);
      const moves = formatPrincipalVariation(line.pv, line.fen);

      let formattedLine = `Line ${lineIndex + 1}: ${evaluation} - ${moves}`;

      if (line.resultPercentages) {
        formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
      }

      return formattedLine;
    },
    [formatEvaluation, formatPrincipalVariation]
  );

  // ==================== STATE UPDATERS ====================
  const updateState = useCallback((updates: Partial<AgineState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);




  const makeApiRequest = useCallback(
    async (fen: string, query: string, mode: string): Promise<AgentMessage> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const token = await session?.getToken();

        const apiSettings = JSON.parse(localStorage.getItem('api-settings') || '{}') as ApiSettings;

        if (!apiSettings.ollamaBaseUrl && apiSettings.provider == "ollama") {
          throw new Error("Please configure your Ollama Ngrok local LLM endpoint in the settins page before using ChessAgine. If you are not sure you can read the docs in the docs tab, please create an issue on Github if you need help.")
        }

        if (!apiSettings.apiKey && (apiSettings.provider === "anthropic" || apiSettings.provider === "google" || apiSettings.provider === "openai")) {
          throw new Error('Please configure your API Key in the Settings page before using ChessAgine. If you are not sure you can read the docs in the docs tab, please create an issue on Github if you need help.');
        }

        const response = await fetch(`/api/agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fen,
            query,
            mode,
            apiSettings: {
              provider: apiSettings.provider,
              model: apiSettings.model,
              apiKey: apiSettings.apiKey,
              language: apiSettings.language,
              isRouted: apiSettings.isRouted,
              ollamaBaseUrl: `${apiSettings.ollamaBaseUrl}/api`
            }
          }),
          signal: controller.signal,
        });

        const data = await response.json() as AgentMessage;
        return data;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request cancelled");
        }
        throw error;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [session]
  );

  const fetchOpeningData = useCallback(async (): Promise<void> => {
    const currentFen = currentFenRef.current;
    updateState({ openingLoading: true });

    try {
      const data = await getOpeningStats(currentFen);
      if (currentFenRef.current === currentFen) {
        updateState({ openingData: data, openingLoading: false });
      }
    } catch (error) {
      console.error("Error fetching opening data:", error);
      if (currentFenRef.current === currentFen) {
        updateState({ openingData: null, openingLoading: false });
      }
    }
  }, [updateState]);

  const fetchLichessOpeningData = useCallback(async (): Promise<void> => {
    const currentFen = currentFenRef.current;
    updateState({ lichessOpeningLoading: true });

    try {
      const data = await getLichessOpeningStats(currentFen);
      if (currentFenRef.current === currentFen) {
        updateState({ lichessOpeningData: data, lichessOpeningLoading: false });
      }
    } catch (error) {
      console.error("Error fetching Lichess opening data:", error);
      if (currentFenRef.current === currentFen) {
        updateState({ lichessOpeningData: null, lichessOpeningLoading: false });
      }
    }
  }, [updateState]);

const analyzeWithStockfish = useCallback(async () => {
  if (!engine || !fen) return;

  const currentFen = currentFenRef.current;
  const cacheKey = getStockfishCacheKey(
    currentFen,
    engineDepth,
    engineLines
  );

  const cached = readStockfishCache(cacheKey);
  if (cached) {
    updateState({
      stockfishAnalysisResult: cached,
      stockfishLoading: false,
    });
    setStockfishFen(currentFen);
    setStockfishDone(true);
    
    // Still analyze threats in background even if main analysis is cached
    await analyzeThreatsInBackground(currentFen);
    return;
  }

  updateState({ stockfishLoading: true });
  setStockfishFen(null);
  setStockfishDone(false);

  try {
    const result = await engine.evaluatePositionWithUpdate({
      fen: currentFen,
      depth: engineDepth,
      multiPv: engineLines,
      setPartialEval: (partialEval) => {
        if (currentFenRef.current === currentFen) {
          updateState({ stockfishAnalysisResult: partialEval });
          setStockfishFen(currentFen);
          setStockfishDone(false);
        }
      },
    });

    if (currentFenRef.current === currentFen) {
      writeStockfishCache(cacheKey, result);

      updateState({
        stockfishAnalysisResult: result,
        stockfishLoading: false,
      });
      setStockfishFen(currentFen);
      setStockfishDone(true);
      
      // Automatically analyze threats after main analysis completes
      await analyzeThreatsInBackground(currentFen);
    }
  } catch (err) {
    console.error("Stockfish analysis failed:", err);

    if (currentFenRef.current === currentFen) {
      updateState({
        stockfishAnalysisResult: null,
        stockfishLoading: false,
      });
      setStockfishFen(null);
      setStockfishDone(true);
    }
  }
}, [engine, fen, engineDepth, engineLines, updateState]);

// Helper function to analyze threats in the background
const analyzeThreatsInBackground = useCallback(async (currentFen: string) => {
  if (!engine) {
    console.debug("[analyzeThreatsInBackground] Engine not available, skipping threat analysis");
    return;
  }

  console.debug("[analyzeThreatsInBackground] Starting threat analysis for FEN:", currentFen);

  try {
    // Create a "null move" by switching the side to move
    const chess = new Chess(currentFen);
    const nullMoveFen = currentFen.replace(
      chess.turn() === 'w' ? ' w ' : ' b ',
      chess.turn() === 'w' ? ' b ' : ' w '
    );

    

    const cacheKey = getReverseStockfishCacheKey(
      nullMoveFen,
      12, // Fixed depth for threat analysis
      4   // Fixed lines for threat analysis
    );


    // Check cache first
    const cached = readStockfishCache(cacheKey);
    if (cached) {
      console.debug("[analyzeThreatsInBackground] Found cached threat analysis, applying result");
      if (currentFenRef.current === currentFen) {
        updateState({
          reverseStockfishAnalysisResult: cached,
        });
        console.info("[analyzeThreatsInBackground] Threat analysis updated from cache");
      } else {
        console.debug("[analyzeThreatsInBackground] FEN changed, skipping cache update");
      }
      return;
    }

    console.debug("[analyzeThreatsInBackground] No cache found, analyzing threats with engine");

    // Analyze threats silently in background
    const result = await engine.evaluatePositionWithUpdate({
      fen: nullMoveFen,
      depth: 12,
      multiPv: 4,
      setPartialEval: (partialEval) => {
        console.debug("[analyzeThreatsInBackground] Partial evaluation received, lines:", partialEval.lines?.length);
        if (currentFenRef.current === currentFen) {
          updateState({ reverseStockfishAnalysisResult: partialEval });
        } else {
          console.debug("[analyzeThreatsInBackground] FEN changed during analysis, ignoring partial result");
        }
      },
    });

    if (currentFenRef.current === currentFen) {
      writeStockfishCache(cacheKey, result);
      updateState({
        reverseStockfishAnalysisResult: result,
      });
      console.info("[analyzeThreatsInBackground] Threat analysis complete, result cached and applied");
    } else {
      console.debug("[analyzeThreatsInBackground] FEN changed before analysis completed, discarding result");
    }
  } catch (err) {
    console.error("[analyzeThreatsInBackground] Threat analysis failed:", err instanceof Error ? err.message : String(err));
    if (currentFenRef.current === currentFen) {
      updateState({
        reverseStockfishAnalysisResult: null,
      });
      console.debug("[analyzeThreatsInBackground] Error state updated");
    }
  }
}, [engine, updateState]);


  const abortChatMessage = useCallback((): void => {
    if (abortControllerRef.current) {
      console.log("Aborting chat message...");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      setChatLoading(false);
      addChatMessage(createChatMessage("assistant", "", "Message generation was cancelled."));
    }
  }, [updateState, addChatMessage]);



  const buildCustomChatQuery = useCallback(
    (
      currentFen: string,
      sideToMove: string,
      langCode: string,

    ): string => {

      const type = 'standard';

      let query = `
LangCode: ${langCode}
Type: ${type}
FEN: ${currentFen}`;


      const formattedSide = sideToMove.charAt(0).toUpperCase() + sideToMove.slice(1).toLowerCase();
      query += `\nSide: ${formattedSide}`;


      query += `\nActor: human`;

      const currentMoveIndex = rootCurrentMove;

      if (gameReview && gameReview.length > 0 && currentMoveIndex) {

        if (currentMoveIndex !== -1) {
          const moveAnalysis = gameReview[currentMoveIndex];

          query += `\nmoveSAN: ${moveAnalysis.notation}`
          query += `\nTag: ${moveAnalysis.quality}`;


          if (moveAnalysis.sanNotation) {
            query += `\nBestAlt: ${moveAnalysis.sanNotation}`;
          }


          const cpAfter = moveAnalysis.evalMove;
          let cpBefore = cpAfter;

          if (currentMoveIndex > 0) {
            cpBefore = gameReview[currentMoveIndex - 1].evalMove;
          }

          const delta = cpAfter - cpBefore;
          query += `\nCP: ${cpBefore}->${cpAfter} (Δ=${delta})`;
        }
      }

      // Alternative: Get BestAlt from stockfish analysis (2nd variation)
      if (!gameReview && state.stockfishAnalysisResult?.lines && state.stockfishAnalysisResult.lines.length > 1) {
        const secondBestLine = state.stockfishAnalysisResult.lines[1];
        if (secondBestLine?.pv && secondBestLine.pv.length > 0) {
          // Extract first move from second best line
          const bestAltMove = secondBestLine.pv[0];
          query += `\nBestAlt: ${bestAltMove}`;
        }
      }

      return query;
    },
    [gameReview, state.stockfishAnalysisResult]
  );


  const buildChatQuery = useCallback(
    (
      currentInput: string,
      currentFen: string,
      sideToMove: string,
      gameInfo?: string,
      currentMove?: string,
      puzzleMode?: boolean,
      graderMode?: boolean,
      puzzleQuery?: string,
      playMode?: boolean
    ): string => {
      const apiSettings = JSON.parse(localStorage.getItem('api-settings') || '{}') as ApiSettings;
      const selectedLanguage = LANGUAGES.find(lang => lang.name === (apiSettings.language || 'English')) || LANGUAGES[0];
      let query = `<chess_coaching_request>

<user_query>
${currentInput}

Please Speak in: ${selectedLanguage.name}
</user_query>



<position_context>
Current FEN: ${currentFen}
Side to Move: ${sideToMove}
</position_context>`;

      if (puzzleMode === true) {
        query += `

<mode>
Type: Puzzle Mode
Instructions: 
- Act as an interactive chess puzzle coach
- Do not reveal the solution immediately
- Guide the user through the puzzle one step at a time
- If the user asks for a hint, provide a subtle clue about the best move or tactical idea
- If the user requests the solution directly, explain the correct sequence of moves and the reasoning behind them
- Encourage the user to consider candidate moves, threats, and tactical motifs in the position
- Always wait for the user's input before revealing the next step or answer, unless the user explicitly asks for the solution
</mode>`;
      } else if (playMode === true) {
        query += `

<mode>
Type: Play Mode
Instructions:
- The User is playing a game against AI, keep that in mind
- Act as a supportive chess coach during live gameplay
- Provide real-time strategic advice and tactical guidance
- Help identify threats and opportunities in the current position
- Suggest candidate moves and explain their benefits
- Focus on practical, actionable advice for the current game situation
- Be encouraging and supportive while providing accurate analysis
</mode>`;
      } else {
        query += `

<mode>
Type: Analysis Mode
</mode>`;
      }

      if (puzzleQuery) {
        query += `

<puzzle_information>
${puzzleQuery}
</puzzle_information>`;
      }

      if (gameInfo) {
        query += `

<game_history>
PGN:
${gameInfo}
</game_history>`;
      }

      if (currentMove) {
        query += `

<current_move>
${currentMove}
</current_move>`;
      }

      if (graderMode) {
        query += `Grade user's position evaluation, if position is not present, ask user to evaluate the current position so you can grade it`;
      }


      if (gameReview && gameReview.length > 0 && !graderMode) {
        const generateGameReviewSummary = (moves: MoveAnalysis[]): string => {
          const movesByQuality: Record<MoveQuality, MoveAnalysis[]> = {
            "Best": [], "Very Good": [], "Good": [], "Dubious": [],
            "Mistake": [], "Blunder": [], "Book": []
          };

          moves.forEach(move => {
            movesByQuality[move.quality].push(move);
          });

          const whiteMoves = moves.filter(move => move.player === 'w');
          const blackMoves = moves.filter(move => move.player === 'b');

          const formatMoveList = (moveList: MoveAnalysis[]): string => {
            return moveList
              .map(move => `Move ${Math.ceil(move.plyNumber / 2)}${move.player === 'w' ? '' : '...'} ${move.notation}`)
              .join(', ');
          };

          let summary = `Game Review Summary:\n\n`;

          if (whiteMoves.length > 0) {
            const whiteBlunders = whiteMoves.filter(m => m.quality === "Blunder");
            const whiteMistakes = whiteMoves.filter(m => m.quality === "Mistake");
            const whiteDubious = whiteMoves.filter(m => m.quality === "Dubious");

            summary += `White's Performance:
- Blunders: ${whiteBlunders.length}${whiteBlunders.length > 0 ? ` (${formatMoveList(whiteBlunders)})` : ''}
- Mistakes: ${whiteMistakes.length}${whiteMistakes.length > 0 ? ` (${formatMoveList(whiteMistakes)})` : ''}
- Dubious moves: ${whiteDubious.length}${whiteDubious.length > 0 ? ` (${formatMoveList(whiteDubious)})` : ''}\n\n`;
          }

          if (blackMoves.length > 0) {
            const blackBlunders = blackMoves.filter(m => m.quality === "Blunder");
            const blackMistakes = blackMoves.filter(m => m.quality === "Mistake");
            const blackDubious = blackMoves.filter(m => m.quality === "Dubious");

            summary += `Black's Performance:
- Blunders: ${blackBlunders.length}${blackBlunders.length > 0 ? ` (${formatMoveList(blackBlunders)})` : ''}
- Mistakes: ${blackMistakes.length}${blackMistakes.length > 0 ? ` (${formatMoveList(blackMistakes)})` : ''}
- Dubious moves: ${blackDubious.length}${blackDubious.length > 0 ? ` (${formatMoveList(blackDubious)})` : ''}\n\n`;
          }

          const criticalMoments = [
            ...movesByQuality["Blunder"],
            ...movesByQuality["Mistake"],
            ...movesByQuality["Dubious"]
          ].sort((a, b) => {
            const qualityOrder = { "Blunder": 0, "Mistake": 1, "Dubious": 2, "Best": 3, "Good": 4, "Very Good": 5, "Book": 6 };
            return qualityOrder[a.quality] - qualityOrder[b.quality];
          });

          if (criticalMoments.length > 0) {
            summary += `Key Moments to Review:\n`;
            criticalMoments.slice(0, 8).forEach((move, index) => {
              const moveNumber = Math.ceil(move.plyNumber / 2);
              const playerSymbol = move.player === 'w' ? '♔' : '♚';
              summary += `${index + 1}. ${playerSymbol} Move ${moveNumber}${move.player === 'w' ? '' : '...'} ${move.notation} - ${move.quality} Best Was ${move.sanNotation}\n`;
            });
          }

          return summary;
        };

        query += `

<game_review_analysis>
${generateGameReviewSummary(gameReview)}

Detailed Move Analysis:
${gameReview.map(move => {
          const moveNumber = Math.ceil(move.plyNumber / 2);
          const playerName = move.player === 'w' ? 'White' : 'Black';
          return `Move ${moveNumber}${move.player === 'w' ? '' : '...'} ${move.notation} (${playerName}) - Quality: ${move.quality} Best was ${move.sanNotation}`;
        }).join('\n')}
</game_review_analysis>`;
      }


      if (state.stockfishAnalysisResult) {
        const formattedEngineLines = state.stockfishAnalysisResult.lines
          .map((line, index) => {
            const evaluation = formatEvaluation(line);
            const moves = formatPrincipalVariation(line.pv, line.fen);
            let formattedLine = `  Line ${index + 1}: ${evaluation}
    Moves: ${moves}`;

            if (line.resultPercentages) {
              formattedLine += `
    Win Rate: ${line.resultPercentages.win}% | Draw: ${line.resultPercentages.draw}% | Loss: ${line.resultPercentages.loss}%`;
            }

            return formattedLine;
          })
          .join("\n\n");

        query += `

<engine_analysis>
Depth: ${engineDepth}
${formattedEngineLines}
</engine_analysis>`;
      }

      
        if (state.reverseStockfishAnalysisResult) {
          const formattedThreatLines = state.reverseStockfishAnalysisResult.lines
            .map((line, index) => {
              const evaluation = formatEvaluation(line);
              const moves = formatPrincipalVariation(line.pv, line.fen);
              let formattedLine = `  Threat ${index + 1}: ${evaluation}
    Moves: ${moves}`;

              if (line.resultPercentages) {
                formattedLine += `
    Win Rate: ${line.resultPercentages.win}% | Draw: ${line.resultPercentages.draw}% | Loss: ${line.resultPercentages.loss}%`;
              }

              return formattedLine;
            })
            .join("\n\n");

          query += `

<null_move_analysis>
Note: These are opponent threats if null move is applied played (null move analysis)
Usage Note: Use this to extract threats and opposition plans, and consider analysis from opposition
Depth: 12
${formattedThreatLines}
</null_move_analysis>`;
        }

      if (sanEvaluations) {
        query += addNetAnalysisToQuery(sanEvaluations);
      }

      if (state.openingData) {
        const openingSpeech = getOpeningStatSpeech(state.openingData);
        query += `

<opening_information>
${openingSpeech}
</opening_information>`;
      }


      if (chessdbdata) {
        const candidateMoves = getChessDBSpeech(chessdbdata);
        query += `

<database_analysis>
${candidateMoves}
</database_analysis>`;
      }


      query += `

</chess_coaching_request>`;

      return query;
    },
    [state.stockfishAnalysisResult, state.openingData, gameReview, chessdbdata, engineDepth, formatEvaluation, formatPrincipalVariation]
  );

  const getQuestionMode = () => localStorage.getItem("agine_question_mode") === "true";
  const getSelfEvalMode = () => localStorage.getItem("agine_selfEval_mode") === "true";
  const getGraderMode = () => localStorage.getItem("agine_grader_mode") === "true";

  const sendChatMessage = useCallback(
    async (
      gameInfo?: string,
      currentMove?: string,
      puzzleMode?: boolean,
      puzzleQuery?: string,
      playMode?: boolean,

    ): Promise<void> => {
      if (!chatInput.trim()) return;

      console.time("SEND_MESSAGE_TOTAL");

      const userMessage = createChatMessage("user", fen, chatInput);
      const currentInput = chatInput;

      setChatInput("");



      setChatMessages([...chatMessages, userMessage])
      setChatLoading(true)

      const currentFen = currentFenRef.current;

      try {
        const chessInstance = new Chess(currentFen);
        const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";
        const apiSettings = JSON.parse(localStorage.getItem('api-settings') || '{}') as ApiSettings;

        let query = '';


        let mode = getQuestionMode() ? "question" : (puzzleMode || puzzleQuery ? "puzzle" : "position");
        const grader = getGraderMode();
        if (grader) {
          mode = 'grader';
        }

        if (apiSettings.provider === "ollama" && apiSettings.model === "hf.co/NAKSTStudio/chess-gemma-commentary:F16") {
          query = buildCustomChatQuery(
            currentFen,
            sideToMove,
            apiSettings.language,
          )
          mode = "chess-gemma-commentary";
        } else {
          query = buildChatQuery(
            currentInput,
            currentFen,
            sideToMove,
            gameInfo,
            currentMove,
            puzzleMode,
            grader,
            puzzleQuery,
            playMode
          );
        }

        console.log(query);

        const result = await makeApiRequest(currentFen, query, mode);


        let assistantMessage = createChatMessage(
          "assistant",
          fen,
          result.message,
          result.maxTokens,
          result.provider,
          result.model,
          (Date.now() + 1).toString()
        );

        let newChatMessages = [...chatMessages, userMessage, assistantMessage];
        const selfevalMode = getSelfEvalMode();
       

        if (selfevalMode) {

          const selfEvalUserMessage = createChatMessage(
            "user",
            fen,
            "Go check for hallucinations."
          );
          newChatMessages = [...newChatMessages, selfEvalUserMessage];

          setChatMessages(newChatMessages);
          setChatLoading(true)

          const apiSettings = JSON.parse(localStorage.getItem('api-settings') || '{}') as ApiSettings;
          const selectedLanguage = LANGUAGES.find(lang => lang.name === (apiSettings.language || 'English')) || LANGUAGES[0];

          const evalQuery = `
        Please Speak in: ${selectedLanguage.name}  
        mode: 
        ${mode}
        \n\n
        ${assistantMessage.content}
        `
          const selfEvalResult = await makeApiRequest(currentFen, evalQuery, "selfeval");

          const correctedMessage = createChatMessage(
            "assistant",
            fen,
            selfEvalResult.message,
            selfEvalResult.maxTokens,
            selfEvalResult.provider,
            selfEvalResult.model,
            (Date.now() + 2).toString()
          );

          newChatMessages = [...newChatMessages, correctedMessage];


          setChatMessages(newChatMessages);
          setChatLoading(false)

          return;
        }

        setChatMessages(newChatMessages);
        setChatLoading(false)


      } catch (error) {
        console.error("Error sending chat message:", error);

        if (!(error instanceof Error && error.message === "Request cancelled")) {
          const errorMsg = error instanceof Error ? error.message : "An unknown error occurred";
          const errorMessage = createChatMessage("assistant", "", errorMsg);
          setChatMessages([...chatMessages, userMessage, errorMessage])
          setChatLoading(false);
        }
      }

      console.timeEnd("SEND_MESSAGE_TOTAL");
    },
    [chatInput, chatMessages, buildChatQuery, makeApiRequest, updateState]
  );


  const handleChatKeyPress = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    },
    [sendChatMessage]
  );


  // ==================== CLICK HANDLERS ====================
  const createAnalysisHandler = useCallback(
    (analysisType: string) => async (data: AnalysisData, customQuery?: string): Promise<void | AgentMessage> => {
      if (state.llmLoading || chatLoading) return;

      setChatLoading(true);
      updateState({ analysisTab: 1 });

      try {
        // Build query based on analysis type
        let query = "";
        let currentFen = currentFenRef.current;

        switch (analysisType) {
          case "engineLine":
            const engineData = data as EngineLineData;
            const formattedLine = formatLineForLLM(engineData.line, engineData.lineIndex);
            const chessInstance = new Chess(currentFen);
            const sideToMovew = chessInstance.turn() === "w" ? "White" : "Black";

            query = `<chess_analysis_request>

<analysis_type>Engine Line Analysis</analysis_type>

<position_context>
Current FEN: ${currentFen}
Side to Move: ${sideToMovew}
</position_context>

<engine_line>
${formattedLine}
</engine_line>

<analysis_instructions>
Please follow this structure in your analysis:
1. First, describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
3. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
4. Take account of 1, 2, 3 and provide the analysis for this engine line.

Be concise but thorough, and use clear chess language.
</analysis_instructions>`;
            break;

          case "openingMove":
            const move = data as Moves;
            const totalGames = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
            const whiteWinRate = ((move.white / totalGames) * 100 || 0).toFixed(1);
            const drawRate = ((move.draws / totalGames) * 100 || 0).toFixed(1);
            const blackWinRate = ((move.black / totalGames) * 100 || 0).toFixed(1);
            const chessMoveInstance = new Chess(currentFen);
            const moveSideToMove = chessMoveInstance.turn() === "w" ? "White" : "Black";

            query = `<chess_analysis_request>

<analysis_type>Opening Move Analysis</analysis_type>

<position_context>
Current FEN: ${currentFen}
Opening: ${state.openingData?.opening?.name || "Unknown"} (${state.openingData?.opening?.eco || "N/A"})
Side to Move: ${moveSideToMove}
</position_context>

<move_information>
Move: ${move.san}
Games played: ${totalGames}
Average rating: ${move.averageRating}
White wins: ${whiteWinRate}%
Draws: ${drawRate}%
Black wins: ${blackWinRate}%
</move_information>

<analysis_instructions>
Please follow this structure in your analysis:
1. First, describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
3. Then, understand the opening stats, the win, draw, loss rates and amount of games that were played by masters.
4. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
5. Take account of 1, 2, 3, 4 and provide the analysis for this move.

Be concise but thorough, and use clear chess language.
</analysis_instructions>`;
            break;

          case "candidateMove":
            const candidateMove = data as CandidateMove;
            const candidateChessInstance = new Chess(currentFen);
            const candidateSideToMove = candidateChessInstance.turn() === "w" ? "White" : "Black";

            query = `<chess_analysis_request>

<analysis_type>Candidate Move Analysis</analysis_type>

<position_context>
Current FEN: ${currentFen}
Side to Move: ${candidateSideToMove}
</position_context>

<move_information>
Move: ${candidateMove.san} (${candidateMove.uci})
ChessDb Score: ${candidateMove.score}
ChessDb Winrate: ${candidateMove.winrate}
</move_information>

<analysis_instructions>
Please follow this structure in your analysis:
1. First, understand and describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
3. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
4. Take account of 1, 2, 3 and provide analysis of the candidate move and how it impacts the position.

Be concise but thorough, and use clear chess language.
</analysis_instructions>`;
            break;

          case "moveCoach":
            const coachReview = data as MoveAnalysis;
            const coachPastFen = coachReview.fen;
            const coachSideToMove = coachReview.player === "w" ? "White" : "Black";
            const coachMoveNumber = Math.floor(coachReview.plyNumber / 2) + 1;
            const coachIsWhiteMove = coachReview.plyNumber % 2 === 0;
            const coachMoveNotation = coachIsWhiteMove ? `${coachMoveNumber}.` : `${coachMoveNumber}...`;

            query = `<chess_analysis_request>

<analysis_type>Move Coach Analysis</analysis_type>

<position_context>
Position FEN: ${coachPastFen}
Side: ${coachSideToMove}
</position_context>

<move_information>
Move: ${coachMoveNotation} ${coachReview.notation}
Classification: ${coachReview.quality}
Player: ${coachSideToMove}
Ply Number: ${coachReview.plyNumber}
</move_information>

<analysis_instructions>
As a chess buddy, please follow this structure in your analysis:
1. First, understand and describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
3. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
4. Take account of 1, 2, 3 and explain why this move is classified as a ${coachReview.quality} move.

Be concise but thorough, and use clear chess language.
</analysis_instructions>`;
            currentFen = coachPastFen;
            break;

          case "annotation":
            const review = data as MoveAnalysis;
            const pastFen = review.fen;
            const sideToMove = review.player === "w" ? "White" : "Black";
            const moveNumber = Math.floor(review.plyNumber / 2) + 1;
            const isWhiteMove = review.plyNumber % 2 === 0;
            const moveNotation = isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`;

            if (analysisType === "annotation") {
              query = `<chess_annotation_request>

<analysis_type>Move Annotation</analysis_type>

<position_context>
Position FEN: ${pastFen}
Current FEN: ${currentFen}
Side: ${sideToMove}
</position_context>

<move_information>
Move: ${review.notation}
Classification: ${review.quality}
Move Number: ${moveNotation}
</move_information>

<annotation_instructions>
Please provide annotation about this move:
1. Talk about how/why the move is ${review.quality} based on the NEXT ply engine analysis
2. Talk about candidates in this position using the CURRENT ply engine analysis
3. How the move can impact the game
4. Keep the response in paragraph format

Start the response with "Agine Annotation:"
</annotation_instructions>`;
            } else {
              query = `<chess_analysis_request>

<analysis_type>Move Coach Analysis</analysis_type>

<position_context>
Position FEN: ${pastFen}
Side: ${sideToMove}
</position_context>

<move_information>
Move: ${moveNotation} ${review.notation}
Classification: ${review.quality}
Player: ${sideToMove}
</move_information>

<analysis_instructions>
Please follow this structure in your analysis:
1. First, understand and describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
3. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
4. Take account of 1, 2, 3 and explain why this move is classified as a ${review.quality} move.

Be concise but thorough, and use clear chess language.
</analysis_instructions>`;
            }
            currentFen = pastFen;
            break;
        }

        // Add contextual information
        if (state.openingData) {
          const openingSpeech = getOpeningStatSpeech(state.openingData);
          query += `

<opening_information>
${openingSpeech}
</opening_information>`;
        }

        if (chessdbdata) {
          const candidateMoves = getChessDBSpeech(chessdbdata);
          query += `

<database_analysis>
${candidateMoves}
</database_analysis>`;
        }

        // Add engine analysis if needed
        if (state.stockfishAnalysisResult || engine) {
          let engineResult = state.stockfishAnalysisResult;
          if (!engineResult && engine) {
            engineResult = await engine.evaluatePositionWithUpdate({
              fen: currentFen,
              depth: engineDepth,
              multiPv: engineLines,
              setPartialEval: () => { },
            });
          }

          if (engineResult) {
            const formattedEngineLines = engineResult.lines
              .map((line, index) => {
                const evaluation = formatEvaluation(line);
                const moves = formatPrincipalVariation(line.pv, line.fen);
                let formattedLine = `  Line ${index + 1}: ${evaluation}
    Moves: ${moves}`;

                if (line.resultPercentages) {
                  formattedLine += `
    Win Rate: ${line.resultPercentages.win}% | Draw: ${line.resultPercentages.draw}% | Loss: ${line.resultPercentages.loss}%`;
                }

                return formattedLine;
              })
              .join("\n\n");

            query += `

<engine_analysis>
Depth: ${engineDepth}
${formattedEngineLines}
</engine_analysis>`;
          }
        }

        if (state.reverseStockfishAnalysisResult) {
          const formattedThreatLines = state.reverseStockfishAnalysisResult.lines
            .map((line, index) => {
              const evaluation = formatEvaluation(line);
              const moves = formatPrincipalVariation(line.pv, line.fen);
              let formattedLine = `  Threat ${index + 1}: ${evaluation}
    Moves: ${moves}`;

              if (line.resultPercentages) {
                formattedLine += `
    Win Rate: ${line.resultPercentages.win}% | Draw: ${line.resultPercentages.draw}% | Loss: ${line.resultPercentages.loss}%`;
              }

              return formattedLine;
            })
            .join("\n\n");

          query += `

<null_move_analysis>
Note: These are opponent threats if top moves are not played (null move analysis)
Depth: ${engineDepth}
${formattedThreatLines}
</null_move_analysis>`;
        }

        if (customQuery) {
          query += `

<additional_considerations>
${customQuery}
</additional_considerations>`;
        }


        query += `
</chess_analysis_request>`;

        if (analysisType === "annotation") {
          query = query.replace("</chess_analysis_request>", "</chess_annotation_request>");
        }
        // Determine message content based on analysis type
        let messageContent = "";
        switch (analysisType) {
          case "engineLine":
            const engineLineData = data as EngineLineData;
            messageContent = `Analyze engine line: ${formatLineForLLM(engineLineData.line, engineLineData.lineIndex)}`;
            break;
          case "openingMove":
            const openingMove = data as Moves;
            messageContent = `Analyze opening move: ${openingMove.san}`;
            break;
          case "candidateMove":
            const candidateMoveData = data as CandidateMove;
            messageContent = `Analyze move: ${candidateMoveData.san}`;
            break;
          case "moveCoach":
            const coachMove = data as MoveAnalysis
            messageContent = `Agine, analyze move: ${coachMove.sanNotation}`
          case "annotation":
            const reviewData = data as MoveAnalysis;
            const moveNotationDisplay = reviewData.plyNumber % 2 === 0 ?
              `${Math.floor(reviewData.plyNumber / 2) + 1}.` :
              `${Math.floor(reviewData.plyNumber / 2) + 1}...`;
            messageContent = analysisType === "annotation"
              ? `Agine, annotate this move: ${reviewData.notation} (${reviewData.quality})`
              : `Agine, analyze move: ${moveNotationDisplay} ${reviewData.notation} (${reviewData.quality}) for ${reviewData.player === "w" ? "White" : "Black"}`;
            break;
        }

        const userMessage = createChatMessage("user", fen, messageContent);
        const result = await makeApiRequest(currentFen, query, analysisType === "annotation" ? "annotation" : "position");
        const assistantMessage = createChatMessage("assistant", fen, result.message, result.maxTokens, result.provider, result.model, (Date.now() + 1).toString());


        if (analysisType === "moveCoach") {
          const chathistory: ChatMessage[] = chatMessages;
          chathistory.push(userMessage);
          chathistory.push(assistantMessage);
          setChatMessages(chathistory)
        }

        setChatMessages([...chatMessages, userMessage, assistantMessage])
        setChatLoading(false);

        return analysisType === "annotation" ? result : undefined;
      } catch (error) {
        console.error(`Error in ${analysisType} analysis:`, error);
        if (!(error instanceof Error && error.message === "Request cancelled")) {
          const errorMessage = createChatMessage(
            "assistant",
            "",
            `Sorry, there was an error analyzing the ${analysisType}. Please try again.`,
            undefined,
            undefined,
            undefined,
            (Date.now() + 1).toString()
          );

          setChatMessages([...chatMessages, errorMessage]);
          setChatLoading(false)
        }

      }
    },
    [
      fen,
      state.llmLoading,
      chatLoading,
      chatMessages,
      state.openingData,
      state.stockfishAnalysisResult,
      chessdbdata,
      engine,
      engineDepth,
      engineLines,
      formatLineForLLM,
      formatEvaluation,
      formatPrincipalVariation,
      makeApiRequest,
      updateState
    ]
  );

  // Specific handlers using the generic analysis handler
  const handleEngineLineClick = useCallback(
    (line: LineEval, lineIndex: number) =>
      createAnalysisHandler("engineLine")({ line, lineIndex } as EngineLineData),
    [createAnalysisHandler]
  );

  const handleOpeningMoveClick = useCallback(
    (move: Moves) => createAnalysisHandler("openingMove")(move),
    [createAnalysisHandler]
  );

  const handleMoveClick = useCallback(
    (move: CandidateMove) => createAnalysisHandler("candidateMove")(move),
    [createAnalysisHandler]
  );

  const handleMoveCoachClick = useCallback(
    (review: MoveAnalysis) => createAnalysisHandler("moveCoach")(review),
    [createAnalysisHandler]
  );


 
  const handleMoveAnnontateClick = useCallback(
    async (review: MoveAnalysis, customQuery?: string): Promise<void> => {
      return createAnalysisHandler("annotation")(review, customQuery) as Promise<void>;
    },
    [createAnalysisHandler]
  );

  const handleMovePGNAnnotateClick = useCallback(
    async (review: MoveAnalysis, customQuery?: string): Promise<AgentMessage | null> => {
      return createAnalysisHandler("annotation")(review, customQuery) as Promise<AgentMessage | null>;
    },
    [createAnalysisHandler]
  );

  const handleGameReviewSummaryClick = useCallback(
    async (review: MoveAnalysis[], gameInfo: string): Promise<void> => {
      if (chatLoading) return;

      const findMovesByQuality = (quality: MoveQuality, player: "w" | "b") => {
        return review.filter(move => move.quality === quality && move.player === player);
      };

      const keyMoves: MoveAnalysis[] = [];


      ["Blunder", "Mistake", "Dubious"].forEach(quality => {
        const whiteMove = findMovesByQuality(quality as MoveQuality, "w")[0];
        const blackMove = findMovesByQuality(quality as MoveQuality, "b")[0];
        if (whiteMove) keyMoves.push(whiteMove);
        if (blackMove) keyMoves.push(blackMove);
      });

      keyMoves.sort((a, b) => a.plyNumber - b.plyNumber);

      updateState({ analysisTab: 1 });

      const summaryMessage = createChatMessage(
        "user",
        fen,
        `Starting game review analysis for ${keyMoves.length} key moves from: ${gameInfo}`
      );
      const chathistory: ChatMessage[] = chatMessages;
      chathistory.push(summaryMessage);
      setChatMessages(chathistory)


      for (let i = 0; i < keyMoves.length; i++) {
        const move = keyMoves[i];

        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        try {
          await handleMoveCoachClick(move);
        } catch (error) {
          console.error(`Error analyzing move ${i + 1}:`, error);
        }
      }

      const finalMessage = createChatMessage(
        "assistant",
        "",
        `Game review complete! Analyzed ${keyMoves.length} key moves. The analysis above covers the most important moments in your game, focusing on critical mistakes and excellent moves. Review each analysis to understand the key concepts and improve your play.`,
        undefined,
        undefined,
        undefined,
        (Date.now() + keyMoves.length + 1).toString()
      );


      setChatMessages([...chatMessages, finalMessage])
      setChatLoading(false);
    },
    [chatLoading, chatMessages, handleMoveCoachClick, updateState]
  );


  useEffect(() => {
  if (!engine || !fen) return;

  // Clear previous results
  updateState({
    stockfishAnalysisResult: null,
    reverseStockfishAnalysisResult: null,
    llmAnalysisResult: null,
    openingData: null,
  });

  // Cancel any pending API requests
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  // Auto-analyze with delay to avoid rapid fire requests
  const timeoutId = setTimeout(() => {
    if (currentFenRef.current === fen) {
      analyzeWithStockfish();
      fetchOpeningData();
      fetchLichessOpeningData();
    }
  }, ANALYSIS_DELAY);

  return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fen, engine, engineDepth, engineLines]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);


  return {
    // Analysis Results
    llmAnalysisResult: state.llmAnalysisResult,
    setLlmAnalysisResult: (result: string | null) => updateState({ llmAnalysisResult: result }),
    stockfishAnalysisResult: state.stockfishAnalysisResult,
    stockfishDone,
    stockfishFen,
    setStockfishAnalysisResult: (result: PositionEval | null) => updateState({ stockfishAnalysisResult: result }),
    openingData: state.openingData,
    setOpeningData: (data: MasterGames | null) => updateState({ openingData: data }),
    chessdbdata,
    loading,
    error,
    queueing,
    refetch,
    requestAnalysis,
    sanEvaluations,
    evaluations,
    isNetLoading,
    evaluationsFen,

    // themes
    scores,
    themeScoreLoading,
    themeScoreError,

    // Loading States
    llmLoading: state.llmLoading,
    setLlmLoading: (loading: boolean) => updateState({ llmLoading: loading }),
    stockfishLoading: state.stockfishLoading,
    setStockfishLoading: (loading: boolean) => updateState({ stockfishLoading: loading }),
    openingLoading: state.openingLoading,
    setOpeningLoading: (loading: boolean) => updateState({ openingLoading: loading }),
    lichessOpeningData: state.lichessOpeningData,
    lichessOpeningLoading: state.lichessOpeningLoading,
    setLichessOpeningLoading: (loading: boolean) => updateState({ lichessOpeningLoading: loading }),

    // UI State
    moveSquares: state.moveSquares,
    setMoveSquares: (squares: { [square: string]: string }) => updateState({ moveSquares: squares }),
    analysisTab: state.analysisTab,
    setAnalysisTab: (tab: number) => updateState({ analysisTab: tab }),


    // Engine Settings
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    engine,

    // Game Review
    gameReview,
    setGameReview,
    gameReviewLoading,
    gameReviewProgress,
    setGameReviewLoading,
    generateGameReview,
    rootCurrentMove,
    setRootCurrentMove,

    // Functions
    fetchOpeningData,
    fetchLichessOpeningData,
    analyzeWithStockfish,
    sendChatMessage,
    abortChatMessage,
    handleChatKeyPress,
    handleEngineLineClick,
    handleOpeningMoveClick,
    handleMoveClick,
    handleMoveCoachClick,
    handleMoveAnnontateClick,
    handleGameReviewSummaryClick,
    handleMovePGNAnnotateClick,

    // Utility Functions
    formatEvaluation,
    formatPrincipalVariation,
    formatLineForLLM,
  }
}