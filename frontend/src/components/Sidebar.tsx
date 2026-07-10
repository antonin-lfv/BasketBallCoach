/** Panneau latéral : terrain, situation, défenseurs, phases, aide. */
import { clampToCourt, nearestHoop, SITUATION_LABELS, visibleIds } from "../engine/model";
import { ATT_IDS, DEF_IDS, type CourtMode } from "../engine/types";
import { useStore } from "../store";
import PhaseList from "./PhaseList";

export default function Sidebar() {
  const doc = useStore((s) => s.doc);
  const version = useStore((s) => s.version);
  const store = useStore.getState;
  void version;

  const setCourtMode = (mode: CourtMode) => {
    const st = store();
    st.pushUndo();
    st.doc.courtMode = mode;
    if (mode === "half") {
      st.doc.phases.forEach((ph) => {
        visibleIds(st.doc).forEach(() => {});
        Object.keys(ph.pos).forEach((id) => {
          ph.pos[id] = clampToCourt("half", ph.pos[id]);
        });
        if (ph.via) {
          Object.values(ph.via).forEach((arr) => arr.forEach((v, i) => (arr[i] = clampToCourt("half", v))));
        }
      });
    }
    st.bump();
  };

  const autoDefenders = () => {
    const st = store();
    st.pushUndo();
    const ph = st.doc.phases[st.sel];
    for (let i = 0; i < st.doc.defenders; i++) {
      const a = ph.pos[ATT_IDS[i]];
      const hoop = nearestHoop(st.doc.courtMode, a);
      const v = { x: hoop.x - a.x, y: hoop.y - a.y };
      const n = Math.hypot(v.x, v.y) || 1;
      ph.pos[DEF_IDS[i]] = clampToCourt(st.doc.courtMode, { x: a.x + (v.x / n) * 1.4, y: a.y + (v.y / n) * 1.4 });
    }
    st.bump();
    st.toast("Défenseurs placés sur la phase " + (st.sel + 1));
  };

  return (
    <aside>
      <section>
        <h2>Terrain</h2>
        <div className="row">
          <div className="seg">
            <button className={doc.courtMode === "half" ? "active" : ""} onClick={() => setCourtMode("half")}>
              Demi-terrain
            </button>
            <button className={doc.courtMode === "full" ? "active" : ""} onClick={() => setCourtMode("full")}>
              Terrain complet
            </button>
          </div>
        </div>
        <div className="row">
          <label className="inline">Situation</label>
          <select
            value={doc.situation || "defaut"}
            title="Position initiale (phase 1)"
            onChange={(e) => store().applySituation(e.target.value)}
          >
            {Object.entries(SITUATION_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <label className="inline">Défenseurs</label>
          <select
            value={doc.defenders}
            onChange={(e) => {
              const st = store();
              st.pushUndo();
              st.doc.defenders = parseInt(e.target.value);
              st.bump();
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button className="btn small" title="Place chaque défenseur entre son attaquant et le panier" onClick={autoDefenders}>
            Placement auto
          </button>
        </div>
      </section>

      <section id="phasesSection">
        <h2>
          Phases
          <span style={{ float: "right" }}>
            <button className="btn small primary" onClick={() => store().addPhase()}>
              + Phase
            </button>
          </span>
        </h2>
        <PhaseList />
        <div className="hint">
          Glisse les joueurs sur le terrain pour définir leurs positions à chaque phase. Glisse le{" "}
          <b style={{ color: "var(--accent)" }}>ballon</b> sur un joueur pour lui donner, ou sur le panier pour un tir.
          Glisse un joueur <i>sans ballon</i> sur un défenseur pour poser un <b>écran</b> (clique sur le T pour le
          retirer). Tire sur le petit point au milieu d'une flèche pour <b>courber</b> la trajectoire (double-clic sur
          un point pour le retirer).
        </div>
      </section>

      <section>
        <h2>Raccourcis</h2>
        <div className="hint" style={{ marginTop: 0 }}>
          <b>Espace</b> lecture / pause · <b>← →</b> changer de phase · <b>Ctrl+Z</b> annuler
        </div>
      </section>
    </aside>
  );
}
