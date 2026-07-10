/** Store zustand : document, sélection, utilisateur, undo, autosave invité. */
import { create } from "zustand";
import type { User } from "./api";
import { clamp } from "./engine/geometry";
import {
  applySituation as applySituationModel,
  defaultDoc,
  isValidDoc,
  makePhase,
  normalizeDoc,
} from "./engine/model";
import type { SystemDoc } from "./engine/types";
import { rt } from "./runtime";

const LS_KEY = "bballcoach";
const undoStack: string[] = [];

export interface Toast {
  id: number;
  msg: string;
}

interface Store {
  doc: SystemDoc;
  version: number; // incrémenté à chaque mutation structurelle (re-render listes)
  sel: number;
  user: User | null;
  authChecked: boolean;
  systemId: number | null; // id du système chargé depuis le compte
  folderId: number | null;
  dirty: boolean;
  sidebarHidden: boolean;
  toasts: Toast[];
  modal: string | null; // 'auth' | 'library' | 'share' | 'new' | null

  bump: (opts?: { dirty?: boolean }) => void;
  setSel: (i: number) => void;
  setUser: (u: User | null) => void;
  setModal: (m: string | null) => void;
  toast: (msg: string) => void;
  toggleSidebar: () => void;

  pushUndo: () => void;
  undo: () => void;

  newDoc: () => void;
  loadDoc: (doc: SystemDoc, systemId?: number | null, folderId?: number | null) => void;
  markSaved: (systemId: number, folderId: number | null) => void;

  addPhase: () => void;
  duplicatePhase: (i: number) => void;
  deletePhase: (i: number) => void;
  movePhase: (i: number, dir: number) => void;
  applySituation: (key: string) => void;
}

let toastId = 0;

export function saveLocal(doc: SystemDoc): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(doc));
  } catch {
    /* stockage indisponible */
  }
}

export function loadLocal(): SystemDoc | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (isValidDoc(data)) return normalizeDoc(data);
  } catch {
    /* ignore */
  }
  return null;
}

export const useStore = create<Store>((set, get) => ({
  doc: loadLocal() ?? defaultDoc(),
  version: 0,
  sel: 0,
  user: null,
  authChecked: false,
  systemId: null,
  folderId: null,
  dirty: false,
  sidebarHidden: localStorage.getItem("bballcoach_sidebar") === "hidden",
  toasts: [],
  modal: null,

  bump: (opts) => {
    const { doc } = get();
    saveLocal(doc);
    set((s) => ({ version: s.version + 1, dirty: opts?.dirty !== false ? true : s.dirty }));
  },

  setSel: (i) => {
    rt.scrubbing = false;
    set({ sel: clamp(i, 0, get().doc.phases.length - 1) });
  },
  setUser: (u) => set({ user: u, authChecked: true }),
  setModal: (m) => set({ modal: m }),

  toast: (msg) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, msg }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2800);
  },

  toggleSidebar: () => {
    const hidden = !get().sidebarHidden;
    try {
      localStorage.setItem("bballcoach_sidebar", hidden ? "hidden" : "shown");
    } catch {
      /* ignore */
    }
    set({ sidebarHidden: hidden });
  },

  pushUndo: () => {
    undoStack.push(JSON.stringify(get().doc));
    if (undoStack.length > 60) undoStack.shift();
  },

  undo: () => {
    const raw = undoStack.pop();
    if (!raw) return;
    const doc = normalizeDoc(JSON.parse(raw));
    set((s) => ({ doc, sel: clamp(s.sel, 0, doc.phases.length - 1), version: s.version + 1, dirty: true }));
    saveLocal(doc);
  },

  newDoc: () => {
    undoStack.length = 0;
    rt.playT = 0;
    rt.scrubbing = false;
    const doc = defaultDoc();
    saveLocal(doc);
    set((s) => ({ doc, sel: 0, systemId: null, folderId: null, dirty: false, version: s.version + 1 }));
  },

  loadDoc: (doc, systemId = null, folderId = null) => {
    undoStack.length = 0;
    rt.playT = 0;
    rt.scrubbing = false;
    normalizeDoc(doc);
    saveLocal(doc);
    set((s) => ({ doc, sel: 0, systemId, folderId, dirty: false, version: s.version + 1 }));
  },

  markSaved: (systemId, folderId) => set({ systemId, folderId, dirty: false }),

  addPhase: () => {
    const { doc, pushUndo, bump } = get();
    pushUndo();
    const last = doc.phases[doc.phases.length - 1];
    const ph = makePhase(last, doc.phases.length + 1);
    if (last.ball === "shot") ph.ball = "a1";
    doc.phases.push(ph);
    set({ sel: doc.phases.length - 1 });
    bump();
  },

  duplicatePhase: (i) => {
    const { doc, pushUndo, bump } = get();
    pushUndo();
    const copy = JSON.parse(JSON.stringify(doc.phases[i]));
    copy.name += " (copie)";
    doc.phases.splice(i + 1, 0, copy);
    set({ sel: i + 1 });
    bump();
  },

  deletePhase: (i) => {
    const { doc, pushUndo, bump, toast } = get();
    if (doc.phases.length === 1) {
      toast("Impossible : il faut au moins une phase.");
      return;
    }
    pushUndo();
    doc.phases.splice(i, 1);
    set((s) => ({ sel: clamp(s.sel, 0, doc.phases.length - 1) }));
    bump();
  },

  movePhase: (i, dir) => {
    const { doc, pushUndo, bump } = get();
    const j = i + dir;
    if (j < 0 || j >= doc.phases.length) return;
    pushUndo();
    const [ph] = doc.phases.splice(i, 1);
    doc.phases.splice(j, 0, ph);
    set({ sel: j });
    bump();
  },

  applySituation: (key) => {
    const { doc, pushUndo, bump, toast } = get();
    if (!key) return;
    pushUndo();
    applySituationModel(doc, key);
    set({ sel: 0 });
    rt.scrubbing = false;
    bump();
    toast("Situation appliquée.");
  },
}));
