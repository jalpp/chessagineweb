import { TacticlBoard } from "../themes/tacticalBoard";
import {
  BoardState,
  KingSafety,
  MaterialInfo,
  PieceMobility,
  PositionalPawn,
  SideAttackerDefenders,
  SidePiecePlacement,
  SideSquareControl,
  SpaceControl,
} from "../types";

export class PositionPrompter {
  private state: BoardState;
  private sections: string[];
  private tactical: TacticlBoard;

  constructor(state: BoardState) {
    this.state = state;
    this.tactical = new TacticlBoard(state.fen);
    this.sections = [];
  }

  public generatePrompt(): string {
    if (!this.state) {
      return "<board_state>Invalid FEN provided</board_state>";
    }

    this.sections = [];
    this.sections.push("<detailed_board_analysis>");

    this.addGameStatus();
    this.addMaterialAnalysis();
    this.addPiecePositions();
    this.addKingSafetyAnalysis();
    this.addCastlingRights();
    this.addPieceMobility();
    this.addSpaceControl();
    this.addSquareColorControl();
    this.addPawnStructureAnalysis();
    this.addTacticalAnalysis();
    this.addAttackDefenseDetails();

    this.sections.push("</detailed_board_analysis>");

    return this.sections.join("\n");
  }

  private addGameStatus(): void {
    this.sections.push("<game_status>");
    this.sections.push(`FEN: ${this.state.fen}`);
    this.sections.push(`Move Number: ${this.state.moveNumber}`);
    this.sections.push(
      `Active Player: ${
        this.state.sidetomove === "white" ? "White to move" : "Black to move"
      }`
    );
    this.sections.push(`Game Phase: ${this.state.gamePhase.toUpperCase()}`);

    if (this.state.isCheckmate) {
      this.sections.push("Game Status: CHECKMATE - Game is over");
    } else if (this.state.isStalemate) {
      this.sections.push("Game Status: STALEMATE - Game is drawn");
    } else if (this.state.isGameOver) {
      this.sections.push("Game Status: GAME OVER - No legal moves available");
    } else {
      this.sections.push("Game Status: ACTIVE GAME - Normal play continues");
    }

    this.sections.push(
      `Total Legal Moves Available: ${this.state.legalMoves.length}`
    );
    if (
      this.state.legalMoves.length > 0 &&
      this.state.legalMoves.length <= 15
    ) {
      this.sections.push(
        `All Legal Moves: ${this.state.legalMoves.join(", ")}`
      );
    } else if (this.state.legalMoves.length > 15) {
      this.sections.push(
        `Sample Legal Moves: ${this.state.legalMoves
          .slice(0, 15)
          .join(", ")}... (${this.state.legalMoves.length - 15} more)`
      );
    }
    this.sections.push("</game_status>");
  }

  private addMaterialAnalysis(): void {
    this.sections.push("\n<material_analysis>");
    const materialDiff =
      this.state.white.materialScore.materialvalue -
      this.state.black.materialScore.materialvalue;

    this.addPlayerMaterial("WHITE", this.state.white.materialScore);
    this.addPlayerMaterial("BLACK", this.state.black.materialScore);

    this.sections.push("\nMATERIAL BALANCE:");
    if (materialDiff > 0) {
      this.sections.push(
        `  White has a material advantage of +${materialDiff} points`
      );
      this.addMaterialAdvantageDescription(materialDiff);
    } else if (materialDiff < 0) {
      const absMatDiff = Math.abs(materialDiff);
      this.sections.push(
        `  Black has a material advantage of +${absMatDiff} points`
      );
      this.addMaterialAdvantageDescription(absMatDiff);
    } else {
      this.sections.push(
        `  Material is EQUAL - both sides have ${this.state.white.materialScore.materialvalue} points`
      );
    }
    this.sections.push("</material_analysis>");
  }

  private addPlayerMaterial(color: string, materialScore: MaterialInfo): void {
    this.sections.push(`${color} PIECES:`);
    this.sections.push(
      `  Total Material Value: ${materialScore.materialvalue} points`
    );
    this.sections.push(
      `  Queens: ${materialScore.piececount.queens} (${
        materialScore.piececount.queens * 9
      } points)`
    );
    this.sections.push(
      `  Rooks: ${materialScore.piececount.rooks} (${
        materialScore.piececount.rooks * 5
      } points)`
    );
    this.sections.push(
      `  Bishops: ${materialScore.piececount.bishops} (${
        materialScore.piececount.bishops * 3
      } points)`
    );
    this.sections.push(
      `  Knights: ${materialScore.piececount.knights} (${
        materialScore.piececount.knights * 3
      } points)`
    );
    this.sections.push(
      `  Pawns: ${materialScore.piececount.pawns} (${
        materialScore.piececount.pawns * 1
      } points)`
    );
    this.sections.push(
      `  Bishop Pair Bonus: ${
        materialScore.bishoppair ? "YES (+0.5 points strategic value)" : "NO"
      }`
    );
    if (color === "WHITE") this.sections.push(""); // Add spacing between white and black
  }

