import { FormEvent, useState } from "react";
import { api, errMsg } from "../api";
import { useAuth } from "../store";

export default function Login() {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = useAuth((s) => s.set);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const { data } = await api.post("/auth/login", new URLSearchParams({ username: u, password: p }));
      set(data.access_token, data.role, data.refresh_token);
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={submit} className="bg-white w-full max-w-sm p-8 rounded-lg border border-ink/10 space-y-4">
        <h1 className="text-2xl font-bold">Sign in to RestaurantPOS</h1>
        <label className="block text-sm">Username<input className="mt-1 w-full border rounded px-3 py-2" value={u} onChange={(e) => setU(e.target.value)} required autoFocus /></label>
        <label className="block text-sm">Password<input type="password" className="mt-1 w-full border rounded px-3 py-2" value={p} onChange={(e) => setP(e.target.value)} required /></label>
        {err && <p role="alert" className="text-chili text-sm">{err}</p>}
        <button disabled={busy} className="w-full bg-teal-700 text-white py-2 rounded font-semibold disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
