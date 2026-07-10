/** Paramètres : préférences par défaut de l'éditeur (stockées dans ce navigateur). */
import { Toasts } from "../components/Modals";
import Navbar from "../components/Navbar";
import type { CourtMode } from "../engine/types";
import { rt } from "../runtime";
import { useStore } from "../store";

export default function Settings() {
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);

  return (
    <div className="app-root page-bg">
      <Navbar />
      <div className="center-page">
        <div className="card">
          <h1>Paramètres</h1>
          <p className="sub">Préférences appliquées aux nouveaux systèmes. Enregistrées dans ce navigateur.</p>

          <div className="setting-row">
            <div>
              <b>Terrain par défaut</b>
              <small>Pour chaque nouveau système</small>
            </div>
            <select
              value={prefs.courtMode}
              onChange={(e) => setPrefs({ courtMode: e.target.value as CourtMode })}
            >
              <option value="half">Demi-terrain</option>
              <option value="full">Terrain complet</option>
            </select>
          </div>

          <div className="setting-row">
            <div>
              <b>Défenseurs par défaut</b>
              <small>Nombre affiché à la création</small>
            </div>
            <select value={prefs.defenders} onChange={(e) => setPrefs({ defenders: parseInt(e.target.value) })}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-row">
            <div>
              <b>Vitesse de lecture</b>
              <small>Vitesse initiale de l'animation</small>
            </div>
            <select
              value={prefs.speed}
              onChange={(e) => {
                const speed = parseFloat(e.target.value);
                setPrefs({ speed });
                rt.speed = speed;
              }}
            >
              <option value={0.5}>×0.5</option>
              <option value={0.75}>×0.75</option>
              <option value={1}>×1</option>
              <option value={1.5}>×1.5</option>
              <option value={2}>×2</option>
            </select>
          </div>
        </div>
      </div>
      <Toasts />
    </div>
  );
}
