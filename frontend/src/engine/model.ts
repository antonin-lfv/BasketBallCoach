/** Création, normalisation et situations initiales des systèmes. */
import { clamp, dist } from "./geometry";
import {
  ALL_IDS, ATT_IDS, COURT, DEF_IDS, HOOP_L, HOOP_R,
  type CourtMode, type Phase, type Pt, type SystemDoc,
} from "./types";

export function nearestHoop(mode: CourtMode, p: Pt): Pt {
  if (mode === "half") return HOOP_L;
  return dist(p, HOOP_L) < dist(p, HOOP_R) ? HOOP_L : HOOP_R;
}

export function heldBallPos(playerPos: Pt): Pt {
  return { x: playerPos.x + 0.42, y: playerPos.y - 0.34 };
}

export function clampToCourt(mode: CourtMode, p: Pt, margin = COURT.M): Pt {
  return {
    x: clamp(p.x, -margin + 0.2, (mode === "half" ? COURT.HALF : COURT.W) + margin - 0.2),
    y: clamp(p.y, -margin + 0.2, COURT.H + margin - 0.2),
  };
}

export function lastHolderPos(doc: SystemDoc, phase: Phase): Pt {
  const i = doc.phases.indexOf(phase);
  for (let k = i; k >= 0; k--) {
    const b = doc.phases[k].ball;
    if (b !== "shot") return phase.pos[b];
  }
  return phase.pos.a1;
}

/** Position du ballon pour une phase statique. */
export function staticBallPos(doc: SystemDoc, phase: Phase): Pt {
  if (phase.ball === "shot") return nearestHoop(doc.courtMode, lastHolderPos(doc, phase));
  return heldBallPos(phase.pos[phase.ball]);
}

export function defaultPositions(): Record<string, Pt> {
  const p: Record<string, Pt> = {
    a1: { x: 8.6, y: 7.5 },
    a2: { x: 7.0, y: 2.6 },
    a3: { x: 7.0, y: 12.4 },
    a4: { x: 2.6, y: 5.1 },
    a5: { x: 2.6, y: 9.9 },
  };
  ATT_IDS.forEach((id, i) => {
    const a = p[id];
    const v = { x: HOOP_L.x - a.x, y: HOOP_L.y - a.y };
    const n = Math.hypot(v.x, v.y) || 1;
    p[DEF_IDS[i]] = { x: a.x + (v.x / n) * 1.5, y: a.y + (v.y / n) * 1.5 };
  });
  return p;
}

export function makePhase(base: Phase | null, n: number): Phase {
  return {
    name: "Phase " + n,
    duration: 1.5,
    ball: base ? base.ball : "a1",
    pos: base ? JSON.parse(JSON.stringify(base.pos)) : defaultPositions(),
    screens: [],
    via: {},
  };
}

export function defaultDoc(): SystemDoc {
  return {
    app: "basketballcoach-web",
    version: 1,
    title: "Nouveau système",
    courtMode: "half",
    defenders: 0,
    situation: "defaut",
    phases: [makePhase(null, 1)],
  };
}

export function normalizeDoc(doc: SystemDoc): SystemDoc {
  doc.phases.forEach((ph) => {
    if (!Array.isArray(ph.screens)) ph.screens = [];
    if (!ph.via || typeof ph.via !== "object") ph.via = {};
  });
  return doc;
}

export function isValidDoc(data: unknown): data is SystemDoc {
  const d = data as SystemDoc;
  return !!d && d.app === "basketballcoach-web" && Array.isArray(d.phases) && d.phases.length > 0;
}

/* ---------- Situations initiales ----------
   Les deux vues étant cohérentes (rotation pure), y grand = gauche du panier.
   Les coordonnées de base décrivent la variante "droite" (y petit);
   la variante "gauche" est le miroir y -> 15 - y. */

export const SITUATION_LABELS: Record<string, string> = {
  defaut: "Attaque placée",
  cote_gauche: "Côté gauche",
  cote_droit: "Côté droit",
  fond_gauche: "Fond gauche",
  fond_droit: "Fond droit",
  lf_attaque: "Lancer franc attaque",
  lf_defense: "Lancer franc défense",
};

