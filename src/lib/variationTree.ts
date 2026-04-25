import { Chess } from "chess.js";

export type NAG = "" | "!" | "!!" | "?" | "??" | "?!" | "!?";

export interface MoveNode {
  id: string;              // stable unique id, e.g. ply + move
  ply: number;             // 0 = root (no move played), 1 = first half-move
  san: string;             // SAN notation of the move that led here
  uci: string;             // UCI notation (e4e5 style) for arrows
  fen: string;             // FEN after this move
  comment: string;         // user / AI comment on this move
  nag: NAG;                // Numeric Annotation Glyph (displayed as symbol)
  next: MoveNode | null;   // main line continuation
  variations: MoveNode[];  // alternative first moves of each branch
  parent: MoveNode | null; // back-pointer (not serialised)
}

export interface VariationTree {
  root: MoveNode;          // sentinel node: ply=0, fen=startFen, san=""
  cursor: string;          // id of the currently selected node
}

// ─────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────

let _idCounter = 0;
function newId() {
  return `n${++_idCounter}`;
}

export function makeRoot(fen?: string): MoveNode {
  const startFen = fen ?? new Chess().fen();
  return {
    id: "root",
    ply: 0,
    san: "",
    uci: "",
    fen: startFen,
    comment: "",
    nag: "",
    next: null,
    variations: [],
    parent: null,
  };
}

export function makeTree(fen?: string): VariationTree {
  const root = makeRoot(fen);
  return { root, cursor: root.id };
}

// ─────────────────────────────────────────────
// Tree traversal helpers
// ─────────────────────────────────────────────

/** Walk every node depth-first, invoking callback. */
export function walk(node: MoveNode, cb: (n: MoveNode) => void): void {
  cb(node);
  if (node.next) walk(node.next, cb);
  node.variations.forEach((v) => walk(v, cb));
}

/** Find a node by id anywhere in the tree. */
export function findNode(
  root: MoveNode,
  id: string
): MoveNode | null {
  if (root.id === id) return root;
  if (root.next) {
    const found = findNode(root.next, id);
    if (found) return found;
  }
  for (const v of root.variations) {
    const found = findNode(v, id);
    if (found) return found;
  }
  return null;
}

/**
 * Returns true if the node with `targetId` is on the main line
 * (i.e. reachable exclusively via `node.next` links from root),
 * false if it is inside a variation branch.
 */
export function isMainLine(root: MoveNode, targetId: string): boolean {
  let node: MoveNode | null = root;
  while (node) {
    if (node.id === targetId) return true;
    node = node.next;
  }
  return false;
}

/** Return the path (list of nodes) from root to target node. */
export function pathTo(root: MoveNode, targetId: string): MoveNode[] {
  function helper(node: MoveNode, acc: MoveNode[]): MoveNode[] | null {
    if (node.id === targetId) return [...acc, node];
    if (node.next) {
      const found = helper(node.next, [...acc, node]);
      if (found) return found;
    }
    for (const v of node.variations) {
      const found = helper(v, [...acc, node]);
      if (found) return found;
    }
    return null;
  }
  return helper(root, []) ?? [];
}

// ─────────────────────────────────────────────
// Mutation helpers (return new tree for immutability)
// ─────────────────────────────────────────────

/** Clone node tree (shallow parent refs are fixed after cloning) */
export function cloneNode(node: MoveNode, parent: MoveNode | null = null): MoveNode {
  const clone: MoveNode = {
    ...node,
    parent,
    next: null,
    variations: [],
  };
  if (node.next) clone.next = cloneNode(node.next, clone);
  clone.variations = node.variations.map((v) => cloneNode(v, clone));
  return clone;
}

export function cloneTree(tree: VariationTree): VariationTree {
  return { ...tree, root: cloneNode(tree.root) };
}

/**
 * Add a move after the node with `parentId`.
 *
 * - If the parent has no `next`, the move becomes the main line continuation.
 * - If the parent already has a `next` with the same SAN, we navigate to it.
 * - Otherwise the move is added as a new variation.
 *
 * Returns { newTree, newCursorId }.
 */
