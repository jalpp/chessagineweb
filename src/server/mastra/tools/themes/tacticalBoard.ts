import {
  BISHOP,
  Chess,
  Color,
  KING,
  KNIGHT,
  PAWN,
  Piece,
  PieceSymbol,
  QUEEN,
  ROOK,
  Square,
} from "chess.js";

enum PieceType {
  Pawn = "P",
  Knight = "N",
  Bishop = "B",
  Rook = "R",
  Queen = "Q",
  King = "K",
  None = "",
}

enum PieceColour {
  White = "W",
  Black = "B",
}

interface Pin {
  pinnedPiece: string;
  pinnedSquare: string;
  pinningPiece: string;
  pinningSquare: string;
  targetPiece: string;
  targetSquare: string;
  isAbsolute: boolean;
}

export class TacticlBoard {
  private board: string[][] = Array.from({ length: 8 }, () =>
    Array(8).fill("")
  );
  private fen: string = "";
  private squaresAttackedByWhite: number[][] = Array.from({ length: 8 }, () =>
    Array(8).fill(0)
  );
  private squaresAttackedByBlack: number[][] = Array.from({ length: 8 }, () =>
    Array(8).fill(0)
  );

  private hangingPieceDescriptions: string[] = [];
  private hangingPieceCoordinates: string[] = [];
  private semiProtectedPieceDescriptions: string[] = [];
  private semiProtectedPieceCoordinates: string[] = [];

  private whitePins: Pin[] = [];
  private blackPins: Pin[] = [];

  // note that 0,0 is the top left

  constructor(fen: string) {
    this.parseFEN(fen);
    this.fen = fen;
    this.calculateDefendersAndAttackers();
    this.calculatePieceVulnerability();
    this.detectPins();
  }

  public get HangingPieceDescriptions(): string[] {
    return this.hangingPieceDescriptions;
  }

  public get HangingPieceCoordinates(): string[] {
    return this.hangingPieceCoordinates;
  }

  public get SemiProtectedPieceDescriptions(): string[] {
    return this.semiProtectedPieceDescriptions;
  }

  public get SemiProtectedPieceCoordinates(): string[] {
    return this.semiProtectedPieceCoordinates;
  }

