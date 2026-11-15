import { FormEvent, useState } from "react";
import { api, errMsg, getBaseUrl } from "../api";
import { useAuth } from "../store";

export default function Login() {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("admin123");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [showServerSettings, setShowServerSettings] = useState(false);
  const set = useAuth((s) => s.set);

  async function handleLogin(username: string, pass: string) {
    setBusy(true); setErr("");
    try {
      const { data } = await api.post("/auth/login", new URLSearchParams({ username, password: pass }));
      set(data.access_token, data.role, data.refresh_token);
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    handleLogin(u, p);
  }

  function saveServerUrl() {
    localStorage.setItem("pos_api_url", serverUrl);
    window.location.reload();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-xl shadow-sm border border-slate-200 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sign in to RestaurantPOS</h1>
          <p className="text-sm text-slate-500 mt-1">Smart Restaurant Point of Sale & Management</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Username
            <input
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              value={u}
              onChange={(e) => setU(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              value={p}
              onChange={(e) => setP(e.target.value)}
              required
            />
          </label>

          {err && (
            <div role="alert" className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-teal-700 hover:bg-teal-800 text-white py-2.5 rounded-lg font-semibold transition disabled:opacity-60 shadow-sm"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">One-Click Demo Sign-in</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setU("admin"); setP("admin123"); handleLogin("admin", "admin123"); }}
              className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => { setU("cashier1"); setP("admin123"); handleLogin("cashier1", "admin123"); }}
              className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              💳 Cashier
            </button>
            <button
              type="button"
              onClick={() => { setU("kitchen1"); setP("admin123"); handleLogin("kitchen1", "admin123"); }}
              className="px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              🍳 Kitchen
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowServerSettings(!showServerSettings)}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            {showServerSettings ? "Hide API Server settings" : "⚙️ Change API Server URL"}
          </button>

          {showServerSettings && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
              <label className="block font-medium text-slate-700">
                Backend API Endpoint:
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded px-2 py-1 bg-white font-mono text-[11px]"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveServerUrl}
                  className="px-2.5 py-1 bg-teal-700 text-white rounded font-medium hover:bg-teal-800"
                >
                  Save & Reload
                </button>
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem("pos_api_url"); window.location.reload(); }}
                  className="px-2.5 py-1 border border-slate-300 rounded hover:bg-white text-slate-600"
                >
                  Reset Default
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

