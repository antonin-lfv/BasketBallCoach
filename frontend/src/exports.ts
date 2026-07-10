/** Exports : JSON, images par phase, planche imprimable, vidéo. */
import { COURT, type SystemDoc } from "./engine/types";
import { totalDuration } from "./engine/sampler";
import { renderScene } from "./render/scene";
import { rt, rtEmit, setPlaying } from "./runtime";

export function slug(s: string): string {
  return (
    (s || "systeme")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "systeme"
  );
}

export function downloadBlob(blob: Blob, name: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function exportJSON(doc: SystemDoc): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  downloadBlob(blob, slug(doc.title) + ".json");
}

export function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch {
        reject(new Error("JSON invalide"));
      }
    };
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.readAsText(file);
  });
}

/** Canvas hors écran cadré sur le terrain seul, haute résolution. */
function exportCanvas(doc: SystemDoc): HTMLCanvasElement {
  const half = doc.courtMode === "half";
  const M = 0.8;
  const scale = half ? 95 : 85;
  const cv = document.createElement("canvas");
  cv.width = Math.round(((half ? COURT.H : COURT.W) + 2 * M) * scale);
  cv.height = Math.round(((half ? COURT.HALF : COURT.H) + 2 * M) * scale);
  return cv;
}

/** Aperçu (dataURL) de la première phase, pour les vignettes de la bibliothèque. */
export function renderPreview(doc: SystemDoc, phase = 0): string {
  const half = doc.courtMode === "half";
  const M = 0.6;
  const scale = half ? 26 : 18;
  const cv = document.createElement("canvas");
  cv.width = Math.round(((half ? COURT.H : COURT.W) + 2 * M) * scale);
  cv.height = Math.round(((half ? COURT.HALF : COURT.H) + 2 * M) * scale);
  renderScene(cv, doc, {
    sel: Math.min(phase, doc.phases.length - 1),
    playT: 0,
    playingView: false,
    exportMode: true,
    cleanExport: true,
    margin: M,
  });
  return cv.toDataURL("image/png");
}

function renderPhasePng(doc: SystemDoc, i: number, clean: boolean): Promise<Blob | null> {
  const cv = exportCanvas(doc);
  renderScene(cv, doc, {
    sel: i, playT: 0, playingView: false,
    exportMode: true, cleanExport: clean, margin: 0.8,
  });
  return new Promise((r) => cv.toBlob(r, "image/png"));
}

export async function exportImages(doc: SystemDoc): Promise<number> {
  const base = slug(doc.title);
  for (let i = 0; i < doc.phases.length; i++) {
    const blob = await renderPhasePng(doc, i, false);
    if (blob) downloadBlob(blob, base + "-phase-" + String(i + 1).padStart(2, "0") + ".png");
    await new Promise((r) => setTimeout(r, 350));
  }
  return doc.phases.length;
}

export function exportBoard(doc: SystemDoc): boolean {
  const cells = doc.phases.map((ph, i) => {
    const cv = exportCanvas(doc);
    renderScene(cv, doc, { sel: i, playT: 0, playingView: false, exportMode: true, cleanExport: true, margin: 0.8 });
    return {
      url: cv.toDataURL("image/png"),
      name: ph.name,
      ball: ph.ball === "shot" ? "tir au panier" : "ballon : " + (ph.ball[0] === "d" ? "défenseur " : "joueur ") + ph.ball[1],
    };
  });
  const w = window.open("", "_blank");
  if (!w) return false;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const cols = doc.courtMode === "half" ? "1fr 1fr" : "1fr";
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>${esc(doc.title)} — planche</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: ${cols}; gap: 14px; }
  figure { margin: 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
  img { width: 100%; display: block; }
  figcaption { padding: 6px 10px; font-size: 12px; color: #444; border-top: 1px solid #eee; }
  figcaption b { font-size: 13px; color: #111; }
  .hintbar { position: fixed; top: 8px; right: 8px; font-size: 12px; background: #eef2ff; border: 1px solid #c7d2fe; padding: 6px 10px; border-radius: 6px; }
  @page { margin: 12mm; }
  @media print { .hintbar { display: none; } body { margin: 0; } }
</style></head><body>
<div class="hintbar">Imprimer ou enregistrer en PDF : Cmd/Ctrl + P</div>
<h1>${esc(doc.title)}</h1>
<div class="sub">${cells.length} phase(s) — BasketballCoach</div>
<div class="grid">
${cells.map((c, i) => `<figure><img src="${c.url}"><figcaption><b>${i + 1}. ${esc(c.name)}</b> — ${c.ball}</figcaption></figure>`).join("\n")}
</div>
<scr` + `ipt>window.onload = () => setTimeout(() => window.print(), 400);</scr` + `ipt>
</body></html>`);
  w.document.close();
  return true;
}

/* ---------- Vidéo ---------- */

let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

export function startVideoExport(cv: HTMLCanvasElement, doc: SystemDoc): string | null {
  if (rt.recording) return null;
  if (doc.phases.length < 2) return "Ajoute au moins une deuxième phase avant d'exporter.";
  const stream = cv.captureStream(60);
  const mime = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"].find((m) =>
    MediaRecorder.isTypeSupported(m),
  );
  if (!mime) return "Ton navigateur ne permet pas l'enregistrement vidéo.";
  chunks = [];
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.onstop = () => {
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
    downloadBlob(new Blob(chunks, { type: mime }), slug(doc.title) + "." + ext);
  };
  rt.recording = true;
  rt.playT = 0;
  recorder.start();
  setPlaying(true, totalDuration(doc));
  rtEmit();
  return null;
}

/** Appelé par la boucle de rendu quand la lecture atteint la fin. */
export function finishVideoExport(): void {
  rt.recording = false;
  rtEmit();
  setTimeout(() => {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, 300);
}