  public toString(): string {
    const lines: string[] = [];

    lines.push("CHESS POSITION TACTICAL ANALYSIS:");
    lines.push("");

    lines.push("=== PIECE VULNERABILITY ===");

    lines.push("HANGING PIECES (Undefended and Attacked):");
    lines.push(
      "Definition: Pieces attacked by opponent with zero defenders - can be captured for free."
    );
    if (this.hangingPieceDescriptions.length > 0) {
      for (let i = 0; i < this.hangingPieceDescriptions.length; i++) {
        lines.push(
          `• ${this.hangingPieceDescriptions[i]} at ${this.hangingPieceCoordinates[i]} - IMMEDIATE THREAT`
        );
      }
    } else {
      lines.push("• No hanging pieces detected");
    }
    lines.push("");

    lines.push("SEMI-PROTECTED PIECES (Equal Attackers/Defenders):");
    lines.push(
      "Definition: Pieces where attackers equal defenders - captures lead to equal material trades."
    );
    if (this.semiProtectedPieceDescriptions.length > 0) {
      for (let i = 0; i < this.semiProtectedPieceDescriptions.length; i++) {
        lines.push(
          `• ${this.semiProtectedPieceDescriptions[i]} at ${this.semiProtectedPieceCoordinates[i]} - CONTESTED`
        );
      }
    } else {
      lines.push("• No semi-protected pieces detected");
    }

    lines.push("");
    lines.push("=== PIN DETECTION ===");
    lines.push(
      "ABSOLUTE PINS: Pieces pinned to the King - cannot move without exposing King to check"
    );
    lines.push(
      "RELATIVE PINS: Pieces pinned to more valuable pieces - moving loses material advantage"
    );
    lines.push("");

    lines.push("WHITE PINS (White pieces pinning Black):");
    if (this.whitePins.length > 0) {
      for (const pin of this.whitePins) {
        const pinType = pin.isAbsolute ? "ABSOLUTE PIN" : "RELATIVE PIN";
        lines.push(
          `• ${pinType}: ${pin.pinningPiece} at ${pin.pinningSquare} pins ${pin.pinnedPiece} at ${pin.pinnedSquare} to ${pin.targetPiece} at ${pin.targetSquare}`
        );
      }
    } else {
      lines.push("• No pins by White detected");
    }

    lines.push("");
    lines.push("BLACK PINS (Black pieces pinning White):");
    if (this.blackPins.length > 0) {
      for (const pin of this.blackPins) {
        const pinType = pin.isAbsolute ? "ABSOLUTE PIN" : "RELATIVE PIN";
        lines.push(
          `• ${pinType}: ${pin.pinningPiece} at ${pin.pinningSquare} pins ${pin.pinnedPiece} at ${pin.pinnedSquare} to ${pin.targetPiece} at ${pin.targetSquare}`
        );
      }
    } else {
      lines.push("• No pins by Black detected");
    }

    lines.push("");
    lines.push("=== FORK OPPORTUNITIES ===");
    lines.push(
      "DEADLY FORKS: Attack 2+ pieces where at least one is higher value OR undefended (profitable capture guaranteed)"
    );
    lines.push(
      "REGULAR FORKS: Attack 2+ pieces but exchanges may not be favorable (positional pressure)"
    );
    lines.push("");

    lines.push("WHITE FORKS:");
    const whiteForksBefore = lines.length;
    this.printAllForks(lines, "w");
    if (lines.length === whiteForksBefore) {
      lines.push("• No white fork opportunities detected");
    }

    lines.push("");
    lines.push("BLACK FORKS:");
    const blackForksBefore = lines.length;
    this.printAllForks(lines, "b");
    if (lines.length === blackForksBefore) {
      lines.push("• No black fork opportunities detected");
    }

    lines.push("");
    lines.push("=== TACTICAL SUMMARY ===");
    lines.push("PRIORITY ACTIONS:");
    lines.push(
      "1. Immediately address any hanging pieces (move or defend them)"
    );
    lines.push("2. Be aware of absolute pins - these pieces cannot move");
    lines.push("3. Execute deadly fork opportunities when available");
    lines.push("4. Exploit relative pins for tactical advantage");
    lines.push("5. Monitor semi-protected pieces for tactical combinations");
    lines.push("6. Look for counter-tactics against opponent fork threats");

    return lines.join("\n");
  }

  private detectPins(): void {
    // Check for pins by white pieces (pinning black pieces)
    this.detectPinsForColor(PieceColour.White);

    // Check for pins by black pieces (pinning white pieces)
    this.detectPinsForColor(PieceColour.Black);
  }

