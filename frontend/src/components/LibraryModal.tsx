/** Bibliothèque : systèmes du compte, dossiers, ouverture, rangement, suppression. */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type FolderOut, type SystemMeta } from "../api";
import { useStore } from "../store";

export default function LibraryModal() {
  const [folders, setFolders] = useState<FolderOut[]>([]);
  const [systems, setSystems] = useState<SystemMeta[]>([]);
  const [filter, setFilter] = useState<number | "all" | null>("all");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const store = useStore.getState;
  const close = () => store().setModal(null);

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
    reload();
  }, [reload]);

  const shown = systems.filter((s) =>
    filter === "all" ? true : filter === null ? s.folder_id === null : s.folder_id === filter,
  );

  const open = async (meta: SystemMeta) => {
    const full = await api.getSystem(meta.id);
    store().loadDoc(full.data, full.id, full.folder_id);
    store().toast("« " + full.title + " » ouvert.");
    close();
  };

  const move = async (meta: SystemMeta, folderId: number | null) => {
    const full = await api.getSystem(meta.id);
    await api.updateSystem(meta.id, full.title, full.data, folderId);
    if (store().systemId === meta.id) store().markSaved(meta.id, folderId);
    reload();
  };

  const newFolder = async () => {
    const name = prompt("Nom du dossier :");
    if (!name?.trim()) return;
    await api.createFolder(name.trim());
    reload();
  };

  return (
    <div
      id="modalOverlay"
      className="show"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === "modalOverlay") close();
      }}
    >
      <div className="modal-box library">
        <h3>📚 Ma bibliothèque</h3>
        <div className="lib-filters">
          <button className={"chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>
            Tous ({systems.length})
          </button>
          <button className={"chip" + (filter === null ? " active" : "")} onClick={() => setFilter(null)}>
            Sans dossier
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className={"chip" + (filter === f.id ? " active" : "")}
              onClick={() => setFilter(f.id)}
              onDoubleClick={async () => {
                const name = prompt("Renommer le dossier :", f.name);
                if (name?.trim()) {
                  await api.renameFolder(f.id, name.trim());
                  reload();
                }
              }}
              title="Double-clic pour renommer"
            >
              📁 {f.name} ({f.systems_count})
            </button>
          ))}
          <button className="chip ghost" onClick={newFolder}>+ Dossier</button>
          {typeof filter === "number" && (
            <button
              className="chip danger"
              onClick={async () => {
                if (!confirm("Supprimer ce dossier ? Les systèmes qu'il contient seront conservés (sans dossier).")) return;
                await api.deleteFolder(filter);
                setFilter("all");
                reload();
              }}
            >
              Supprimer ce dossier
            </button>
          )}
        </div>

        {loading ? (
          <p>Chargement…</p>
        ) : shown.length === 0 ? (
          <p>Aucun système ici pour l'instant. Crée un système puis clique sur 💾 Enregistrer.</p>
        ) : (
          <div className="lib-list">
            {shown.map((s) => (
              <div key={s.id} className="lib-item">
                <div className="lib-main" onClick={() => open(s)}>
                  <b>{s.title}</b>
                  <small>
                    {new Date(s.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {s.share_token ? " · 🔗 partagé" : ""}
                  </small>
                </div>
                <select
                  value={s.folder_id ?? ""}
                  title="Ranger dans un dossier"
                  onChange={(e) => move(s, e.target.value === "" ? null : parseInt(e.target.value))}
                >
                  <option value="">Sans dossier</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
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
                    Confirmer ?
                  </button>
                ) : (
                  <button className="icon-btn" title="Supprimer" onClick={() => setConfirmDelete(s.id)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="modal-btns">
          <button className="btn" onClick={close}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
