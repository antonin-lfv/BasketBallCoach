/** Types et constantes du moteur. Coordonnées en mètres, terrain FIBA 28x15. */

export interface Pt {
  x: number;
  y: number;
}

export interface Screen {
  s: string; // poseur (attaquant)
  d: string; // défenseur
}

export interface Phase {
  name: string;
  duration: number;
  ball: string; // 'a1'..'a5' | 'd1'..'d5' | 'shot'
  pos: Record<string, Pt>;
  screens: Screen[];
  via: Record<string, Pt[]>; // points de passage (trajectoires courbes)
}

export type CourtMode = "half" | "full";

export interface SystemDoc {
  app: "basketballcoach-web";
  version: 1;
  title: string;
  courtMode: CourtMode;
  defenders: number; // 0..5
  situation?: string;
  phases: Phase[];
}

export const COURT = { W: 28, H: 15, HALF: 14, M: 1.1 };
export const HOOP_L: Pt = { x: 1.575, y: 7.5 };
export const HOOP_R: Pt = { x: 26.425, y: 7.5 };
export const R_PLAYER = 0.42;
export const R_BALL = 0.23;
export const BALL_OFF: Pt = { x: 0.42, y: -0.34 };
export const ATT_IDS = ["a1", "a2", "a3", "a4", "a5"] as const;
export const DEF_IDS = ["d1", "d2", "d3", "d4", "d5"] as const;
export const ALL_IDS = [...ATT_IDS, ...DEF_IDS];
export const START_HOLD = 0.5;
export const END_HOLD = 0.8;

export const COLORS = {
  attacker: "#15803d",
  defender: "#dc2626",
  ball: "#f97316",
  ballEdge: "#7c2d12",
  floor: "#efdcbd",
  floorOut: "#e2c99f",
  line: "#8a5a2b",
  key: "#e4bd8c",
};
