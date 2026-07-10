/** Liste des phases : sélection, renommage, durée, réordonnancement. */
import { useStore } from "../store";

export default function PhaseList() {
  const doc = useStore((s) => s.doc);
  const sel = useStore((s) => s.sel);
  const version = useStore((s) => s.version);
  const store = useStore.getState;
  void version;

  return (
    <div id="phaseList">
      {doc.phases.map((ph, i) => {
        const ballTxt = ph.ball === "shot" ? "🏀→🧺 tir" : "🏀 " + (ph.ball[0] === "d" ? "D" : "J") + ph.ball[1];
        const scr = (ph.screens || []).map((sc) => sc.s[1] + "▸D" + sc.d[1]).join(" ");
        return (
          <div
            key={i}
            className={"phase-item" + (i === sel ? " selected" : "")}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("input,button")) return;
              store().setSel(i);
            }}
          >
            <div className="top">
              <span className="num">{i + 1}</span>
              <input
                className="pname"
                defaultValue={ph.name}
                spellCheck={false}
                onFocus={() => store().setSel(i)}
                onChange={(e) => {
                  ph.name = e.target.value;
                  store().bump();
                }}
              />
              {scr && <span className="scr-tag">T {scr}</span>}
              <span className="ball-tag">{ballTxt}</span>
            </div>
            <div className="bottom">
              {i > 0 ? (
                <>
                  <label>durée</label>
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    defaultValue={ph.duration}
                    onChange={(e) => {
                      ph.duration = Math.max(0.25, parseFloat(e.target.value) || 1.5);
                      store().bump();
                    }}
                  />
                  <span>s</span>
                </>
              ) : (
                <span style={{ fontSize: 12 }}>position initiale</span>
              )}
              <span className="icons">
                <button className="icon-btn" title="Monter" onClick={() => store().movePhase(i, -1)}>▲</button>
                <button className="icon-btn" title="Descendre" onClick={() => store().movePhase(i, 1)}>▼</button>
                <button className="icon-btn" title="Dupliquer" onClick={() => store().duplicatePhase(i)}>⧉</button>
                <button className="icon-btn" title="Supprimer" onClick={() => store().deletePhase(i)}>✕</button>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
