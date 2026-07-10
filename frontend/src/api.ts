/** Client API (sessions par cookie httpOnly). */
import type { SystemDoc } from "./engine/types";

export interface User {
  id: number;
  email: string;
}

export interface FolderOut {
  id: number;
  name: string;
  systems_count: number;
}

export interface SystemMeta {
  id: number;
  title: string;
  folder_id: number | null;
  share_token: string | null;
  updated_at: string;
}

export interface SystemOut extends SystemMeta {
  data: SystemDoc;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = "Erreur " + res.status;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      /* réponse non JSON */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

export const api = {
  register: (email: string, password: string) => call<User>("POST", "/api/auth/register", { email, password }),
  login: (email: string, password: string) => call<User>("POST", "/api/auth/login", { email, password }),
  logout: () => call<{ ok: boolean }>("POST", "/api/auth/logout"),
  me: () => call<User>("GET", "/api/auth/me"),
  changePassword: (current: string, next: string) =>
    call<{ ok: boolean }>("POST", "/api/auth/password", { current, new: next }),

  folders: () => call<FolderOut[]>("GET", "/api/folders"),
  createFolder: (name: string) => call<FolderOut>("POST", "/api/folders", { name }),
  renameFolder: (id: number, name: string) => call<FolderOut>("PATCH", `/api/folders/${id}`, { name }),
  deleteFolder: (id: number) => call<{ ok: boolean }>("DELETE", `/api/folders/${id}`),

  systems: () => call<SystemMeta[]>("GET", "/api/systems"),
  createSystem: (title: string, data: SystemDoc, folder_id: number | null) =>
    call<SystemOut>("POST", "/api/systems", { title, data, folder_id }),
  getSystem: (id: number) => call<SystemOut>("GET", `/api/systems/${id}`),
  updateSystem: (id: number, title: string, data: SystemDoc, folder_id: number | null) =>
    call<SystemOut>("PUT", `/api/systems/${id}`, { title, data, folder_id }),
  deleteSystem: (id: number) => call<{ ok: boolean }>("DELETE", `/api/systems/${id}`),

  enableShare: (id: number) => call<SystemMeta>("POST", `/api/systems/${id}/share`),
  disableShare: (id: number) => call<SystemMeta>("DELETE", `/api/systems/${id}/share`),
  shared: (token: string) => call<{ title: string; data: SystemDoc }>("GET", `/api/shared/${token}`),
};
