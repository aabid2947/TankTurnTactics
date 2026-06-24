import type { MyPlayer, QueueRow } from "./gameTypes";

export interface Cell {
  x: number;
  y: number;
}

/**
 * Where a tank will stand after its already-queued moves resolve, in order. Queued moves chain —
 * the engine resolves them slot-by-slot from the tank's live position (Z→Y, then Y→X) — so the
 * origin for the *next* queued action is the end of that chain, not the tank's current cell.
 * Non-move actions don't change position. Assumes each move succeeds, matching how queue
 * affordability is validated (see convex/lib/cost.ts).
 */
export function projectedPosition(me: Pick<MyPlayer, "x" | "y">, queue: QueueRow[]): Cell {
  let pos: Cell = { x: me.x, y: me.y };
  for (const row of queue) {
    if (row.action.kind === "move") pos = { x: row.action.to.x, y: row.action.to.y };
  }
  return pos;
}

/**
 * The `from` cell of each queued move, keyed by queue-row id: the first move starts at the tank's
 * live cell; each later move starts where the previous one ended. Lets the queue label a chained
 * move correctly as "Y → X" rather than "Z → X".
 */
export function moveOrigins(me: Pick<MyPlayer, "x" | "y">, queue: QueueRow[]): Map<string, Cell> {
  const origins = new Map<string, Cell>();
  let pos: Cell = { x: me.x, y: me.y };
  for (const row of queue) {
    if (row.action.kind === "move") {
      origins.set(row._id, pos);
      pos = { x: row.action.to.x, y: row.action.to.y };
    }
  }
  return origins;
}

/** Ordered destination cells of the queued moves — used to draw the planned path on the board. */
export function plannedMoveCells(queue: QueueRow[]): Cell[] {
  const cells: Cell[] = [];
  for (const row of queue) {
    if (row.action.kind === "move") cells.push({ x: row.action.to.x, y: row.action.to.y });
  }
  return cells;
}
