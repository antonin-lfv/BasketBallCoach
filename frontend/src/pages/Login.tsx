/** Page de connexion / inscription. */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import Navbar from "../components/Navbar";
import { Toasts } from "../components/Modals";
import { useStore } from "../store";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = mode === "login" ? await api.login(email, password) : await api.register(email, password);
      useStore.getState().setUser(user);
      useStore.getState().toast(mode === "login" ? "Content de te revoir !" : "Compte créé, bienvenue !");
      navigate(params.get("next") || "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-root page-bg">
      <Navbar />
      <div className="center-page">
        <div className="card auth-card">
          <div className="auth-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>
              Connexion
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>
              Inscription
            </button>
          </div>
          <h1>{mode === "login" ? "Content de te revoir" : "Crée ton compte"}</h1>
          <p className="sub">
            {mode === "login"
              ? "Retrouve tes systèmes, tes dossiers et tes liens de partage."
              : "Enregistre tes systèmes, range-les dans des dossiers et partage-les à ton équipe."}
          </p>
          <form onSubmit={submit} className="auth-form">
            <label>
              Adresse email
              <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                required
                minLength={8}
                value={password}
                placeholder={mode === "register" ? "8 caractères minimum" : ""}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn primary big" disabled={busy}>
              {busy ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>
          <p className="auth-alt">
            {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
            <button className="linklike" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Inscris-toi" : "Connecte-toi"}
            </button>
          </p>
          <p className="auth-guest">
            <Link to="/">Continuer sans compte</Link> — tout fonctionne, sauvegardé dans ce navigateur.
          </p>
        </div>
      </div>
      <Toasts />
    </div>
  );
}
