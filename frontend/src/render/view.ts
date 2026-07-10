/** Projection terrain <-> écran.
    La vue demi-terrain est une ROTATION pure de la vue complète (pas de miroir) :
    ce qui est à gauche du panier reste à gauche du panier dans les deux vues. */
import { COURT, type CourtMode } from "../engine/types";

export interface View {
  s: number; // px par mètre
  ox: number;
  oy: number;
}

export function computeView(w: number, h: number, mode: CourtMode, margin = COURT.M): View {
  const half = mode === "half";
  const cw = half ? COURT.H : COURT.W;
  const ch = half ? COURT.HALF : COURT.H;
  const s = Math.min(w / (cw + 2 * margin), h / (ch + 2 * margin));
  return { s, ox: (w - cw * s) / 2, oy: (h - ch * s) / 2 };
}

export function c2s(view: View, mode: CourtMode, x: number, y: number): [number, number] {
  const { s, ox, oy } = view;
  if (mode === "half") return [ox + (COURT.H - y) * s, oy + x * s];
  return [ox + x * s, oy + y * s];
}

export function s2c(view: View, mode: CourtMode, px: number, py: number): { x: number; y: number } {
  const { s, ox, oy } = view;
  if (mode === "half") return { x: (py - oy) / s, y: COURT.H - (px - ox) / s };
  return { x: (px - ox) / s, y: (py - oy) / s };
}

export function setCourtTransform(ctx: CanvasRenderingContext2D, view: View, mode: CourtMode): void {
  const { s, ox, oy } = view;
  if (mode === "half") ctx.setTransform(0, s, -s, 0, ox + COURT.H * s, oy);
  else ctx.setTransform(s, 0, 0, s, ox, oy);
}
