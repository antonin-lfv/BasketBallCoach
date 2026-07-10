/** État de lecture/interaction muté à haute fréquence, hors React
    (le canvas le lit à chaque frame, la playbar s'y abonne). */

export interface DragState {
  id: string; // 'a1'.. | 'ball' | 'via'
  dx?: number;
  dy?: number;
  token?: string;
  k?: number;
}

export const rt = {
  playing: false,
  playT: 0,
  speed: 1,
  scrubbing: false,
  recording: false,
  dragging: null as DragState | null,
  dragBallPos: null as { x: number; y: number } | null,
  exportMode: false,
  cleanExport: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function rtSubscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function rtEmit(): void {
  listeners.forEach((fn) => fn());
}

export function setPlaying(v: boolean, total: number): void {
  rt.playing = v;
  if (v) {
    rt.scrubbing = false;
    if (rt.playT >= total - 0.01) rt.playT = 0;
  } else if (rt.playT > 0.01) {
    rt.scrubbing = true; // pause : figer la frame courante
  }
  rtEmit();
}
