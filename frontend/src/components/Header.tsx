/** En-tête : sidebar, titre, enregistrement, bibliothèque, partage, menu, compte. */
import { useRef, useState } from "react";
import { api, ApiError } from "../api";
import { isValidDoc, normalizeDoc } from "../engine/model";
import type { SystemDoc } from "../engine/types";
import { exportBoard, exportImages, exportJSON, readJSONFile, startVideoExport } from "../exports";
import { useStore } from "../store";

export default function Header() {
  const doc = useStore((s) => s.doc);
  const version = useStore((s) => s.version);
  const user = useStore((s) => s.user);
  const dirty = useStore((s) => s.dirty);
  const systemId = useStore((s) => s.systemId);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const store = useStore.getState;
  void version;

  const save = async () => {
    const st = store();
    if (!st.user) {
      st.setModal("auth");
      return;
    }
    try {
      if (st.systemId) {
        await api.updateSystem(st.systemId, st.doc.title, st.doc, st.folderId);
        st.markSaved(st.systemId, st.folderId);
      } else {
        const s = await api.createSystem(st.doc.title, st.doc, null);
        st.markSaved(s.id, s.folder_id);
      }
      st.toast("💾 Enregistré sur ton compte.");
    } catch (e) {
      st.toast(e instanceof ApiError ? e.message : "Erreur d'enregistrement.");
    }
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const st = store();
    try {
      const data = await readJSONFile(file);
      if (!isValidDoc(data)) {
        st.toast("Fichier non reconnu (exporte depuis cette application).");
        return;
      }
      st.loadDoc(normalizeDoc(data as SystemDoc));
      st.toast("Système « " + (data as SystemDoc).title + " » importé.");
    } catch {
      st.toast("Erreur de lecture du fichier JSON.");
    }
  };

  const menu = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <header>
      <button className="btn" id="sidebarBtn" title="Afficher / masquer le panneau" onClick={() => store().toggleSidebar()}>
        ◧
      </button>
      <a href="/" className="brand-link" title="Retour à la page d'accueil">
        <span className="logo">🏀</span>
        <span className="brand">BasketballCoach</span>
      </a>
      <input
        id="titleInput"
        defaultValue={doc.title}
        key={"title-" + useStore.getState().systemId + "-" + doc.title}
        spellCheck={false}
        onChange={(e) => {
          doc.title = e.target.value;
          store().bump();
        }}
      />
      <span className="spacer" />
      <button className={"btn" + (dirty ? " attention" : "")} onClick={save} title={systemId ? "Mettre à jour sur ton compte" : "Enregistrer sur ton compte"}>
        💾 Enregistrer{dirty ? " •" : ""}
      </button>
      <button
        className="btn"
        onClick={() => {
          const st = store();
          if (!st.user) st.setModal("auth");
          else st.setModal("library");
        }}
      >
        📚 Bibliothèque
      </button>
      <button
        className="btn"
        onClick={() => {
          const st = store();
          if (!st.user) st.setModal("auth");
          else st.setModal("share");
        }}
      >
        🔗 Partager
      </button>
      <button className="btn" onClick={() => store().setModal("new")}>
        Nouveau
      </button>
      <div id="menuWrap">
        <button className="btn" title="Menu" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
          ☰
        </button>
        {menuOpen && (
          <div id="menuList" className="show" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={menu(() => fileRef.current?.click())}>📂 Importer JSON</button>
            <button onClick={menu(() => { exportJSON(doc); store().toast("Système exporté en JSON."); })}>💾 Exporter JSON</button>
            <button onClick={menu(async () => { const n = await exportImages(doc); store().toast(n + " image(s) exportée(s)."); })}>
              🖼 Exporter les images (PNG)
            </button>
            <button onClick={menu(() => { if (!exportBoard(doc)) store().toast("Autorise les fenêtres popup pour générer la planche."); })}>
              🖨 Planche imprimable / PDF
            </button>
            <button
              onClick={menu(() => {
                const cv = document.querySelector<HTMLCanvasElement>("#canvasWrap canvas");
                if (!cv) return;
                const err = startVideoExport(cv, doc);
                if (err) store().toast(err);
              })}
            >
              🎥 Exporter la vidéo
            </button>
            <hr />
            {user ? (
              <>
                <div className="menu-user">{user.email}</div>
                <button
                  onClick={menu(async () => {
                    await api.logout();
                    store().setUser(null);
                    store().toast("Déconnecté.");
                  })}
                >
                  Se déconnecter
                </button>
              </>
            ) : (
              <button onClick={menu(() => store().setModal("auth"))}>Se connecter / créer un compte</button>
            )}
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          onImport(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </header>
  );
}