  private addMaterialAdvantageDescription(advantage: number): void {
    if (advantage >= 9) {
      this.sections.push(
        `  This is equivalent to approximately a QUEEN advantage`
      );
    } else if (advantage >= 5) {
      this.sections.push(
        `  This is equivalent to approximately a ROOK advantage`
      );
    } else if (advantage >= 3) {
      this.sections.push(
        `  This is equivalent to approximately a MINOR PIECE advantage`
      );
    } else if (advantage >= 1) {
      this.sections.push(
        `  This is equivalent to approximately a PAWN advantage`
      );
    }
  }

  private addPiecePositions(): void {
    this.sections.push("\n<piece_positions>");
    this.addPlayerPiecePositions("WHITE", this.state.white.pieceplacementScore);
    this.addPlayerPiecePositions("BLACK", this.state.black.pieceplacementScore);
    this.sections.push("</piece_positions>");
  }

  private addPlayerPiecePositions(color: string, placement: SidePiecePlacement): void {
    this.sections.push(`${color} PIECE LOCATIONS:`);
    this.sections.push(`  King: ${placement.kingplacement[0] || "MISSING"}`);
    this.sections.push(
      `  Queens: ${
        placement.queenplacement.length > 0
          ? placement.queenplacement.join(", ")
          : "None"
      }`
    );
    this.sections.push(
      `  Rooks: ${
        placement.rookplacement.length > 0
          ? placement.rookplacement.join(", ")
          : "None"
      }`
    );
    this.sections.push(
      `  Bishops: ${
        placement.bishopplacement.length > 0
          ? placement.bishopplacement.join(", ")
          : "None"
      }`
    );
    this.sections.push(
      `  Knights: ${
        placement.knightplacement.length > 0
          ? placement.knightplacement.join(", ")
          : "None"
      }`
    );
    this.sections.push(
      `  Pawns: ${
        placement.pawnplacement.length > 0
          ? placement.pawnplacement.join(", ")
          : "None"
      }`
    );
    if (color === "WHITE") this.sections.push(""); // Add spacing
  }

  private addKingSafetyAnalysis(): void {
    this.sections.push("\n<king_safety_analysis>");
    this.addPlayerKingSafety("WHITE", this.state.white.kingSafetyScore);
    this.addPlayerKingSafety("BLACK", this.state.black.kingSafetyScore);
    this.sections.push("</king_safety_analysis>");
  }

  private addPlayerKingSafety(color: string, kingSafety: KingSafety): void {
    this.sections.push(`${color} KING SAFETY:`);
    this.sections.push(`  King Position: ${kingSafety.kingsquare}`);
    this.sections.push(
      `  Enemy Attackers on King: ${kingSafety.attackerscount} pieces attacking the king`
    );
    this.sections.push(
      `  Friendly Defenders of King: ${kingSafety.defenderscount} (higher = better) pieces defending the king`
    );
    this.sections.push(
      `  Pawn Shield Strength: ${kingSafety.pawnshield} (higher is better protection)`
    );
    if(color === "WHITE"){
      this.sections.push(
      `  King Safety Advantage: ${kingSafety.kingsafetysadvantage} (higher is safer, negative means danger)`
    );
    }else{
      this.sections.push(
      `  King Safety Advantage: ${kingSafety.kingsafetysadvantage} (higher is danger, negative means safer)`
    );
    }
    this.sections.push(
      `  Castling Status: ${
        kingSafety.hascastled
          ? "King HAS castled (safer)"
          : "King has NOT castled"
      }`
    );
    this.sections.push(
      `  Castling Rights: ${
        kingSafety.cancastle ? "Can still castle" : "Cannot castle anymore"
      }`
    );

    if (color === "WHITE") this.sections.push(""); // Add spacing
  }


  private addCastlingRights(): void {
    this.sections.push("\n<castling_rights>");
    this.sections.push("WHITE CASTLING:");
    this.sections.push(
      `  Kingside (O-O): ${
        this.state.white.castlingScore.kingside ? "AVAILABLE" : "NOT AVAILABLE"
      }`
    );
    this.sections.push(
      `  Queenside (O-O-O): ${
        this.state.white.castlingScore.queenside ? "AVAILABLE" : "NOT AVAILABLE"
      }`
    );

    this.sections.push("\nBLACK CASTLING:");
    this.sections.push(
      `  Kingside (O-O): ${
        this.state.black.castlingScore.kingside ? "AVAILABLE" : "NOT AVAILABLE"
      }`
    );
    this.sections.push(
      `  Queenside (O-O-O): ${
        this.state.black.castlingScore.queenside ? "AVAILABLE" : "NOT AVAILABLE"
      }`
    );
    this.sections.push("</castling_rights>");
  }

