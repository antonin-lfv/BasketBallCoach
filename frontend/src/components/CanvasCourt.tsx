/** Terrain interactif : rendu rAF + drag joueurs/ballon/poignées + écrans. */
import { useEffect, useRef, useState } from "react";
import { crPoint, dist, pathPoints, tokenMoving } from "../engine/geometry";
import { clampToCourt, cleanupScreens, nearestHoop, staticBallPos, visibleIds, visibleScreens } from "../engine/model";
import { totalDuration } from "../engine/sampler";
import { DEF_IDS, R_BALL, R_PLAYER } from "../engine/types";
import { finishVideoExport } from "../exports";
import { screenBarCenter } from "../render/draw";
import { renderScene } from "../render/scene";
import { computeView, s2c } from "../render/view";
import { rt, rtEmit, setPlaying } from "../runtime";
import { useStore } from "../store";

interface ScreenOffer {
  s: string;
  d: string;
  x: number;
  y: number;
}

export default function CanvasCourt({ readonly = false }: { readonly?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [offer, setOffer] = useState<ScreenOffer | null>(null);
  const offerRef = useRef(offer);
  offerRef.current = offer;

  // boucle de rendu
  useEffect(() => {
    const cv = cvRef.current!;
    const wrap = wrapRef.current!;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cv.width = wrap.clientWidth * dpr;
      cv.height = wrap.clientHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const { doc, sel } = useStore.getState();
      if (rt.playing) {
        rt.playT += dt * rt.speed;
        const total = totalDuration(doc);
        if (rt.playT >= total) {
          rt.playT = total;
          rt.playing = false;
          rt.scrubbing = true; // garder la dernière frame affichée
          if (rt.recording) finishVideoExport();
        }
        rtEmit();
      }
      renderScene(cv, doc, {
        sel,
        playT: rt.playT,
        playingView: rt.playing || rt.scrubbing,
        dragging: rt.dragging,
        dragBallPos: rt.dragBallPos,
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // clavier
  useEffect(() => {
    if (readonly) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches?.("input, select, textarea")) return;
      const st = useStore.getState();
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying(!rt.playing, totalDuration(st.doc));
      } else if (e.key === "ArrowRight") {
        st.setSel(st.sel + 1);
      } else if (e.key === "ArrowLeft") {
        st.setSel(st.sel - 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        st.undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readonly]);

  const pointerCourt = (ev: React.PointerEvent) => {
    const cv = cvRef.current!;
    const r = cv.getBoundingClientRect();
    const dpr = cv.width / r.width;
    const { doc } = useStore.getState();
    const view = computeView(cv.width, cv.height, doc.courtMode);
    return s2c(view, doc.courtMode, (ev.clientX - r.left) * dpr, (ev.clientY - r.top) * dpr);
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    if (readonly || rt.playing || rt.recording) return;
    if (rt.scrubbing) {
      rt.scrubbing = false;
      rtEmit();
      return; // 1er clic : retour à la vue édition
    }
    setOffer(null);
    const st = useStore.getState();
    const { doc, sel } = st;
    const phase = doc.phases[sel];
    const c = pointerCourt(ev);

    // clic sur la barre d'un écran -> suppression
    for (const sc of visibleScreens(doc, phase)) {
      if (dist(c, screenBarCenter(phase, sc)) < 0.35) {
        st.pushUndo();
        phase.screens = phase.screens.filter((x) => x !== sc);
        st.toast("Écran retiré.");
        st.bump();
        return;
      }
    }

    // ballon : saisie directe si le clic est vraiment dessus
    const bp = staticBallPos(doc, phase);
    const grabBall = () => {
      st.pushUndo();
      rt.dragging = { id: "ball" };
      rt.dragBallPos = { ...c };
      cvRef.current!.setPointerCapture(ev.pointerId);
    };
    if (dist(c, bp) < R_BALL * 1.35) {
      grabBall();
      return;
    }

    // poignées de trajectoire (points réels puis virtuels)
    if (sel > 0) {
      const prev = doc.phases[sel - 1];
      for (const id of visibleIds(doc)) {
        if (!tokenMoving(prev, phase, id)) continue;
        const via = (phase.via && phase.via[id]) || [];
        for (let k = 0; k < via.length; k++) {
          if (dist(c, via[k]) < 0.34) {
            st.pushUndo();
            rt.dragging = { id: "via", token: id, k };
            cvRef.current!.setPointerCapture(ev.pointerId);
            return;
          }
        }
        const pts = pathPoints(prev, phase, id);
        const n = pts.length - 1;
        for (let k = 0; k < n; k++) {
          const m = crPoint(pts, (k + 0.5) / n);
          if (dist(c, m) < 0.3) {
            st.pushUndo();
            if (!phase.via) phase.via = {};
            if (!phase.via[id]) phase.via[id] = [];
            phase.via[id].splice(k, 0, { x: m.x, y: m.y });
            rt.dragging = { id: "via", token: id, k };
            cvRef.current!.setPointerCapture(ev.pointerId);
            return;
          }
        }
      }
    }

    // joueurs (du dernier dessiné au premier)
    const ids = visibleIds(doc).slice().reverse();
    for (const id of ids) {
      if (dist(c, phase.pos[id]) < R_PLAYER * 1.4) {
        st.pushUndo();
        rt.dragging = { id, dx: phase.pos[id].x - c.x, dy: phase.pos[id].y - c.y };
        cvRef.current!.setPointerCapture(ev.pointerId);
        return;
      }
    }

    // zone de tolérance autour du ballon si aucun joueur touché
    if (dist(c, bp) < R_BALL * 2.6) grabBall();
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (!rt.dragging) return;
    const { doc, sel } = useStore.getState();
    const phase = doc.phases[sel];
    const c = pointerCourt(ev);
    if (rt.dragging.id === "ball") {
      rt.dragBallPos = clampToCourt(doc.courtMode, c);
    } else if (rt.dragging.id === "via") {
      phase.via[rt.dragging.token!][rt.dragging.k!] = clampToCourt(doc.courtMode, c);
    } else {
      phase.pos[rt.dragging.id] = clampToCourt(doc.courtMode, {
        x: c.x + (rt.dragging.dx || 0),
        y: c.y + (rt.dragging.dy || 0),
      });
    }
  };

  const onPointerUp = (ev: React.PointerEvent) => {
    if (!rt.dragging) return;
    const st = useStore.getState();
    const { doc, sel } = st;
    const phase = doc.phases[sel];
    const wasDragging = rt.dragging.id;

    if (wasDragging === "ball" && rt.dragBallPos) {
      const hoop = nearestHoop(doc.courtMode, rt.dragBallPos);
      if (dist(rt.dragBallPos, hoop) < 1.0) {
        phase.ball = "shot";
        st.toast("🏀 Tir au panier sur « " + phase.name + " »");
      } else {
        let best: string | null = null;
        let bd = 1.3;
        visibleIds(doc).forEach((id) => {
          const d = dist(rt.dragBallPos!, phase.pos[id]);
          if (d < bd) {
            bd = d;
            best = id;
          }
        });
        if (best) {
          phase.ball = best;
          st.toast("Ballon donné " + ((best as string)[0] === "d" ? "au défenseur " : "au joueur ") + (best as string)[1]);
        }
      }
      rt.dragBallPos = null;
    }
    rt.dragging = null;

    // écran : attaquant sans ballon lâché sur un défenseur ?
    cleanupScreens(phase);
    if (wasDragging[0] === "a" && wasDragging !== phase.ball) {
      const p = phase.pos[wasDragging];
      let best: string | null = null;
      let bd = 1.15;
      DEF_IDS.slice(0, doc.defenders).forEach((d) => {
        const dd = dist(p, phase.pos[d]);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      });
      const already = best && (phase.screens || []).some((sc) => sc.s === wasDragging && sc.d === best);
      if (best && !already) {
        const wrap = wrapRef.current!.getBoundingClientRect();
        setOffer({
          s: wasDragging,
          d: best,
          x: Math.min(Math.max(ev.clientX - wrap.left + 12, 8), wrap.width - 190),
          y: Math.min(Math.max(ev.clientY - wrap.top - 46, 8), wrap.height - 50),
        });
      }
    }
    st.bump();
  };

  const onDblClick = (ev: React.MouseEvent) => {
    if (readonly || rt.playing) return;
    const st = useStore.getState();
    const { doc, sel } = st;
    if (sel === 0) return;
    const phase = doc.phases[sel];
    const cv = cvRef.current!;
    const r = cv.getBoundingClientRect();
    const dpr = cv.width / r.width;
    const view = computeView(cv.width, cv.height, doc.courtMode);
    const c = s2c(view, doc.courtMode, (ev.clientX - r.left) * dpr, (ev.clientY - r.top) * dpr);
    for (const id of visibleIds(doc)) {
      const via = (phase.via && phase.via[id]) || [];
      for (let k = 0; k < via.length; k++) {
        if (dist(c, via[k]) < 0.34) {
          st.pushUndo();
          via.splice(k, 1);
          st.toast("Point de trajectoire supprimé.");
          st.bump();
          return;
        }
      }
    }
  };

  const confirmScreen = () => {
    if (!offer) return;
    const st = useStore.getState();
    const phase = st.doc.phases[st.sel];
    st.pushUndo();
    phase.screens = (phase.screens || []).filter((sc) => sc.d !== offer.d);
    phase.screens.push({ s: offer.s, d: offer.d });
    st.toast("Écran de " + offer.s[1] + " sur D" + offer.d[1] + " (clique sur le T pour le retirer)");
    setOffer(null);
    st.bump();
  };

  return (
    <div id="canvasWrap" ref={wrapRef}>
      <canvas
        ref={cvRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDblClick}
      />
      {offer && (
        <div id="screenPopup" className="show" style={{ left: offer.x, top: offer.y }}>
          <span>
            Écran de {offer.s[1]} sur D{offer.d[1]} ?
          </span>
          <button className="btn small primary" onClick={confirmScreen}>
            Écran
          </button>
          <button className="btn small" onClick={() => setOffer(null)}>
            Non
          </button>
        </div>
      )}
    </div>
  );
}
