import type { Phase, Pt } from "./types";

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => t * t * (3 - 2 * t); // smoothstep
export const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y);

/** Point sur la spline Catmull-Rom passant par pts, t dans [0,1]. */
export function crPoint(pts: Pt[], t: number): Pt {
  const n = pts.length - 1;
  if (n <= 0) return { ...pts[0] };
  const ft = clamp(t, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(ft));
  const u = ft - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(n, i + 2)];
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return { x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) };
}

/** Points d'ancrage du déplacement de `id` : position précédente, via..., position courante. */
export function pathPoints(A: Phase, B: Phase, id: string): Pt[] {
  return [A.pos[id], ...((B.via && B.via[id]) || []), B.pos[id]];
}

/** Position d'un jeton pendant la transition A -> B (e déjà lissé). */
export function posAlong(A: Phase, B: Phase, id: string, e: number): Pt {
  const pts = pathPoints(A, B, id);
  if (pts.length > 2) return crPoint(pts, e);
  return { x: lerp(pts[0].x, pts[1].x, e), y: lerp(pts[0].y, pts[1].y, e) };
}

export function tokenMoving(prev: Phase, phase: Phase, id: string): boolean {
  return dist(prev.pos[id], phase.pos[id]) > 0.35 || ((phase.via && phase.via[id]) || []).length > 0;
}