export function addMove(
  tree: VariationTree,
  parentId: string,
  san: string,
  uci: string,
  fen: string
): { newTree: VariationTree; newCursorId: string } {
  const newTree = cloneTree(tree);
  const parent = findNode(newTree.root, parentId);
  if (!parent) return { newTree: tree, newCursorId: tree.cursor };

  // Check if main line already has this exact move
  if (parent.next && parent.next.san === san) {
    return { newTree, newCursorId: parent.next.id };
  }

  // Check if any variation has this move
  const existing = parent.variations.find((v) => v.san === san);
  if (existing) {
    return { newTree, newCursorId: existing.id };
  }

  const newNode: MoveNode = {
    id: newId(),
    ply: parent.ply + 1,
    san,
    uci,
    fen,
    comment: "",
    nag: "",
    next: null,
    variations: [],
    parent,
  };

  if (!parent.next) {
    parent.next = newNode;
  } else {
    parent.variations.push(newNode);
  }

  return { newTree, newCursorId: newNode.id };
}

/** Update comment on a node */
export function setComment(
  tree: VariationTree,
  nodeId: string,
  comment: string
): VariationTree {
  const newTree = cloneTree(tree);
  const node = findNode(newTree.root, nodeId);
  if (node) node.comment = comment;
  return newTree;
}

/** Update NAG on a node */
export function setNag(
  tree: VariationTree,
  nodeId: string,
  nag: NAG
): VariationTree {
  const newTree = cloneTree(tree);
  const node = findNode(newTree.root, nodeId);
  if (node) node.nag = nag;
  return newTree;
}

/** Delete a node and all its children. If it's a variation root, remove it from parent.variations. */
export function deleteVariation(
  tree: VariationTree,
  nodeId: string
): VariationTree {
  const newTree = cloneTree(tree);

  function remove(node: MoveNode): boolean {
    // Check if this node's next should be removed
    if (node.next?.id === nodeId) {
      node.next = null;
      return true;
    }
    // Check variations
    const varIdx = node.variations.findIndex((v) => v.id === nodeId);
    if (varIdx !== -1) {
      node.variations.splice(varIdx, 1);
      return true;
    }
    if (node.next && remove(node.next)) return true;
    for (const v of node.variations) {
      if (remove(v)) return true;
    }
    return false;
  }

  remove(newTree.root);

  // Reset cursor to root if deleted node was selected
  const cursorStillExists = !!findNode(newTree.root, newTree.cursor);
  if (!cursorStillExists) {
    newTree.cursor = "root";
  }

  return newTree;
}

/** Promote a variation to the main line (swap with current main line) */
export function promoteVariation(
  tree: VariationTree,
  variationId: string
): VariationTree {
  const newTree = cloneTree(tree);

  function promote(node: MoveNode): boolean {
    const varIdx = node.variations.findIndex((v) => v.id === variationId);
    if (varIdx !== -1 && node.next) {
      const mainLine = node.next;
      const variation = node.variations[varIdx];
      // Swap
      node.next = variation;
      node.variations[varIdx] = mainLine;
      // Fix parent pointers
      mainLine.parent = node;
      variation.parent = node;
      return true;
    }
    if (node.next && promote(node.next)) return true;
    for (const v of node.variations) {
      if (promote(v)) return true;
    }
    return false;
  }

  promote(newTree.root);
  return newTree;
}

// ─────────────────────────────────────────────
// PGN serialization
// ─────────────────────────────────────────────

export function treeToPGN(tree: VariationTree, headers?: Record<string, string>): string {
  function nodeToStr(node: MoveNode): string {
    if (!node.san) return "";

    const moveNum =
      Math.ceil(node.ply / 2) + (node.ply % 2 === 1 ? "." : "...");
    const nag = node.nag ? ` $${nagToNum(node.nag)}` : "";
    const comment = node.comment ? ` { ${node.comment} }` : "";

    let str = `${moveNum} ${node.san}${nag}${comment} `;

    // Inline variations
    for (const v of node.variations) {
      str += `( ${nodeToStr(v)} ) `;
    }

    // Main continuation
    if (node.next) {
      str += nodeToStr(node.next);
    }

    return str;
  }

  const headerStr = headers
    ? Object.entries(headers)
        .map(([k, v]) => `[${k} "${v}"]`)
        .join("\n") + "\n\n"
    : "";

  return headerStr + nodeToStr(tree.root.next ?? tree.root).trim();
}

function nagToNum(nag: NAG): number {
  const map: Record<string, number> = {
    "!": 1, "?": 2, "!!": 3, "??": 4, "!?": 5, "?!": 6,
  };
  return map[nag] ?? 0;
}

// ─────────────────────────────────────────────
// PGN parsing → VariationTree
// ─────────────────────────────────────────────

