/** Bibliothèque : dossiers, recherche et cartes avec aperçu du terrain. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError, type FolderOut, type SystemOut } from "../api";
import {
  IconBall, IconFolder, IconGrid, IconInbox, IconLink, IconPlus, IconSearch, IconTrash,
} from "../components/Icons";
import { Toasts } from "../components/Modals";
import Navbar from "../components/Navbar";
import { normalizeDoc } from "../engine/model";
import { renderPreview } from "../exports";
import { useStore } from "../store";

export default function Library() {
  const user = useStore((s) => s.user);
  const authChecked = useStore((s) => s.authChecked);
  const [folders, setFolders] = useState<FolderOut[]>([]);
  const [systems, setSystems] = useState<SystemOut[]>([]);
  const [filter, setFilter] = useState<number | "all" | null>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const navigate = useNavigate();
  const store = useStore.getState;

  const reload = useCallback(async () => {
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

  // aperçus du terrain (première phase), rendus par le moteur
  const thumbs = useMemo(() => {
    const map = new Map<number, string>();
    systems.forEach((s) => {
      try {
        map.set(s.id, renderPreview(normalizeDoc(structuredClone(s.data))));
      } catch {
        /* aperçu indisponible */
      }
    });
    return map;
  }, [systems]);

  if (authChecked && !user) return <Navigate to="/login?next=/library" replace />;

  const q = search.trim().toLowerCase();
  const shown = systems
    .filter((s) => (filter === "all" ? true : filter === null ? s.folder_id === null : s.folder_id === filter))
    .filter((s) => !q || s.title.toLowerCase().includes(q));
  const currentFolder = typeof filter === "number" ? folders.find((f) => f.id === filter) : null;

  const open = (s: SystemOut) => {
    store().loadDoc(normalizeDoc(structuredClone(s.data)), s.id, s.folder_id);
    store().toast("« " + s.title + " » ouvert.");
    navigate("/");
  };

  const copyShare = async (s: SystemOut) => {
    let token = s.share_token;
    if (!token) {
      const updated = await api.enableShare(s.id);
      token = updated.share_token;
      reload();
    }
    await navigator.clipboard?.writeText(`${location.origin}/app/s/${token}`);
    store().toast("Lien de partage copié !");
  };

  return (
    <div className="app-root page-bg">
      <Navbar />
      <div className="page library-page">
        <aside className="folder-pane">
          <h2>Dossiers</h2>
          <button className={"folder-item" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>
            <span className="fi-label"><IconGrid /> Tous les systèmes</span>
            <span className="count">{systems.length}</span>
          </button>
          <button className={"folder-item" + (filter === null ? " active" : "")} onClick={() => setFilter(null)}>
            <span className="fi-label"><IconInbox /> Sans dossier</span>
            <span className="count">{systems.filter((s) => s.folder_id === null).length}</span>
          </button>
          <div className="folder-sep" />
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
                <span className="fi-label"><IconFolder /> {f.name}</span>
                <span className="count">{f.systems_count}</span>
              </button>
            ),
          )}
          <form className="folder-new" onSubmit={async (e) => {
            e.preventDefault();
            const name = newFolderName.trim();
            if (!name) return;
            await api.createFolder(name);
            setNewFolderName("");
            reload();
          }}>
            <input placeholder="Nouveau dossier…" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
            <button className="btn small" type="submit" disabled={!newFolderName.trim()} title="Créer le dossier">
              <IconPlus />
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
              <IconTrash size={13} /> Supprimer « {currentFolder.name} »
            </button>
          )}
        </aside>

        <main className="library-main">
          <div className="library-head">
            <h1>{filter === "all" ? "Ma bibliothèque" : filter === null ? "Sans dossier" : currentFolder?.name}</h1>
            <div className="search-box">
              <IconSearch />
              <input placeholder="Rechercher un système…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn primary" onClick={() => { store().newDoc(); navigate("/"); }}>
              <IconPlus /> Nouveau système
            </button>
          </div>

          {loading ? (
            <div className="sys-grid">
              {[0, 1, 2].map((i) => (
                <div key={i} className="sys-card skeleton" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><IconBall size={44} /></div>
              {q ? (
                <>
                  <h3>Aucun résultat pour « {search} »</h3>
                  <p>Essaie un autre nom, ou efface la recherche.</p>
                </>
              ) : (
                <>
                  <h3>Aucun système ici</h3>
                  <p>Dessine ton premier système dans l'éditeur puis clique sur « Enregistrer sur mon compte ».</p>
                  <button className="btn primary" onClick={() => { store().newDoc(); navigate("/"); }}>
                    <IconPlus /> Créer un système
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="sys-grid">
              {shown.map((s) => (
                <div key={s.id} className="sys-card">
                  <button className="sys-thumb" onClick={() => open(s)} title="Ouvrir dans l'éditeur">
                    {thumbs.get(s.id) ? (
                      <img src={thumbs.get(s.id)} alt="" loading="lazy" />
                    ) : (
                      <div className="thumb-fallback"><IconBall size={30} /></div>
                    )}
                    <span className="thumb-hover">Ouvrir</span>
                  </button>
                  <div className="sys-body">
                    <button className="sys-title" onClick={() => open(s)}>
                      {s.title}
                    </button>
                    <div className="sys-meta">
                      <span>
                        {s.data.phases.length} phase{s.data.phases.length > 1 ? "s" : ""} ·{" "}
                        {new Date(s.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                      {s.share_token && <span className="badge-shared"><IconLink size={11} /> partagé</span>}
                    </div>
                    <div className="sys-actions">
                      <select
                        value={s.folder_id ?? ""}
                        title="Ranger dans un dossier"
                        onChange={async (e) => {
                          const folderId = e.target.value === "" ? null : parseInt(e.target.value);
                          await api.updateSystem(s.id, s.title, s.data, folderId);
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
                      <button
                        className={"btn icon-only" + (s.share_token ? " shared" : "")}
                        onClick={() => copyShare(s)}
                        title={s.share_token ? "Copier le lien de partage" : "Générer et copier un lien de partage"}
                      >
                        <IconLink />
                      </button>
                      {confirmDelete === s.id ? (
                        <button
                          className="btn small danger"
                          onBlur={() => setConfirmDelete(null)}
                          onClick={async () => {
                            await api.deleteSystem(s.id);
                            if (store().systemId === s.id) store().markSaved(0, null);
                            setConfirmDelete(null);
                            reload();
                            store().toast("Système supprimé.");
                          }}
                        >
                          Confirmer
                        </button>
                      ) : (
                        <button className="btn icon-only" title="Supprimer" onClick={() => setConfirmDelete(s.id)}>
                          <IconTrash />
                        </button>
                      )}
                    </div>
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
