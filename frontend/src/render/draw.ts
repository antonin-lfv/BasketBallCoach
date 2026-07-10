/** Dessin du terrain, des jetons, flèches, écrans et textes. */
import { crPoint, dist } from "../engine/geometry";
import { COLORS, COURT, HOOP_L, HOOP_R, R_BALL, R_PLAYER, type CourtMode, type Phase, type Pt } from "../engine/types";
import { c2s, setCourtTransform, type View } from "./view";

type Ctx = CanvasRenderingContext2D;

export function drawCourt(ctx: Ctx, w: number, h: number, view: View, mode: CourtMode): void {
  const half = mode === "half";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = COLORS.floorOut;
  ctx.fillRect(0, 0, w, h);

  setCourtTransform(ctx, view, mode);
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = COLORS.line;
  ctx.lineCap = "round";

  const XMAX = half ? COURT.HALF : COURT.W;

  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, XMAX, COURT.H);

  ctx.fillStyle = COLORS.key;
  ctx.fillRect(0, 7.5 - 2.45, 5.8, 4.9);
  if (!half) ctx.fillRect(COURT.W - 5.8, 7.5 - 2.45, 5.8, 4.9);

  ctx.strokeRect(0, 0, XMAX, COURT.H);

  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(14, COURT.H);
  ctx.stroke();
  ctx.beginPath();
  if (half) ctx.arc(14, 7.5, 1.8, Math.PI / 2, Math.PI * 1.5);
  else ctx.arc(14, 7.5, 1.8, 0, Math.PI * 2);
  ctx.stroke();

  drawEnd(ctx, false);
  if (!half) drawEnd(ctx, true);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawEnd(ctx: Ctx, mirror: boolean): void {
  const mx = (x: number) => (mirror ? COURT.W - x : x);
  const hoop = mirror ? HOOP_R : HOOP_L;

  ctx.strokeRect(Math.min(mx(0), mx(5.8)), 7.5 - 2.45, 5.8, 4.9);

  ctx.beginPath();
  ctx.arc(mx(5.8), 7.5, 1.8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mx(1.2), 6.6);
  ctx.lineTo(mx(1.2), 8.4);
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.lineWidth = 0.06;

  ctx.beginPath();
  ctx.arc(hoop.x, hoop.y, 0.225, 0, Math.PI * 2);
  ctx.strokeStyle = "#c2410c";
  ctx.stroke();
  ctx.strokeStyle = COLORS.line;

  ctx.beginPath();
  const nc0 = mirror ? Math.PI / 2 : -Math.PI / 2;
  ctx.arc(hoop.x, hoop.y, 1.25, nc0, nc0 + Math.PI, mirror);
  ctx.stroke();

  const cornerX = 2.99;
  ctx.beginPath();
  ctx.moveTo(mx(0), 0.9);
  ctx.lineTo(mx(cornerX), 0.9);
  ctx.moveTo(mx(0), 14.1);
  ctx.lineTo(mx(cornerX), 14.1);
  ctx.stroke();
  const dy = 6.6;
  const dx = Math.sqrt(6.75 * 6.75 - dy * dy);
  const a1 = Math.atan2(-dy, mirror ? -dx : dx);
  const a2 = Math.atan2(dy, mirror ? -dx : dx);
  ctx.beginPath();
  ctx.arc(hoop.x, hoop.y, 6.75, a1, a2, mirror);
  ctx.stroke();
}

export function drawToken(ctx: Ctx, view: View, mode: CourtMode, id: string, p: Pt, alpha = 1): void {
  const [sx, sy] = c2s(view, mode, p.x, p.y);
  const r = R_PLAYER * view.s;
  const att = id[0] === "a";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.ellipse(sx, sy + r * 0.45, r * 0.95, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = att ? COLORS.attacker : COLORS.defender;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.13);
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${r * 1.05}px -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(id[1], sx, sy + r * 0.05);
  ctx.restore();
}

export function drawBall(ctx: Ctx, view: View, mode: CourtMode, p: Pt, alpha = 1, scale = 1): void {
  const [sx, sy] = c2s(view, mode, p.x, p.y);
  const r = R_BALL * view.s * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.ball;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.strokeStyle = COLORS.ballEdge;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx - r, sy);
  ctx.lineTo(sx + r, sy);
  ctx.moveTo(sx, sy - r);
  ctx.lineTo(sx, sy + r);
  ctx.lineWidth = Math.max(0.7, r * 0.09);
  ctx.stroke();
  ctx.restore();
}