/**
 * Build a VariationTree from an array of SAN moves (flat mainline, no branches).
 * Used for loading existing games.
 */
export function movesToTree(moves: string[], startFen?: string): VariationTree {
  const tree = makeTree(startFen);
  const chess = new Chess(startFen);
  let cursor = tree.root;

  for (const san of moves) {
    try {
      const move = chess.move(san);
      if (!move) break;
      const newNode: MoveNode = {
        id: newId(),
        ply: cursor.ply + 1,
        san: move.san,
        uci: move.from + move.to + (move.promotion ?? ""),
        fen: chess.fen(),
        comment: "",
        nag: "",
        next: null,
        variations: [],
        parent: cursor,
      };
      cursor.next = newNode;
      cursor = newNode;
    } catch {
      break;
    }
  }

  tree.cursor = cursor.id;
  return tree;
}
// ─────────────────────────────────────────────
// Full PGN → VariationTree (with comments, NAGs, variations)
// ─────────────────────────────────────────────

function numToNag(n: number): NAG {
  const map: Record<number, NAG> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };
  return map[n] ?? "";
}

/**
 * Parse a full annotated PGN string (with { comments }, $NAG, and (variations))
 * into a VariationTree. Handles arbitrary nesting depth.
 *
 * Built mutably for performance — no cloning on every node. The tree is only
 * exposed after construction so immutability concerns don't apply here.
 */
export function parseAnnotatedPGN(pgn: string, startFen?: string): VariationTree {
  const tree = makeTree(startFen);

  // Strip PGN tag headers
  const moveText = pgn.replace(/\[\w+\s+"[^"]*"\]\s*/g, "").trim();
  if (!moveText) return tree;

  const tokens = tokenizePGN(moveText);

  let cursor: MoveNode = tree.root;
  // Stack stores the node we were at when "(" was encountered so we can
  // restore it — i.e. the last mainline node before the variation started.
  const stack: MoveNode[] = [];

  for (const tok of tokens) {
    // ── Variation open ───────────────────────────────────────────────────
    if (tok === "(") {
      // Save current cursor; variations branch from cursor.parent
      stack.push(cursor);
      cursor = cursor.parent ?? cursor;
      continue;
    }

    // ── Variation close ──────────────────────────────────────────────────
    if (tok === ")") {
      if (stack.length > 0) cursor = stack.pop()!;
      continue;
    }

    // ── Brace comment ────────────────────────────────────────────────────
    if (tok.startsWith("{")) {
      // Strip all [%tag ...] commands — keep only prose
      const inner = tok.slice(1, -1);
      cursor.comment = inner.replace(/\[%[^\]]*\]/g, "").trim();
      // Also store raw clock if present — attach to comment field prefixed
      // with a sentinel so handleNavigate can extract it cheaply.
      const clkMatch = inner.match(/\[%clk\s+([\d:]+(?:\.\d+)?)\s*\]/);
      if (clkMatch) {
        // Store clock in comment as " [clk:H:MM:SS]" suffix so navigate can pick it up
        cursor.comment = (cursor.comment ? cursor.comment + " " : "") + `[clk:${clkMatch[1]}]`;
      }
      continue;
    }

    // ── NAG ─────────────────────────────────────────────────────────────
    if (tok.startsWith("$")) {
      const n = parseInt(tok.slice(1), 10);
      const nag = numToNag(n);
      // Only overwrite if we got a meaningful NAG; also handle inline ! ? etc
      if (nag) cursor.nag = nag;
      continue;
    }

    // ── Move number / result — skip ──────────────────────────────────────
    if (/^\d+\.+$/.test(tok) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) continue;

    // ── Inline NAG suffix attached to move token (e.g. "Nf3!" "Qd5?!") ──
    let san = tok;
    let inlineNag: NAG = "";
    const suffixMap: Record<string, NAG> = {
      "!!": "!!", "??": "??", "!?": "!?", "?!": "?!", "!": "!", "?": "?",
    };
    for (const [s, nag] of Object.entries(suffixMap)) {
      if (san.endsWith(s)) { san = san.slice(0, -s.length); inlineNag = nag; break; }
    }

    // ── SAN move ────────────────────────────────────────────────────────
    const chess = new Chess(cursor.fen);
    try {
      const move = chess.move(san);
      if (!move) continue;

      const uci = move.from + move.to + (move.promotion ?? "");
      const newFen = chess.fen();

      // Check if this exact move already exists as main line
      if (cursor.next && cursor.next.san === move.san) {
        cursor = cursor.next;
      } else {
        // Check existing variations
        const existingVar = cursor.variations.find(v => v.san === move.san);
        if (existingVar) {
          cursor = existingVar;
        } else {
          // Create new node — attach as main line or variation
          const newNode: MoveNode = {
            id: newId(),
            ply: cursor.ply + 1,
            san: move.san,
            uci,
            fen: newFen,
            comment: "",
            nag: inlineNag,
            next: null,
            variations: [],
            parent: cursor,
          };
          if (!cursor.next) {
            cursor.next = newNode;
          } else {
            cursor.variations.push(newNode);
          }
          cursor = newNode;
        }
      }

      // Apply inline nag if move already existed and had none
      if (inlineNag && !cursor.nag) cursor.nag = inlineNag;
    } catch {
      // Invalid SAN — skip silently
    }
  }

  tree.cursor = tree.root.id;
  return tree;
}

