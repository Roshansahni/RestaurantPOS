import { create } from "zustand";
type S = { token: string | null; refresh: string | null; role: string | null; set: (t: string, r: string, rt: string) => void; logout: () => void };
export const useAuth = create<S>((set) => ({
  token: sessionStorage.getItem("token"), refresh: sessionStorage.getItem("refresh"), role: sessionStorage.getItem("role"),
  set: (t, r, rt) => { sessionStorage.setItem("token", t); sessionStorage.setItem("role", r); sessionStorage.setItem("refresh", rt); set({ token: t, role: r, refresh: rt }); },
  logout: () => { sessionStorage.clear(); set({ token: null, role: null, refresh: null }); },
}));
