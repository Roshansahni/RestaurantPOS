import axios from "axios";
import { useAuth } from "./store";

export const getBaseUrl = () => {
  try {
    if (typeof window !== "undefined") {
      const saved = window.localStorage?.getItem?.("pos_api_url");
      if (saved) return saved.replace(/\/$/, "");
      if (window.location?.hostname === "localhost" || window.location?.hostname === "127.0.0.1") {
        return import.meta.env.VITE_API_URL || "http://localhost:8010/api";
      }
    }
  } catch {}
  return import.meta.env.VITE_API_URL || "https://locally-steady-roles-bras.trycloudflare.com/api";
};

export const api = axios.create({ baseURL: getBaseUrl() });
api.interceptors.request.use((c) => {
  c.baseURL = getBaseUrl();
  const t = useAuth.getState().token;
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
let refreshing: Promise<string | null> | null = null;
async function doRefresh(): Promise<string | null> {
  const rt = useAuth.getState().refresh; if (!rt) return null;
  try {
    const r = await axios.post(`${getBaseUrl()}/auth/refresh`, { refresh_token: rt });
    useAuth.getState().set(r.data.access_token, r.data.role, r.data.refresh_token); return r.data.access_token;
  } catch { return null; }
}
api.interceptors.response.use((r) => r, async (e) => {
  const cfg = e.config;
  if (e.response?.status === 401 && cfg && !cfg._retried && !String(cfg.url).includes("/auth/")) {
    cfg._retried = true;
    refreshing ??= doRefresh().finally(() => { refreshing = null; });  // one refresh shared by concurrent requests
    const t = await refreshing;
    if (t) { cfg.headers.Authorization = `Bearer ${t}`; return api(cfg); }
    useAuth.getState().logout();
  }
  return Promise.reject(e);
});
export const errMsg = (e: any) => e?.response?.data?.detail?.toString?.() ?? "Something went wrong. Check the server is running.";
export let currency = "₹";
export const setCurrency = (c: string) => { currency = c || "₹"; };
export const inr = (n: number | string) => currency + Number(n).toFixed(2);
export const assetUrl = (p: string) => getBaseUrl().replace(/\/api$/, "") + p;
export async function download(path: string, name: string) {
  const r = await api.get(path, { responseType: "blob" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(r.data); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
export const wsUrl = () => getBaseUrl().replace(/^http/, "ws").replace(/\/api$/, "") + "/ws/kitchen";