function situationPositions(baseKey: string) {
  const A: Record<string, Pt> = {};
  const D: Record<string, Pt> = {};
  let ball = "a1";
  // spots de rebond le long de la raquette (1er = près de la ligne de fond)
  const spot = (n: number, side: number): Pt => ({ x: 2.2 + (n - 1) * 1.4, y: side < 0 ? 4.6 : 10.4 });
  switch (baseKey) {
    case "cote_gauche": // remise en touche, ligne de côté
      Object.assign(A, {
        a1: { x: 6.5, y: -0.5 }, a2: { x: 5.2, y: 2.8 }, a3: { x: 8.6, y: 4.8 },
        a4: { x: 2.6, y: 4.8 }, a5: { x: 4.2, y: 9.6 },
      });
      break;
    case "fond_gauche": // remise en fond de terrain, alignement en boîte
      Object.assign(A, {
        a1: { x: -0.5, y: 5.3 },
        a2: spot(1, -1), a3: spot(1, 1), a4: spot(3, -1), a5: spot(3, 1),
      });
      break;
    case "lf_attaque": // notre lancer franc : a1 tire
      // Raquette : tireur + 2 attaquants (2e spots) + 3 défenseurs (1er spots x2, 3e spot x1)
      Object.assign(A, {
        a1: { x: 5.8, y: 7.5 },
        a4: spot(2, -1), a5: spot(2, 1),
        a2: { x: 8.4, y: 4.0 }, a3: { x: 8.9, y: 10.6 },
      });
      Object.assign(D, {
        d4: spot(1, -1), d5: spot(1, 1), d2: spot(3, -1),
        d1: { x: 9.2, y: 7.5 }, d3: { x: 8.8, y: 10.0 },
      });
      break;
    case "lf_defense": // lancer franc adverse : d1 tire
      Object.assign(A, {
        a4: spot(1, -1), a5: spot(1, 1), a3: spot(3, -1),
        a2: { x: 8.0, y: 4.5 }, a1: { x: 9.5, y: 7.5 },
      });
      Object.assign(D, {
        d1: { x: 5.8, y: 7.5 }, d2: spot(2, -1), d3: spot(2, 1),
        d4: { x: 8.8, y: 5.5 }, d5: { x: 8.8, y: 9.5 },
      });
      ball = "d1";
      break;
  }
  return { A, D, ball };
}

/** Applique une situation à la phase 1 (mutation du doc). */
export function applySituation(doc: SystemDoc, key: string): void {
  if (!key) return;
  const ph = doc.phases[0];
  if (key === "defaut") {
    ph.pos = defaultPositions();
    ph.ball = "a1";
  } else {
    const baseKey = key.replace("_droit", "_gauche");
    const { A, D, ball } = situationPositions(baseKey);
    const flip = !key.endsWith("_droit");
    const put = (id: string, p: Pt) => {
      ph.pos[id] = clampToCourt(doc.courtMode, flip ? { x: p.x, y: 15 - p.y } : { ...p });
    };
    Object.entries(A).forEach(([id, p]) => put(id, p));
    if (Object.keys(D).length) {
      Object.entries(D).forEach(([id, p]) => put(id, p));
      if (doc.defenders === 0) doc.defenders = 5; // le LF n'a de sens qu'avec des défenseurs
    } else {
      for (let i = 0; i < 5; i++) {
        const a = ph.pos[ATT_IDS[i]];
        const hoop = nearestHoop(doc.courtMode, a);
        const v = { x: hoop.x - a.x, y: hoop.y - a.y };
        const n = Math.hypot(v.x, v.y) || 1;
        ph.pos[DEF_IDS[i]] = clampToCourt(doc.courtMode, { x: a.x + (v.x / n) * 1.4, y: a.y + (v.y / n) * 1.4 });
      }
    }
    ph.ball = ball;
  }
  ph.screens = [];
  doc.situation = key;
}

export const visibleIds = (doc: SystemDoc): string[] => [...ATT_IDS, ...DEF_IDS.slice(0, doc.defenders)];

export const visibleScreens = (doc: SystemDoc, phase: Phase) =>
  (phase.screens || []).filter((sc) => DEF_IDS.indexOf(sc.d as (typeof DEF_IDS)[number]) < doc.defenders);

/** Retire les écrans devenus incohérents (poseur trop loin du défenseur). */
export function cleanupScreens(phase: Phase): void {
  if (!phase.screens) return;
  phase.screens = phase.screens.filter((sc) => dist(phase.pos[sc.s], phase.pos[sc.d]) < 2.2);
}

void ALL_IDS;