export function drawArrow(ctx: Ctx, view: View, mode: CourtMode, from: Pt, to: Pt, color: string, dashed = false, alpha = 0.85): void {
  const [x1, y1] = c2s(view, mode, from.x, from.y);
  const [x2, y2] = c2s(view, mode, to.x, to.y);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const head = Math.max(7, view.s * 0.32);
  const back = R_PLAYER * view.s * 1.15;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < back * 1.4) return;
  const ex = x2 - Math.cos(ang) * back;
  const ey = y2 - Math.sin(ang) * back;
  const bx = x1 + Math.cos(ang) * back;
  const by = y1 + Math.sin(ang) * back;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, view.s * 0.09);
  ctx.setLineDash(dashed ? [8, 7] : []);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(ex - Math.cos(ang) * head * 0.7, ey - Math.sin(ang) * head * 0.7);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - head * Math.cos(ang - 0.42), ey - head * Math.sin(ang - 0.42));
  ctx.lineTo(ex - head * Math.cos(ang + 0.42), ey - head * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Flèche suivant la spline (retombe sur drawArrow si trajectoire droite). */
export function drawPathArrow(ctx: Ctx, view: View, mode: CourtMode, pts: Pt[], color: string, dashed = false, alpha = 0.85): void {
  if (pts.length === 2) return drawArrow(ctx, view, mode, pts[0], pts[1], color, dashed, alpha);
  const S = 32;
  const scr: [number, number][] = [];
  for (let k = 0; k <= S; k++) {
    const p = crPoint(pts, k / S);
    scr.push(c2s(view, mode, p.x, p.y));
  }
  const back = R_PLAYER * view.s * 1.15;
  let i0 = 0;
  let i1 = scr.length - 1;
  while (i0 < i1 && Math.hypot(scr[i0][0] - scr[0][0], scr[i0][1] - scr[0][1]) < back) i0++;
  while (i1 > i0 && Math.hypot(scr[i1][0] - scr[S][0], scr[i1][1] - scr[S][1]) < back) i1--;
  if (i1 - i0 < 2) return;
  const ang = Math.atan2(scr[i1][1] - scr[i1 - 1][1], scr[i1][0] - scr[i1 - 1][0]);
  const head = Math.max(7, view.s * 0.32);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, view.s * 0.09);
  ctx.lineJoin = "round";
  ctx.setLineDash(dashed ? [8, 7] : []);
  ctx.beginPath();
  ctx.moveTo(scr[i0][0], scr[i0][1]);
  for (let k = i0 + 1; k <= i1; k++) ctx.lineTo(scr[k][0], scr[k][1]);
  ctx.stroke();
  ctx.setLineDash([]);
  const ex = scr[i1][0];
  const ey = scr[i1][1];
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - head * Math.cos(ang - 0.42), ey - head * Math.sin(ang - 0.42));
  ctx.lineTo(ex - head * Math.cos(ang + 0.42), ey - head * Math.sin(ang + 0.42));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Symbole en T : barre perpendiculaire côté défenseur, queue vers le poseur. */
export function drawScreen(ctx: Ctx, view: View, mode: CourtMode, sPos: Pt, dPos: Pt, alpha = 1): void {
  const dx = dPos.x - sPos.x;
  const dy = dPos.y - sPos.y;
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n;
  const uy = dy / n;
  const bar = { x: dPos.x - ux * (R_PLAYER + 0.3), y: dPos.y - uy * (R_PLAYER + 0.3) };
  const HALF_BAR = 0.65;
  const TAIL = 0.6;
  const [x1, y1] = c2s(view, mode, bar.x + uy * HALF_BAR, bar.y - ux * HALF_BAR);
  const [x2, y2] = c2s(view, mode, bar.x - uy * HALF_BAR, bar.y + ux * HALF_BAR);
  const [x3, y3] = c2s(view, mode, bar.x, bar.y);
  const [x4, y4] = c2s(view, mode, bar.x - ux * TAIL, bar.y - uy * TAIL);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#1e293b";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(3, view.s * 0.13);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.moveTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.stroke();
  ctx.restore();
}

/** Centre de la barre du T (pour le hit-test de suppression). */
export function screenBarCenter(phase: Phase, sc: { s: string; d: string }): Pt {
  const sPos = phase.pos[sc.s];
  const dPos = phase.pos[sc.d];
  const dx = dPos.x - sPos.x;
  const dy = dPos.y - sPos.y;
  const n = Math.hypot(dx, dy) || 1;
  return { x: dPos.x - (dx / n) * (R_PLAYER + 0.3), y: dPos.y - (dy / n) * (R_PLAYER + 0.3) };
}

export function drawHandleDot(ctx: Ctx, view: View, mode: CourtMode, p: Pt, real: boolean): void {
  const [sx, sy] = c2s(view, mode, p.x, p.y);
  const r = Math.max(4, view.s * 0.14) * (real ? 1.3 : 1);
  ctx.save();
  ctx.globalAlpha = real ? 0.95 : 0.5;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#334155";
  ctx.stroke();
  ctx.restore();
}

export function drawOverlayText(ctx: Ctx, w: number, h: number, label: string): void {
  if (!label) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fs = Math.max(14, h * 0.032);
  ctx.font = `600 ${fs}px -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const x = w / 2;
  const y = h - fs * 0.6;
  const tw = ctx.measureText(label).width + fs * 1.6;
  ctx.fillStyle = "rgba(15,23,42,.72)";
  roundRect(ctx, x - tw / 2, y - fs * 1.55, tw, fs * 1.9, fs * 0.5);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(label, x, y);
}

export function drawTitle(ctx: Ctx, h: number, title: string): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fs = Math.max(13, h * 0.028);
  ctx.font = `700 ${fs}px -apple-system, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(60,36,10,.85)";
  ctx.fillText(title, fs * 0.8, fs * 0.7);
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export { dist };
