/** Modales : nouveau système, connexion/inscription, partage. Toasts. */
import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { exportJSON } from "../exports";
import { useStore } from "../store";

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div id="toastZone">
      {toasts.map((t) => (
        <div key={t.id} className="toast show">
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      id="modalOverlay"
      className="show"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === "modalOverlay") onClose();
      }}
    >
      <div className="modal-box">{children}</div>
    </div>
  );
}

export function NewDocModal() {
  const store = useStore.getState;
  const close = () => store().setModal(null);
  return (
    <Overlay onClose={close}>
      <h3>Nouveau système</h3>
      <p>Le système actuel sera remplacé. Pense à l'exporter ou à l'enregistrer si tu veux le conserver.</p>
      <div className="modal-btns">
        <button className="btn" onClick={close}>Annuler</button>
        <button
          className="btn"
          onClick={() => {
            exportJSON(store().doc);
            setTimeout(() => {
              store().newDoc();
              close();
            }, 400);
          }}
        >
          Exporter puis créer
        </button>
        <button
          className="btn primary"
          onClick={() => {
            store().newDoc();
            close();
          }}
        >
          Créer
        </button>
      </div>
    </Overlay>
  );
}

export function ShareModal() {
  const systemId = useStore((s) => s.systemId);
  const dirty = useStore((s) => s.dirty);
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const store = useStore.getState;
  const close = () => store().setModal(null);

  useEffect(() => {
    if (!systemId) {
      setLoaded(true);
      return;
    }
    api
      .systems()
      .then((list) => setToken(list.find((s) => s.id === systemId)?.share_token ?? null))
      .finally(() => setLoaded(true));
  }, [systemId]);

  const shareUrl = token ? `${location.origin}/app/s/${token}` : null;

  return (
    <Overlay onClose={close}>
      <h3>Partager en lecture seule</h3>
      {!systemId ? (
        <>
          <p>Enregistre d'abord ce système sur ton compte (bouton 💾), puis reviens ici pour générer un lien.</p>
          <div className="modal-btns">
            <button className="btn primary" onClick={close}>Compris</button>
          </div>
        </>
      ) : !loaded ? (
        <p>Chargement…</p>
      ) : (
        <>
          <p>
            Toute personne disposant du lien peut regarder l'animation (sans compte, sans pouvoir modifier).
            {dirty && " Pense à enregistrer tes dernières modifications."}
          </p>
          {shareUrl ? (
            <>
              <div className="share-url">{shareUrl}</div>
              <div className="modal-btns">
                <button
                  className="btn"
                  onClick={async () => {
                    await api.disableShare(systemId);
                    setToken(null);
                    store().toast("Lien révoqué.");
                  }}
                >
                  Révoquer le lien
                </button>
                <button
                  className="btn primary"
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    store().toast("Lien copié !");
                  }}
                >
                  Copier le lien
                </button>
              </div>
            </>
          ) : (
            <div className="modal-btns">
              <button className="btn" onClick={close}>Fermer</button>
              <button
                className="btn primary"
                onClick={async () => {
                  const meta = await api.enableShare(systemId);
                  setToken(meta.share_token);
                  store().toast("Lien de partage créé.");
                }}
              >
                Générer un lien
              </button>
            </div>
          )}
        </>
      )}
    </Overlay>
  );
}
