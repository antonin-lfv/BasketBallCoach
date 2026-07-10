/** Barre d'outils de l'éditeur : titre du système, enregistrement, partage, exports. */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { isValidDoc, normalizeDoc } from "../engine/model";
import type { SystemDoc } from "../engine/types";
import { exportBoard, exportImages, exportJSON, readJSONFile, startVideoExport } from "../exports";
import { useStore } from "../store";

export default function Toolbar() {
  const doc = useStore((s) => s.doc);
  const dirty = useStore((s) => s.dirty);
  const systemId = useStore((s) => s.systemId);
  const version = useStore((s) => s.version);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const store = useStore.getState;
  void version;

  const save = async () => {
    const st = store();
    if (!st.user) {
      navigate("/login?next=/");
      return;
    }
    setSaving(true);
    try {
      if (st.systemId) {
        await api.updateSystem(st.systemId, st.doc.title, st.doc, st.folderId);
        st.markSaved(st.systemId, st.folderId);
      } else {
        const s = await api.createSystem(st.doc.title, st.doc, null);
        st.markSaved(s.id, s.folder_id);
      }
      st.toast("Enregistré sur ton compte.");
    } catch (e) {
      st.toast(e instanceof ApiError ? e.message : "Erreur d'enregistrement.");
    } finally {
      setSaving(false);
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
    <div className="toolbar">
      <button className="btn icon" title="Afficher / masquer le panneau" onClick={() => store().toggleSidebar()}>
        ◧
      </button>
      <input
        id="titleInput"
        key={"t" + systemId + doc.title}
        defaultValue={doc.title}
        spellCheck={false}
        placeholder="Nom du système"
        onChange={(e) => {
          doc.title = e.target.value;
          store().bump();
        }}
      />
      {dirty && <span className="dirty-dot" title="Modifications non enregistrées" />}
      <span className="spacer" />
      <button className="btn primary" onClick={save} disabled={saving} title={systemId ? "Mettre à jour" : "Enregistrer sur ton compte"}>
        {saving ? "…" : systemId ? "Enregistrer" : "Enregistrer sur mon compte"}
      </button>
      <button
        className="btn"
        onClick={() => {
          if (!store().user) navigate("/login?next=/");
          else store().setModal("share");
        }}
      >
        Partager
      </button>
      <button className="btn" onClick={() => store().setModal("new")}>
        Nouveau
      </button>
      <div id="menuWrap">
        <button
          className="btn"
          title="Imports et exports"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
        >
          Exporter ▾
        </button>
        {menuOpen && (
          <div id="menuList" className="show" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={menu(() => fileRef.current?.click())}>📂 Importer JSON</button>
            <button onClick={menu(() => { exportJSON(doc); store().toast("Système exporté en JSON."); })}>💾 Exporter JSON</button>
            <button onClick={menu(async () => { const n = await exportImages(doc); store().toast(n + " image(s) exportée(s)."); })}>
              🖼 Images (PNG par phase)
            </button>
            <button onClick={menu(() => { if (!exportBoard(doc)) store().toast("Autorise les fenêtres popup pour la planche."); })}>
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
              🎥 Vidéo (MP4/WebM)
            </button>
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
    </div>
  );
}