  private addPieceMobility(): void {
    this.sections.push("\n<piece_mobility>");
    this.addPlayerMobility("WHITE", this.state.white.pieceMobilityScore);
    this.addPlayerMobility("BLACK", this.state.black.pieceMobilityScore);

    const mobilityDiff =
      this.state.white.pieceMobilityScore.totalmobility -
      this.state.black.pieceMobilityScore.totalmobility;
    if (mobilityDiff > 5) {
      this.sections.push(
        `\nMOBILITY ADVANTAGE: White has ${mobilityDiff} more squares of mobility (significantly more active pieces)`
      );
    } else if (mobilityDiff < -5) {
      this.sections.push(
        `\nMOBILITY ADVANTAGE: Black has ${Math.abs(
          mobilityDiff
        )} more squares of mobility (significantly more active pieces)`
      );
    } else if (mobilityDiff !== 0) {
      this.sections.push(
        `\nMOBILITY: ${mobilityDiff > 0 ? 'White' : 'Black'} has a slight mobility advantage (${Math.abs(mobilityDiff)} squares)`
      );
    } else {
      this.sections.push(
        `\nMOBILITY: Both sides have equal piece mobility (${this.state.white.pieceMobilityScore.totalmobility} squares each)`
      );
    }
    this.sections.push("</piece_mobility>");
  }

  private addPlayerMobility(color: string, mobility: PieceMobility): void {
    this.sections.push(
      `${color} PIECE MOBILITY (number of squares each piece type can move to):`
    );
    this.sections.push(`  Queen Mobility: ${mobility.queenmobility} squares`);
    this.sections.push(`  Rook Mobility: ${mobility.rookmobility} squares`);
    this.sections.push(`  Bishop Mobility: ${mobility.bishopmobility} squares`);
    this.sections.push(`  Knight Mobility: ${mobility.knightmobility} squares`);
    this.sections.push(
      `  Total Mobility Score: ${mobility.totalmobility} squares (higher = more active pieces)`
    );
    if (color === "WHITE") this.sections.push("");
  }

  private addSpaceControl(): void {
    this.sections.push("\n<space_control>");
    this.addPlayerSpaceControl("WHITE", this.state.white.spaceScore);
    this.addPlayerSpaceControl("BLACK", this.state.black.spaceScore);

    const centerControlDiff =
      this.state.white.spaceScore.centerspacecontrolscore -
      this.state.black.spaceScore.centerspacecontrolscore;
    const totalSpaceDiff =
      this.state.white.spaceScore.totalspacecontrolscore -
      this.state.black.spaceScore.totalspacecontrolscore;

    if (centerControlDiff > 3) {
      this.sections.push(
        `\nCENTER CONTROL: White dominates the center (+${centerControlDiff} advantage)`
      );
    } else if (centerControlDiff < -3) {
      this.sections.push(
        `\nCENTER CONTROL: Black dominates the center (+${Math.abs(
          centerControlDiff
        )} advantage)`
      );
    } else if (centerControlDiff !== 0) {
      this.sections.push(
        `\nCENTER CONTROL: ${centerControlDiff > 0 ? 'White' : 'Black'} has slight center advantage (+${Math.abs(centerControlDiff)})`
      );
    } else {
      this.sections.push(
        `\nCENTER CONTROL: Both sides have equal center control`
      );
    }

    if (totalSpaceDiff > 5) {
      this.sections.push(
        `OVERALL SPACE: White has significantly more space (+${totalSpaceDiff} total advantage)`
      );
    } else if (totalSpaceDiff < -5) {
      this.sections.push(
        `OVERALL SPACE: Black has significantly more space (+${Math.abs(
          totalSpaceDiff
        )} total advantage)`
      );
    } else if (totalSpaceDiff !== 0) {
      this.sections.push(
        `OVERALL SPACE: ${totalSpaceDiff > 0 ? 'White' : 'Black'} has slight space advantage (+${Math.abs(totalSpaceDiff)})`
      );
    } else {
      this.sections.push(`OVERALL SPACE: Both sides control equal space`);
    }
    this.sections.push("</space_control>");
  }

  private addPlayerSpaceControl(color: string, spaceScore: SpaceControl): void {
    this.sections.push(`${color} SPACE CONTROL:`);
    this.sections.push(
      `  Center Control Score: ${spaceScore.centerspacecontrolscore} (attacks on central squares d4,d5,e4,e5,c4,c5,f4,f5)`
    );
    this.sections.push(
      `  Flank Control Score: ${spaceScore.flankspacecontrolscore} (attacks on flank squares a4,a5,b4,b5,g4,g5,h4,h5)`
    );
    this.sections.push(
      `  Total Space Control: ${spaceScore.totalspacecontrolscore} (higher is better)`
    );
    if (color === "WHITE") this.sections.push(""); // Add spacing
  }

