/** Barre de navigation globale : marque, sections, compte. */
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../store";

export default function Navbar() {
  const user = useStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <nav className="topnav">
      <a className="brand-link" href="/" title="Page d'accueil">
        <span className="logo">🏀</span>
        <span className="brand">
          Basketball<em>Coach</em>
        </span>
      </a>
      <div className="nav-tabs">
        <NavLink to="/" end>
          Éditeur
        </NavLink>
        <NavLink to="/library">Bibliothèque</NavLink>
      </div>
      <span className="spacer" />
      {user ? (
        <div className="user-wrap" ref={wrapRef}>
          <button className="avatar" title={user.email} onClick={() => setOpen(!open)}>
            {user.email[0].toUpperCase()}
          </button>
          {open && (
            <div className="user-menu">
              <div className="user-menu-email">{user.email}</div>
              <Link to="/account" onClick={() => setOpen(false)}>
                Mon compte
              </Link>
              <Link to="/settings" onClick={() => setOpen(false)}>
                Paramètres
              </Link>
              <hr />
              <button
                onClick={async () => {
                  await api.logout();
                  useStore.getState().setUser(null);
                  useStore.getState().toast("Déconnecté.");
                  setOpen(false);
                  navigate("/");
                }}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link className="btn primary" to="/login">
          Connexion
        </Link>
      )}
    </nav>
  );
}
