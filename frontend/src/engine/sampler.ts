/** Moteur de lecture : état interpolé du système à l'instant t. */
import { clamp, dist, ease, lerp, posAlong, tokenMoving } from "./geometry";
import { heldBallPos, lastHolderPos, nearestHoop, staticBallPos, visibleScreens } from "./model";
import { ALL_IDS, END_HOLD, START_HOLD, type Phase, type Pt, type SystemDoc } from "./types";

export interface ScreenSample {
  sPos: Pt;
  dPos: Pt;
  alpha: number;
}

export interface Sample {
  pos: Record<string, Pt>;
  ball: Pt | null;
  ballScale: number;
  label: string;
  phaseIdx: number;
  screens: ScreenSample[];
}

export function totalDuration(doc: SystemDoc): number {
  let d = START_HOLD + END_HOLD;
  for (let i = 1; i < doc.phases.length; i++) d += doc.phases[i].duration;
  return d;
}

export function sampleAt(doc: SystemDoc, t: number): Sample {
  const ph = doc.phases;
  const out: Sample = { pos: {}, ball: null, ballScale: 1, label: ph[0].name, phaseIdx: 0, screens: [] };
  // écrans dessinés aux positions FINALES de la phase
  const screensOf = (phase: Phase, alpha: number): ScreenSample[] =>
    visibleScreens(doc, phase).map((sc) => ({ sPos: phase.pos[sc.s], dPos: phase.pos[sc.d], alpha }));

  let bs = 1;

  function ballDuring(A: Phase, B: Phase, e: number, pos: Record<string, Pt>, local: number, dur: number): Pt {
    const arc = (from: Pt, to: Pt, amp: number): Pt => {
      const p = { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) };
      const d = dist(from, to);
      if (d > 0.5) {
        const nx = -(to.y - from.y) / d;
        const ny = (to.x - from.x) / d;
        const a = Math.sin(Math.PI * e) * amp;
        p.x += nx * a;
        p.y += ny * a;
      }
      return p;
    };
    if (A.ball !== "shot" && B.ball === "shot") {
      const from = heldBallPos(pos[A.ball]);
      const target = nearestHoop(doc.courtMode, B.pos[A.ball]);
      bs = 1 - 0.25 * Math.sin(Math.PI * e);
      return arc(from, target, 0.55);
    }
    if (A.ball === "shot" && B.ball !== "shot") {
      return arc(nearestHoop(doc.courtMode, B.pos[B.ball]), heldBallPos(pos[B.ball]), 0.3);
    }
    if (A.ball === "shot" && B.ball === "shot") {
      return nearestHoop(doc.courtMode, lastHolderPos(doc, B));
    }
    if (A.ball !== B.ball) {
      return arc(heldBallPos(pos[A.ball]), heldBallPos(pos[B.ball]), 0.5);
    }
    // dribble : le ballon rebondit pendant le déplacement du porteur
    const h = A.ball;
    if (tokenMoving(A, B, h)) {
      const bounces = Math.max(2, Math.round(dur * 2.4));
      bs = 0.66 + 0.34 * Math.abs(Math.sin(Math.PI * bounces * local));
    }
    return heldBallPos(pos[h]);
  }

  if (ph.length === 1 || t <= START_HOLD) {
    const A = ph[0];
    ALL_IDS.forEach((id) => (out.pos[id] = { ...A.pos[id] }));
    out.ball = staticBallPos(doc, A);
    out.label = A.name;
    out.screens = screensOf(A, 1);
    return out;
  }

  let acc = START_HOLD;
  for (let i = 1; i < ph.length; i++) {
    const dur = ph[i].duration;
    if (t < acc + dur || (i === ph.length - 1 && t >= acc)) {
      const local = clamp((t - acc) / dur, 0, 1);
      const e = ease(local);
      const A = ph[i - 1];
      const B = ph[i];
      ALL_IDS.forEach((id) => {
        out.pos[id] = posAlong(A, B, id, e);
      });
      out.ball = ballDuring(A, B, e, out.pos, local, dur);
      out.ballScale = bs;
      out.label = B.name;
      out.phaseIdx = i;
      out.screens = screensOf(B, clamp((e - 0.65) / 0.3, 0, 1)); // apparaît en fin de déplacement
      return out;
    }
    acc += dur;
  }

  const Z = ph[ph.length - 1];
  ALL_IDS.forEach((id) => (out.pos[id] = { ...Z.pos[id] }));
  out.ball = staticBallPos(doc, Z);
  out.label = Z.name;
  out.phaseIdx = ph.length - 1;
  out.screens = screensOf(Z, 1);
  return out;
}
