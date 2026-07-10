/** Composition d'une frame complète (édition ou lecture) sur un canvas. */
import { pathPoints, tokenMoving } from "../engine/geometry";
import { nearestHoop, staticBallPos, visibleIds, visibleScreens } from "../engine/model";
import { sampleAt } from "../engine/sampler";
import { COLORS, COURT, type Pt, type SystemDoc } from "../engine/types";
import type { DragState } from "../runtime";
import {
  dist, drawArrow, drawBall, drawCourt, drawHandleDot, drawOverlayText,
  drawPathArrow, drawScreen, drawTitle, drawToken,
} from "./draw";
import { computeView, type View } from "./view";
import { crPoint } from "../engine/geometry";

export interface SceneOpts {
  sel: number;
  playT: number;
  playingView: boolean; // lecture ou scrubbing : afficher l'état interpolé
  dragging?: DragState | null;
  dragBallPos?: Pt | null;
  exportMode?: boolean; // masque les poignées d'édition
  cleanExport?: boolean; // masque aussi titre et libellé (planche)
  margin?: number;
}

export function renderScene(cv: HTMLCanvasElement, doc: SystemDoc, o: SceneOpts): View {
  const ctx = cv.getContext("2d")!;
  const view = computeView(cv.width, cv.height, doc.courtMode, o.margin ?? COURT.M);
  const mode = doc.courtMode;
  drawCourt(ctx, cv.width, cv.height, view, mode);

  if (o.playingView) {
    const s = sampleAt(doc, o.playT);
    visibleIds(doc).forEach((id) => drawToken(ctx, view, mode, id, s.pos[id]));
    s.screens.forEach((sc) => {
      if (sc.alpha > 0) drawScreen(ctx, view, mode, sc.sPos, sc.dPos, sc.alpha);
    });
    if (s.ball) drawBall(ctx, view, mode, s.ball, 1, s.ballScale || 1);
    if (!o.cleanExport) drawOverlayText(ctx, cv.width, cv.height, s.label);
  } else {
    const phase = doc.phases[o.sel];
    const prev = o.sel > 0 ? doc.phases[o.sel - 1] : null;
    const dragging = o.dragging ?? null;

    if (prev) {
      // fantômes + flèches de déplacement (courbes si points de passage)
      visibleIds(doc).forEach((id) => {
        if (tokenMoving(prev, phase, id)) {
          drawToken(ctx, view, mode, id, prev.pos[id], 0.22);
          drawPathArrow(
            ctx, view, mode, pathPoints(prev, phase, id),
            id[0] === "a" ? COLORS.attacker : COLORS.defender, false, 0.55,
          );
        }
      });
      // flèche de passe / tir (pointillés)
      if (prev.ball !== phase.ball) {
        if (phase.ball === "shot" && prev.ball !== "shot") {
          drawArrow(ctx, view, mode, phase.pos[prev.ball], nearestHoop(mode, phase.pos[prev.ball]), COLORS.ball, true);
        } else if (prev.ball !== "shot" && phase.ball !== "shot") {
          drawArrow(ctx, view, mode, phase.pos[prev.ball], phase.pos[phase.ball], COLORS.ball, true);
        } else if (prev.ball === "shot" && phase.ball !== "shot") {
          drawArrow(ctx, view, mode, nearestHoop(mode, phase.pos[phase.ball]), phase.pos[phase.ball], COLORS.ball, true);
        }
      }
    }

    visibleIds(doc).forEach((id) => {
      if (dragging && dragging.id === id) return;
      drawToken(ctx, view, mode, id, phase.pos[id]);
    });
    if (dragging && dragging.id !== "ball" && dragging.id !== "via") {
      drawToken(ctx, view, mode, dragging.id, phase.pos[dragging.id]);
    }

    visibleScreens(doc, phase).forEach((sc) => drawScreen(ctx, view, mode, phase.pos[sc.s], phase.pos[sc.d]));

    if (prev && !o.exportMode && (!dragging || dragging.id === "via")) {
      // poignées de trajectoire
      visibleIds(doc).forEach((id) => {
        if (!tokenMoving(prev, phase, id)) return;
        const pts = pathPoints(prev, phase, id);
        const n = pts.length - 1;
        for (let k = 0; k < n; k++) drawHandleDot(ctx, view, mode, crPoint(pts, (k + 0.5) / n), false);
        ((phase.via && phase.via[id]) || []).forEach((v) => drawHandleDot(ctx, view, mode, v, true));
      });
    }

    if (dragging && dragging.id === "ball" && o.dragBallPos) {
      drawBall(ctx, view, mode, o.dragBallPos, 0.9, 1.15);
    } else {
      drawBall(ctx, view, mode, staticBallPos(doc, phase));
    }

    if (!o.cleanExport) drawOverlayText(ctx, cv.width, cv.height, phase.name);
  }

  if (!o.cleanExport) drawTitle(ctx, cv.height, doc.title);
  return view;
}

export { dist };
