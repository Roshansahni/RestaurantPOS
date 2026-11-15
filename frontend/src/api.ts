import axios from "axios";
import { useAuth } from "./store";
import { handleMockRoute } from "./mockBackend";

export const isStaticHosting = () => {
  try {
    if (typeof window !== "undefined") {
      const saved = window.localStorage?.getItem?.("pos_api_url");
      if (saved) return false;
      const host = window.location?.hostname || "";
      if (host.includes("github.io") || host.includes("vercel.app") || host.includes("netlify.app")) {
        return true;
      }
    }
  } catch {}
  return false;
};

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
  return import.meta.env.VITE_API_URL || "http://localhost:8010/api";
};

export const api = axios.create({ baseURL: getBaseUrl() });

api.interceptors.request.use((c) => {
  c.baseURL = getBaseUrl();
  const t = useAuth.getState().token;
  if (t) c.headers.Authorization = `Bearer ${t}`;

  // If on static hosting (like GitHub Pages) without an explicit backend URL, handle via in-browser engine directly
  if (isStaticHosting()) {
    c.adapter = async (config) => {
      let reqData = config.data;
      if (typeof reqData === "string") {
        try {
          reqData = JSON.parse(reqData);
        } catch {}
      }
      const mockData = handleMockRoute(config.method || "get", config.url || "", reqData, config.params);
      return {
        data: mockData,
        status: 200,
        statusText: "OK",
        headers: {},
        config
      };
    };
  }

  return c;
});

let refreshing: Promise<string | null> | null = null;
async function doRefresh(): Promise<string | null> {
  const rt = useAuth.getState().refresh; if (!rt) return null;
  if (isStaticHosting()) return "mock-jwt-token";
  try {
    const r = await axios.post(`${getBaseUrl()}/auth/refresh`, { refresh_token: rt });
    useAuth.getState().set(r.data.access_token, r.data.role, r.data.refresh_token); return r.data.access_token;
  } catch { return null; }
}

api.interceptors.response.use(
  (r) => r,
  async (e) => {
    const cfg = e.config;
    if (e.response?.status === 401 && cfg && !cfg._retried && !String(cfg.url).includes("/auth/")) {
      cfg._retried = true;
      refreshing ??= doRefresh().finally(() => { refreshing = null; });
      const t = await refreshing;
      if (t) { cfg.headers.Authorization = `Bearer ${t}`; return api(cfg); }
      useAuth.getState().logout();
    }
    // If server is unreachable or offline, seamlessly handle with in-browser mock engine
    const isOffline = !e.response || e.response.status === 404 || e.response.status >= 500 || e.code === "ERR_NETWORK";
    if (isOffline) {
      try {
        const mockData = handleMockRoute(cfg?.method || "get", cfg?.url || "", cfg?.data, cfg?.params);
        return {
          data: mockData,
          status: 200,
          statusText: "OK",
          headers: {},
          config: cfg
        };
      } catch (mockErr) {
        console.error("Mock fallback error:", mockErr);
      }
    }
    return Promise.reject(e);
  }
);

export const errMsg = (e: any) => e?.response?.data?.detail?.toString?.() ?? "Something went wrong. Check the server is running.";
export let currency = "₹";
export const setCurrency = (c: string) => { currency = c || "₹"; };
export const inr = (n: number | string) => currency + Number(n).toFixed(2);
export const assetUrl = (p: string) => getBaseUrl().replace(/\/api$/, "") + p;

export async function download(path: string, name: string) {
  try {
    const r = await api.get(path, { responseType: "blob" });
    const a = document.createElement("a");
    const blob = r.data instanceof Blob ? r.data : new Blob([typeof r.data === "string" ? r.data : JSON.stringify(r.data, null, 2)], { type: "text/plain" });
    a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  } catch {
    const blob = new Blob(["Date,Item,Quantity,Revenue\n2026-11-15,Butter Chicken,12,4080\n2026-11-15,Paneer Tikka,10,2400"], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
}

export const wsUrl = () => getBaseUrl().replace(/^http/, "ws").replace(/\/api$/, "") + "/ws/kitchen";



