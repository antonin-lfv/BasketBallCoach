/** Page compte : informations, changement de mot de passe. */
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { Toasts } from "../components/Modals";
import Navbar from "../components/Navbar";
import { useStore } from "../store";

export default function Account() {
  const user = useStore((s) => s.user);
  const authChecked = useStore((s) => s.authChecked);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (authChecked && !user) return <Navigate to="/login?next=/account" replace />;

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      useStore.getState().toast("Mot de passe modifié.");
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
        <div className="card">
          <h1>Mon compte</h1>
          <div className="account-row">
            <span className="account-label">Adresse email</span>
            <b>{user?.email}</b>
          </div>
          <h2 className="card-section">Changer le mot de passe</h2>
          <form onSubmit={changePassword} className="auth-form">
            <label>
              Mot de passe actuel
              <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
            </label>
            <label>
              Nouveau mot de passe
              <input type="password" required minLength={8} placeholder="8 caractères minimum" value={next} onChange={(e) => setNext(e.target.value)} />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "…" : "Modifier"}
            </button>
          </form>
          <h2 className="card-section">Session</h2>
          <button
            className="btn"
            onClick={async () => {
              await api.logout();
              useStore.getState().setUser(null);
              navigate("/");
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
      <Toasts />
    </div>
  );
}
