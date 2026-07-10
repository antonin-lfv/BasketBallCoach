/** Bibliothèque : page dédiée avec dossiers et systèmes du compte. */
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError, type FolderOut, type SystemMeta } from "../api";
import { Toasts } from "../components/Modals";
import Navbar from "../components/Navbar";
import { useStore } from "../store";

export default function Library() {
  const user = useStore((s) => s.user);
  const authChecked = useStore((s) => s.authChecked);
  const [folders, setFolders] = useState<FolderOut[]>([]);
  const [systems, setSystems] = useState<SystemMeta[]>([]);
  const [filter, setFilter] = useState<number | "all" | null>("all");
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const store = useStore.getState;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([api.folders(), api.systems()]);
      setFolders(f);
      setSystems(s);
    } catch (e) {
      store().toast(e instanceof ApiError ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) reload();
  }, [user, reload]);

  if (authChecked && !user) return <Navigate to="/login?next=/library" replace />;

  const shown = systems.filter((s) =>
    filter === "all" ? true : filter === null ? s.folder_id === null : s.folder_id === filter,
  );
  const currentFolder = typeof filter === "number" ? folders.find((f) => f.id === filter) : null;

  const open = async (meta: SystemMeta) => {
    const full = await api.getSystem(meta.id);
    store().loadDoc(full.data, full.id, full.folder_id);
    store().toast("« " + full.title + " » ouvert.");
    navigate("/");
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    await api.createFolder(name);
    setNewFolderName("");
    reload();
  };

  const copyShare = async (meta: SystemMeta) => {
    let token = meta.share_token;
    if (!token) {
      const updated = await api.enableShare(meta.id);
      token = updated.share_token;
      reload();
    }
    const url = `${location.origin}/app/s/${token}`;
    await navigator.clipboard?.writeText(url);
    store().toast("Lien de partage copié !");
  };

  return (
    <div className="app-root page-bg">
      <Navbar />
      <div className="page library-page">
        <aside className="folder-pane">
          <h2>Dossiers</h2>
          <button className={"folder-item" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>
            Tous les systèmes <span className="count">{systems.length}</span>
          </button>
          <button className={"folder-item" + (filter === null ? " active" : "")} onClick={() => setFilter(null)}>
            Sans dossier <span className="count">{systems.filter((s) => s.folder_id === null).length}</span>
          </button>
          {folders.map((f) =>
            renaming === f.id ? (
              <form
                key={f.id}
                className="folder-rename"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (renameValue.trim()) await api.renameFolder(f.id, renameValue.trim());
                  setRenaming(null);
                  reload();
                }}
              >
                <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => setRenaming(null)} />
              </form>
            ) : (
              <button
                key={f.id}
                className={"folder-item" + (filter === f.id ? " active" : "")}
                onClick={() => setFilter(f.id)}
                onDoubleClick={() => {
                  setRenaming(f.id);
                  setRenameValue(f.name);
                }}
                title="Double-clic pour renommer"
              >
                📁 {f.name} <span className="count">{f.systems_count}</span>
              </button>
            ),
          )}
          <form className="folder-new" onSubmit={createFolder}>
            <input
              placeholder="Nouveau dossier…"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <button className="btn small" type="submit" disabled={!newFolderName.trim()}>
              +
            </button>
          </form>
          {currentFolder && (
            <button
              className="folder-delete"
              onClick={async () => {
                await api.deleteFolder(currentFolder.id);
                setFilter("all");
                reload();
                store().toast("Dossier supprimé (systèmes conservés).");
              }}
            >
              Supprimer « {currentFolder.name} »
            </button>
          )}
        </aside>

        <main className="library-main">
          <div className="library-head">
            <h1>{filter === "all" ? "Ma bibliothèque" : filter === null ? "Sans dossier" : currentFolder?.name}</h1>
            <button className="btn primary" onClick={() => { store().newDoc(); navigate("/"); }}>
              + Nouveau système
            </button>
          </div>
          {loading ? (
            <p className="empty">Chargement…</p>
          ) : shown.length === 0 ? (
            <p className="empty">
              Aucun système ici. Crée un système dans l'éditeur puis clique sur « Enregistrer sur mon compte ».
            </p>
          ) : (
            <div className="sys-grid">
              {shown.map((s) => (
                <div key={s.id} className="sys-card">
                  <button className="sys-open" onClick={() => open(s)} title="Ouvrir dans l'éditeur">
                    <b>{s.title}</b>
                    <small>
                      Modifié le{" "}
                      {new Date(s.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      {s.share_token ? " · 🔗 partagé" : ""}
                    </small>
                  </button>
                  <div className="sys-actions">
                    <select
                      value={s.folder_id ?? ""}
                      title="Ranger dans un dossier"
                      onChange={async (e) => {
                        const folderId = e.target.value === "" ? null : parseInt(e.target.value);
                        const full = await api.getSystem(s.id);
                        await api.updateSystem(s.id, full.title, full.data, folderId);
                        if (store().systemId === s.id) store().markSaved(s.id, folderId);
                        reload();
                      }}
                    >
                      <option value="">Sans dossier</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <button className="btn small" onClick={() => copyShare(s)} title="Copier le lien de partage">
                      🔗
                    </button>
                    {confirmDelete === s.id ? (
                      <button
                        className="btn small danger"
                        onClick={async () => {
                          await api.deleteSystem(s.id);
                          if (store().systemId === s.id) store().markSaved(0, null);
                          setConfirmDelete(null);
                          reload();
                        }}
                      >
                        Confirmer
                      </button>
                    ) : (
                      <button className="btn small" title="Supprimer" onClick={() => setConfirmDelete(s.id)}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <Toasts />
    </div>
  );
}