function tokenizePGN(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "{") {
      // Gather comment
      let j = i + 1;
      while (j < text.length && text[j] !== "}") j++;
      tokens.push("{" + text.slice(i + 1, j) + "}");
      i = j + 1;
    } else if (ch === "(" || ch === ")") {
      tokens.push(ch);
      i++;
    } else if (ch === "$") {
      let j = i + 1;
      while (j < text.length && /\d/.test(text[j])) j++;
      tokens.push(text.slice(i, j));
      i = j;
    } else if (/\s/.test(ch)) {
      i++;
    } else {
      // Word token (move, move number, result)
      let j = i;
      while (j < text.length && !/[\s{}()$]/.test(text[j])) j++;
      if (j > i) tokens.push(text.slice(i, j));
      i = j;
    }
  }
  return tokens;
}


export interface SerializedNode {
  id: string;
  ply: number;
  san: string;
  uci: string;
  fen: string;
  /** Omitted when empty string */
  comment?: string;
  /** Omitted when empty string */
  nag?: NAG;
  /** id of main-line child, null when leaf */
  nextId: string | null;
  /** ids of variation children (alternative first moves) */
  variationIds: string[];
}

export interface SerializedTree {
  /** Flat array — root is always first */
  nodes: SerializedNode[];
  /** id of the currently selected node (cursor) */
  cursor: string;
}

/** Serialize a VariationTree into a compact flat structure for DB storage. */
export function serializeTree(tree: VariationTree): SerializedTree {
  const nodes: SerializedNode[] = [];

  function visit(node: MoveNode): void {
    const sn: SerializedNode = {
      id: node.id,
      ply: node.ply,
      san: node.san,
      uci: node.uci,
      fen: node.fen,
      nextId: node.next ? node.next.id : null,
      variationIds: node.variations.map((v) => v.id),
    };
    if (node.comment) sn.comment = node.comment;
    if (node.nag) sn.nag = node.nag;
    nodes.push(sn);

    // Depth-first: main line first, then variations
    if (node.next) visit(node.next);
    node.variations.forEach((v) => visit(v));
  }

  visit(tree.root);
  return { nodes, cursor: tree.cursor };
}

/** Rebuild a VariationTree from a serialized flat structure. */
export function deserializeTree(data: SerializedTree): VariationTree {
  if (!data?.nodes?.length) return makeTree();

  // Phase 1: create all MoveNode shells (without links)
  const map = new Map<string, MoveNode>();
  for (const sn of data.nodes) {
    map.set(sn.id, {
      id: sn.id,
      ply: sn.ply,
      san: sn.san,
      uci: sn.uci,
      fen: sn.fen,
      comment: sn.comment ?? "",
      nag: (sn.nag ?? "") as NAG,
      next: null,
      variations: [],
      parent: null,
    });
  }

  // Phase 2: wire up links
  for (const sn of data.nodes) {
    const node = map.get(sn.id)!;
    if (sn.nextId) {
      const next = map.get(sn.nextId);
      if (next) { node.next = next; next.parent = node; }
    }
    for (const vid of sn.variationIds) {
      const v = map.get(vid);
      if (v) { node.variations.push(v); v.parent = node; }
    }
  }

  const root = map.get("root");
  if (!root) return makeTree();

  // Ensure cursor exists in tree, else fall back to root
  const cursorId = map.has(data.cursor) ? data.cursor : "root";

  return { root, cursor: cursorId };
}