  private detectPinsForColor(attackingColor: PieceColour): void {
    const pins: Pin[] = [];

    // Look for all sliding pieces (bishops, rooks, queens) of the attacking color
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const [colour, piece] = this.getPieceAt(x, y);

        // Only check sliding pieces that can create pins
        if (
          colour === attackingColor &&
          (piece === PieceType.Bishop ||
            piece === PieceType.Rook ||
            piece === PieceType.Queen)
        ) {
          // Get the square notation
          const attackingSquare = this.coordsToSquare(x, y);

          // Check each direction this piece can attack
          const directions = this.getDirectionsForPiece(piece);

          for (const [dx, dy] of directions) {
            const pinResult = this.checkDirectionForPin(
              x,
              y,
              dx,
              dy,
              attackingColor
            );

            if (pinResult) {
              pins.push({
                pinnedPiece: pinResult.pinnedPiece,
                pinnedSquare: pinResult.pinnedSquare,
                pinningPiece: `${this.getColor(
                  attackingColor
                )} ${this.getPieceMap(piece)}`,
                pinningSquare: attackingSquare,
                targetPiece: pinResult.targetPiece,
                targetSquare: pinResult.targetSquare,
                isAbsolute: pinResult.isAbsolute,
              });
            }
          }
        }
      }
    }

    // Store the pins in the appropriate array
    if (attackingColor === PieceColour.White) {
      this.whitePins = pins;
    } else {
      this.blackPins = pins;
    }
  }

  private checkDirectionForPin(
    x: number,
    y: number,
    dx: number,
    dy: number,
    attackingColor: PieceColour
  ): {
    pinnedPiece: string;
    pinnedSquare: string;
    targetPiece: string;
    targetSquare: string;
    isAbsolute: boolean;
  } | null {
    const enemyColor =
      attackingColor === PieceColour.White
        ? PieceColour.Black
        : PieceColour.White;
    let firstPiece: {
      piece: PieceType;
      color: PieceColour;
      x: number;
      y: number;
    } | null = null;
    let secondPiece: {
      piece: PieceType;
      color: PieceColour;
      x: number;
      y: number;
    } | null = null;

    let currentX = x + dx;
    let currentY = y + dy;

    // Travel along the direction looking for pieces
    while (this.isInBoard(currentX, currentY)) {
      const [color, piece] = this.getPieceAt(currentX, currentY);

      if (piece !== PieceType.None) {
        if (!firstPiece) {
          firstPiece = { piece, color, x: currentX, y: currentY };
        } else if (!secondPiece) {
          secondPiece = { piece, color, x: currentX, y: currentY };
          break; // Found two pieces, stop searching
        }
      }

      currentX += dx;
      currentY += dy;
    }

    // Check if we have a pin situation
    if (firstPiece && secondPiece) {
      // The first piece must be enemy color and the second piece must also be enemy color
      if (firstPiece.color === enemyColor && secondPiece.color === enemyColor) {
        const firstPieceValue = this.getPieceValueByType(firstPiece.piece);
        const secondPieceValue = this.getPieceValueByType(secondPiece.piece);

        // Check if it's an absolute pin (pinned to king)
        const isAbsolute = secondPiece.piece === PieceType.King;

        // For relative pins, the piece behind must be more valuable
        // For absolute pins, always report
        if (isAbsolute || secondPieceValue > firstPieceValue) {
          return {
            pinnedPiece: `${this.getColor(firstPiece.color)} ${this.getPieceMap(
              firstPiece.piece
            )}`,
            pinnedSquare: this.coordsToSquare(firstPiece.x, firstPiece.y),
            targetPiece: `${this.getColor(
              secondPiece.color
            )} ${this.getPieceMap(secondPiece.piece)}`,
            targetSquare: this.coordsToSquare(secondPiece.x, secondPiece.y),
            isAbsolute: isAbsolute,
          };
        }
      }
    }

    return null;
  }

  private getDirectionsForPiece(piece: PieceType): number[][] {
    switch (piece) {
      case PieceType.Bishop:
        return [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ];
      case PieceType.Rook:
        return [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
      case PieceType.Queen:
        return [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ];
      default:
        return [];
    }
  }

  private coordsToSquare(x: number, y: number): string {
    const file = String.fromCharCode(x + "a".charCodeAt(0));
    const rank = String.fromCharCode(7 - y + "1".charCodeAt(0));
    return `${file}${rank}`;
  }

  private getPieceValueByType(piece: PieceType): number {
    switch (piece) {
      case PieceType.Pawn:
        return 1;
      case PieceType.Knight:
      case PieceType.Bishop:
        return 3;
      case PieceType.Rook:
        return 5;
      case PieceType.Queen:
        return 8;
      case PieceType.King:
        return 1000;
      default:
        return 0;
    }
  }

  private getPieceMap(p: PieceType): string {
    switch (p) {
      case PieceType.Bishop:
        return "bishop";
      case PieceType.Knight:
        return "knight";
      case PieceType.Pawn:
        return "pawn";
      case PieceType.Queen:
        return "queen";
      case PieceType.Rook:
        return "rook";
      case PieceType.King:
        return "king";
    }

    return "";
  }

  private getColor(p: PieceColour) {
    if (p === PieceColour.White) {
      return "white";
    }

    return "black";
  }

  private calculatePieceVulnerability(): void {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const [colour, piece] = this.getPieceAt(x, y);

        if (piece !== PieceType.None && piece !== PieceType.King) {
          const defended =
            colour === PieceColour.White
              ? this.squaresAttackedByWhite
              : this.squaresAttackedByBlack;
          const attacked =
            colour === PieceColour.Black
              ? this.squaresAttackedByWhite
              : this.squaresAttackedByBlack;

          const attackers = attacked[x][y];
          const defenders = defended[x][y];

          const xcoord = String.fromCharCode(x + "a".charCodeAt(0));
          const ycoord = String.fromCharCode(7 - y + "1".charCodeAt(0));
          const coord = `${xcoord}${ycoord}`;

          const pieceDescription = `${this.getColor(colour)} ${this.getPieceMap(
            piece
          )}`;

          if (attackers > defenders && defenders === 0) {
            this.hangingPieceDescriptions.push(pieceDescription);
            this.hangingPieceCoordinates.push(coord);
          } else if (attackers === defenders && attackers > 0) {
            this.semiProtectedPieceDescriptions.push(pieceDescription);
            this.semiProtectedPieceCoordinates.push(coord);
          }
        }
      }
    }
  }

  private isInBoard(x: number, y: number): boolean {
    return x >= 0 && x <= 7 && y >= 0 && y <= 7;
  }

  private getPieceType(piece: string): PieceType {
    return piece.toUpperCase() as PieceType;
  }

  private getPieceColour(piece: string): PieceColour {
    return piece === piece.toUpperCase()
      ? PieceColour.White
      : PieceColour.Black;
  }

  private getPieceAt(x: number, y: number): [PieceColour, PieceType] {
    const piece = this.board[x][y];
    return [this.getPieceColour(piece), this.getPieceType(piece)];
  }

  private addAttackedSquare(squares: number[][], x: number, y: number): void {
    if (this.isInBoard(x, y)) {
      squares[x][y]++;
    }
  }

  private addAttackedDiagonals(
    squares: number[][],
    colour: PieceColour,
    x: number,
    y: number
  ): void {
    this.addAttackedDiagonalOrLine(squares, colour, x, y, -1, -1);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 1, -1);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 1, 1);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, -1, 1);
  }

  private addAttackedRanksAndFiles(
    squares: number[][],
    colour: PieceColour,
    x: number,
    y: number
  ): void {
    this.addAttackedDiagonalOrLine(squares, colour, x, y, -1, 0);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 1, 0);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 0, 1);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 0, -1);
  }

  private addAttackedDiagonalOrLine(
    squares: number[][],
    colour: PieceColour,
    x: number,
    y: number,
    dx: number,
    dy: number
  ): void {
    let i = x;
    let j = y;

    let xrays: string[];

    if (dx === 0 || dy === 0) {
      // can x-ray through rooks and queen of same colour
      xrays = colour === PieceColour.White ? ["R", "Q"] : ["r", "q"];
    } else {
      // can x-ray through bishops and queen of same colour
      xrays = colour === PieceColour.White ? ["B", "Q"] : ["b", "q"];
    }

    while (true) {
      i += dx;
      j += dy;

      if (!this.isInBoard(i, j)) {
        break;
      }

      squares[i][j]++;

      if (!this.board[i][j]) {
        // there is no piece on the square, so continue until the end of the board
        continue;
      }

      if (xrays.includes(this.board[i][j])) {
        // can x-ray right through this
        continue;
      }

      // got to stop now
      break;
    }
  }

  private calculateDefendersAndAttackers(): void {
    // starting top left
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const [colour, piece] = this.getPieceAt(x, y);
        const squares =
          colour === PieceColour.White
            ? this.squaresAttackedByWhite
            : this.squaresAttackedByBlack;

        switch (piece) {
          case PieceType.Pawn:
            const dir = colour === PieceColour.White ? -1 : 1;
            this.addAttackedSquare(squares, x - 1, y + dir);
            this.addAttackedSquare(squares, x + 1, y + dir);
            break;
          case PieceType.Knight:
            const knightMoves = [
              [-2, -1],
              [-2, 1],
              [-1, -2],
              [1, -2],
              [2, -1],
              [2, 1],
              [-1, 2],
              [1, 2],
            ];
            for (const [dx, dy] of knightMoves) {
              this.addAttackedSquare(squares, x + dx, y + dy);
            }
            break;
          case PieceType.Bishop:
            this.addAttackedDiagonals(squares, colour, x, y);
            break;
          case PieceType.Rook:
            this.addAttackedRanksAndFiles(squares, colour, x, y);
            break;
          case PieceType.Queen:
            this.addAttackedDiagonals(squares, colour, x, y);
            this.addAttackedRanksAndFiles(squares, colour, x, y);
            break;
          case PieceType.King:
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                  this.addAttackedSquare(squares, x + dx, y + dy);
                }
              }
            }
            break;
        }
      }
    }
  }

  private getPieceValue(piece: PieceSymbol): number {
    switch (piece) {
      case "p":
        return 1;
      case "b":
        return 3;
      case "n":
        return 3;
      case "r":
        return 5;
      case "q":
        return 8;
      case "k":
        return 1000;
    }
  }

  private getPieceName(piece: PieceSymbol): string {
    switch (piece) {
      case "p":
        return "pawn";
      case "b":
        return "bishop";
      case "n":
        return "knight"; // Fixed typo: was "night"
      case "r":
        return "rook";
      case "q":
        return "queen";
      case "k":
        return "king";
    }
  }

  private calculateTotalFork(piece: Piece, side: Color): string[][] {
    const pieceForks: string[][] = [];

    // Create a new chess instance for this calculation
    const chess = new Chess(this.fen);

    const pieces = chess.findPiece(piece);

    if (pieces.length === 0) {
      return [];
    }

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      // Don't set turn - just pass the chess instance and side
      const forks = this.calculateFork(piece.type, p, side, chess);
      if (forks.length > 0) {
        pieceForks.push(forks);
      }
    }

    return pieceForks;
  }

  private printPieceForks(piece: Piece, lines: string[], side: Color) {
    const calTf = this.calculateTotalFork(piece, side);

    for (let i = 0; i < calTf.length; i++) {
      for (let j = 0; j < calTf[i].length; j++) {
        lines.push(`• ${calTf[i][j]}`);
      }
    }
  }

  private printAllForks(lines: string[], side: Color): void {
    const pawn: Piece = {
      color: side,
      type: PAWN,
    };
    const bishop: Piece = {
      color: side,
      type: BISHOP,
    };
    const knight: Piece = {
      color: side,
      type: KNIGHT,
    };
    const rook: Piece = {
      color: side,
      type: ROOK,
    };
    const queen: Piece = {
      color: side,
      type: QUEEN,
    };
    const king: Piece = {
      color: side,
      type: KING,
    };

    this.printPieceForks(pawn, lines, side);
    this.printPieceForks(knight, lines, side);
    this.printPieceForks(bishop, lines, side);
    this.printPieceForks(rook, lines, side);
    this.printPieceForks(queen, lines, side);
    this.printPieceForks(king, lines, side);
  }

  private calculateFork(
    piece: PieceSymbol,
    pieceSq: Square,
    side: Color,
    chess: Chess
  ): string[] {
    const forks: string[] = [];

    // Get all squares this piece can attack from its current position
    // Don't use chess.moves() as it's restricted when king is in check
    const attackedSquares = this.getAttackedSquares(piece, pieceSq, chess);

    // Find all enemy pieces that this piece can attack
    const attackableTargets: {
      square: Square;
      piece: PieceSymbol;
      isDeadly: boolean;
    }[] = [];
    const attackingPieceValue = this.getPieceValue(piece);

    for (const square of attackedSquares) {
      const pieceOnSquare = chess.get(square);
      if (pieceOnSquare && pieceOnSquare.color !== side) {
        const targetValue = this.getPieceValue(pieceOnSquare.type);

        // Check if target square is defended by the enemy
        const defended =
          side === "w"
            ? this.squaresAttackedByBlack
            : this.squaresAttackedByWhite;
        const file = square.charCodeAt(0) - "a".charCodeAt(0);
        const rank = parseInt(square[1]) - 1;
        const isDefended = defended[file][7 - rank] > 0; // Note: board coordinates are flipped

        // A target is "deadly" if:
        // 1. It's higher value than the attacking piece, OR
        // 2. It's undefended (even if lower value, it's a free capture)
        const isDeadly = targetValue > attackingPieceValue || !isDefended;

        attackableTargets.push({
          square: square,
          piece: pieceOnSquare.type,
          isDeadly: isDeadly,
        });
      }
    }

    // Filter to only deadly targets
    const deadlyTargets = attackableTargets.filter((target) => target.isDeadly);

    // A deadly fork occurs when a piece can attack 2 or more deadly targets simultaneously
    if (deadlyTargets.length >= 2) {
      const targetDescriptions = deadlyTargets
        .map((target) => {
          const value = this.getPieceValue(target.piece);
          const defended = attackableTargets.find(
            (t) => t.square === target.square
          )?.isDeadly
            ? value > attackingPieceValue
              ? "(higher value)"
              : "(undefended)"
            : "";
          return `${this.getPieceName(target.piece)} on ${
            target.square
          } ${defended}`;
        })
        .join(", ");

      forks.push(
        `DEADLY FORK: The ${this.getPieceName(
          piece
        )} at ${pieceSq} is forking: ${targetDescriptions}`
      );
    }
    // Also report regular forks (attacking 2+ pieces) but mark them as less critical
    else if (attackableTargets.length >= 2) {
      const targetDescriptions = attackableTargets
        .map(
          (target) => `${this.getPieceName(target.piece)} on ${target.square}`
        )
        .join(", ");

      forks.push(
        `Regular fork: The ${this.getPieceName(
          piece
        )} at ${pieceSq} is attacking: ${targetDescriptions} (but exchange may not be favorable)`
      );
    }

    return forks;
  }

  private getAttackedSquares(
    piece: PieceSymbol,
    square: Square,
    chess: Chess
  ): Square[] {
    const attackedSquares: Square[] = [];

    // Convert square notation to coordinates
    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(square[1]) - 1;

    switch (piece) {
      case "p": // pawn
        const pieceColor = chess.get(square)?.color;
        const direction = pieceColor === "w" ? 1 : -1;
        const newRank = rank + direction;

        if (newRank >= 0 && newRank <= 7) {
          if (file > 0) {
            attackedSquares.push(
              `${String.fromCharCode("a".charCodeAt(0) + file - 1)}${
                newRank + 1
              }` as Square
            );
          }
          if (file < 7) {
            attackedSquares.push(
              `${String.fromCharCode("a".charCodeAt(0) + file + 1)}${
                newRank + 1
              }` as Square
            );
          }
        }
        break;

      case "n": // knight
        const knightMoves = [
          [-2, -1],
          [-2, 1],
          [-1, -2],
          [1, -2],
          [2, -1],
          [2, 1],
          [-1, 2],
          [1, 2],
        ];

        for (const [df, dr] of knightMoves) {
          const newFile = file + df;
          const newRank = rank + dr;

          if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
            attackedSquares.push(
              `${String.fromCharCode("a".charCodeAt(0) + newFile)}${
                newRank + 1
              }` as Square
            );
          }
        }
        break;

      case "b": // bishop
        this.addSlidingAttacks(
          attackedSquares,
          file,
          rank,
          [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ],
          chess
        );
        break;

      case "r": // rook
        this.addSlidingAttacks(
          attackedSquares,
          file,
          rank,
          [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ],
          chess
        );
        break;

      case "q": // queen
        this.addSlidingAttacks(
          attackedSquares,
          file,
          rank,
          [
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
            [1, 1],
          ],
          chess
        );
        break;

      case "k": // king
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;

            const newFile = file + df;
            const newRank = rank + dr;

            if (newFile >= 0 && newFile <= 7 && newRank >= 0 && newRank <= 7) {
              attackedSquares.push(
                `${String.fromCharCode("a".charCodeAt(0) + newFile)}${
                  newRank + 1
                }` as Square
              );
            }
          }
        }
        break;
    }

    return attackedSquares;
  }

  private addSlidingAttacks(
    attackedSquares: Square[],
    file: number,
    rank: number,
    directions: number[][],
    chess: Chess
  ): void {
    for (const [df, dr] of directions) {
      let currentFile = file;
      let currentRank = rank;

      while (true) {
        currentFile += df;
        currentRank += dr;

        if (
          currentFile < 0 ||
          currentFile > 7 ||
          currentRank < 0 ||
          currentRank > 7
        ) {
          break;
        }

        const targetSquare = `${String.fromCharCode(
          "a".charCodeAt(0) + currentFile
        )}${currentRank + 1}` as Square;
        attackedSquares.push(targetSquare);

        // Stop if there's a piece on this square
        const pieceOnSquare = chess.get(targetSquare);
        if (pieceOnSquare) {
          break;
        }
      }
    }
  }

  private parseFEN(fen: string): void {
    let rank = 0;
    let file = 0;

    for (let i = 0; i < fen.length; i++) {
      const char = fen[i];

      if (char > "0" && char <= "8") {
        const blankCount = parseInt(char, 10);
        file += blankCount;
      } else if (char === "/") {
        rank++;
        file = 0;
      } else {
        if (char === " ") break;
        this.board[file][rank] = char;
        file++;
      }
    }
  }

  /**
   * Calculate a tactical score for the given side.
   * Higher score = better tactical position
   * Lower score = more tactical weaknesses
   *
   * Scoring system:
   * - Hanging pieces: -10 points each (critical weakness)
   * - Semi-protected pieces: -3 points each (vulnerable)
   * - Pins created by this side: +5 points for absolute, +3 for relative
   * - Pins against this side: -5 points for absolute, -3 for relative
   * - Deadly forks available: +8 points each
   * - Regular forks available: +4 points each
   * - Opponent's deadly forks: -8 points each
   * - Opponent's regular forks: -4 points each
   */
  public calculateTacticalScore(side: Color): number {
    let score = 0;

    // 1. Evaluate hanging pieces (most critical weakness)
    for (let i = 0; i < this.hangingPieceDescriptions.length; i++) {
      const pieceDesc = this.hangingPieceDescriptions[i];
      const belongsToSide =
        (side === "w" && pieceDesc.includes("white")) ||
        (side === "b" && pieceDesc.includes("black"));

      if (belongsToSide) {
        score -= 10; // Our hanging piece = bad
      } else {
        score += 10; // Opponent's hanging piece = good for us
      }
    }

    // 2. Evaluate semi-protected pieces (moderate weakness)
    for (let i = 0; i < this.semiProtectedPieceDescriptions.length; i++) {
      const pieceDesc = this.semiProtectedPieceDescriptions[i];
      const belongsToSide =
        (side === "w" && pieceDesc.includes("white")) ||
        (side === "b" && pieceDesc.includes("black"));

      if (belongsToSide) {
        score -= 3; // Our semi-protected piece = slight weakness
      } else {
        score += 3; // Opponent's semi-protected piece = slight advantage
      }
    }

    // 3. Evaluate pins created by our side (tactical advantage)
    const ourPins = side === "w" ? this.whitePins : this.blackPins;
    for (const pin of ourPins) {
      if (pin.isAbsolute) {
        score += 5; // Absolute pin is very strong
      } else {
        score += 3; // Relative pin is moderately strong
      }
    }

    // 4. Evaluate pins against our side (tactical weakness)
    const opponentPins = side === "w" ? this.blackPins : this.whitePins;
    for (const pin of opponentPins) {
      if (pin.isAbsolute) {
        score -= 5; // Being absolutely pinned is very bad
      } else {
        score -= 3; // Being relatively pinned is moderately bad
      }
    }

    // 5. Evaluate fork opportunities

    const pieces = [
      { color: side, type: PAWN },
      { color: side, type: KNIGHT },
      { color: side, type: BISHOP },
      { color: side, type: ROOK },
      { color: side, type: QUEEN },
      { color: side, type: KING },
    ];

    // Count our forks
    for (const piece of pieces) {
      const forkResults = this.calculateTotalFork(piece as Piece, side);
      for (const forkList of forkResults) {
        for (const fork of forkList) {
          if (fork.includes("DEADLY FORK")) {
            score += 8; // Deadly fork is very valuable
          } else if (fork.includes("Regular fork")) {
            score += 4; // Regular fork has moderate value
          }
        }
      }
    }

    // Count opponent's forks
    const opponentSide = side === "w" ? "b" : "w";
    const opponentPieces = [
      { color: opponentSide, type: PAWN },
      { color: opponentSide, type: KNIGHT },
      { color: opponentSide, type: BISHOP },
      { color: opponentSide, type: ROOK },
      { color: opponentSide, type: QUEEN },
      { color: opponentSide, type: KING },
    ];

    for (const piece of opponentPieces) {
      const forkResults = this.calculateTotalFork(
        piece as Piece,
        opponentSide as Color
      );
      for (const forkList of forkResults) {
        for (const fork of forkList) {
          if (fork.includes("DEADLY FORK")) {
            score -= 8; // Opponent's deadly fork is very dangerous
          } else if (fork.includes("Regular fork")) {
            score -= 4; // Opponent's regular fork is moderately dangerous
          }
        }
      }
    }

    return score;
  }
}
