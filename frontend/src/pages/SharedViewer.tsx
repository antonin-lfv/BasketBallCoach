/** Visionneuse publique en lecture seule (lien de partage). */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import CanvasCourt from "../components/CanvasCourt";
import Playbar from "../components/Playbar";
import { normalizeDoc } from "../engine/model";
import { totalDuration } from "../engine/sampler";
import { rt, setPlaying } from "../runtime";
import { useStore } from "../store";

export default function SharedViewer() {
  const { token } = useParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .shared(token)
      .then(({ title, data }) => {
        // charge le doc partagé sans toucher au brouillon local de l'utilisateur
        const doc = normalizeDoc(data);
        useStore.setState((s) => ({ doc, sel: 0, version: s.version + 1 }));
        setTitle(title);
        setStatus("ok");
        rt.playT = 0;
        setTimeout(() => setPlaying(true, totalDuration(doc)), 600);
      })
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") {
    return <div className="viewer-message">Chargement du système…</div>;
  }
  if (status === "error") {
    return (
      <div className="viewer-message">
        <h2>Lien invalide ou révoqué</h2>
        <p>Demande un nouveau lien à la personne qui l'a partagé.</p>
        <a className="btn primary" href="/app/">Créer mes propres systèmes</a>
      </div>
    );
  }

  return (
    <div className="app-root no-sidebar viewer">
      <header>
        <a href="/" className="brand-link">
          <span className="logo">🏀</span>
          <span className="brand">BasketballCoach</span>
        </a>
        <span className="viewer-title">{title}</span>
        <span className="spacer" />
        <span className="viewer-badge">Lecture seule</span>
        <a className="btn primary" href="/app/">Créer mes systèmes</a>
      </header>
      <main>
        <div id="courtArea">
          <CanvasCourt readonly />
          <Playbar />
        </div>
      </main>
    </div>
  );
}