  private addSquareColorControl(): void {
    this.sections.push("\n<square_color_control>");
    this.addPlayerSquareControl("WHITE", this.state.white.squareControlScore);
    this.addPlayerSquareControl("BLACK", this.state.black.squareControlScore);
    this.sections.push("</square_color_control>");
  }

  private addPlayerSquareControl(
    color: string,
    squareControl: SideSquareControl
  ): void {
    this.sections.push(`${color} SQUARE COLOR INFLUENCE:`);
    this.sections.push(
      `  Light Squares Controlled: ${squareControl.lightSquareControl} pieces on light squares`
    );
    this.sections.push(
      `  Dark Squares Controlled: ${squareControl.darkSqaureControl} pieces on dark squares`
    );
    this.sections.push(
      `  Light Square Pieces: ${
        squareControl.lightSquares.join(", ") || "None"
      }`
    );
    this.sections.push(
      `  Dark Square Pieces: ${squareControl.darkSquares.join(", ") || "None"}`
    );
    if (color === "WHITE") this.sections.push(""); // Add spacing
  }

  private addPawnStructureAnalysis(): void {
    this.sections.push("\n<pawn_structure_analysis>");
    this.addPlayerPawnStructure("WHITE", this.state.white.positionalScore);
    this.addPlayerPawnStructure("BLACK", this.state.black.positionalScore);

    this.sections.push("</pawn_structure_analysis>");
  }

  private addPlayerPawnStructure(
    color: string,
    positional: PositionalPawn
  ): void {
    this.sections.push(`${color} PAWN STRUCTURE:`);
    this.sections.push(
      `  Doubled Pawns: ${positional.doublepawncount} (weakness - pawns on same file)`
    );
    this.sections.push(
      `  Isolated Pawns: ${positional.isolatedpawncount} (weakness - no friendly pawns on adjacent files)`
    );
    this.sections.push(
      `  Backward Pawns: ${positional.backwardpawncount} (weakness - pawns that cannot advance safely)`
    );
    this.sections.push(
      `  Passed Pawns: ${positional.passedpawncount} (strength - no enemy pawns blocking path to promotion)`
    );
    if(color === "WHITE"){
      this.sections.push(
      `  Pawn Structure Advantage Score: ${positional.positionalAdvatange} (higher is better - negative is worse pawn structure)`
    );
    }else {
      this.sections.push(
      `  Pawn Structure Advantage Score: ${positional.positionalAdvatange} (negative is better - positive is worse pawn strucutre)`
    );
    }
    if (color === "WHITE") this.sections.push(""); // Add spacing
  }

  private addTacticalAnalysis(): void {
    this.sections.push("\n<tactical_analysis>");
    
    // Get the full tactical summary
    const tacticalSummary = this.tactical.toString();
    
    // Split into lines and add each line to sections
    const lines = tacticalSummary.split('\n');
    for (const line of lines) {
      this.sections.push(line);
    }
    
    this.sections.push("</tactical_analysis>");
  }

  private addAttackDefenseDetails(): void {
    this.sections.push("\n<attack_defense_details>");
    this.addPlayerAttackDefense(
      "WHITE",
      this.state.whitepieceattackerdefenderinfo
    );
    this.addPlayerAttackDefense(
      "BLACK",
      this.state.blackpieceattackerdefenderinfo
    );
    this.sections.push("</attack_defense_details>");
  }

  private addPlayerAttackDefense(
    color: string,
    attackDefenseInfo: SideAttackerDefenders
  ): void {
    this.sections.push(`${color} PIECE ATTACK/DEFENSE STATUS:`);
    this.sections.push(
      `  Pawns: ${attackDefenseInfo.pawnInfo.attackerscount} attackers, ${attackDefenseInfo.pawnInfo.defenderscount} defenders`
    );
    this.sections.push(
      `  Knights: ${attackDefenseInfo.knightInfo.attackerscount} attackers, ${attackDefenseInfo.knightInfo.defenderscount} defenders`
    );
    this.sections.push(
      `  Bishops: ${attackDefenseInfo.bishopInfo.attackerscount} attackers, ${attackDefenseInfo.bishopInfo.defenderscount} defenders`
    );
    this.sections.push(
      `  Rooks: ${attackDefenseInfo.rookInfo.attackerscount} attackers, ${attackDefenseInfo.rookInfo.defenderscount} defenders`
    );
    this.sections.push(
      `  Queens: ${attackDefenseInfo.queenInfo.attackerscount} attackers, ${attackDefenseInfo.queenInfo.defenderscount} defenders`
    );
    if (color === "WHITE") this.sections.push("");
  }
}