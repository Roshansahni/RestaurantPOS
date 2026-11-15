import { FormEvent, useEffect, useState } from "react";
import { api, errMsg } from "../api";
import { useAuth } from "../store";

export default function Settings() {
  const admin = useAuth((s) => s.role) === "admin";
  const [s, setS] = useState<any>(null); const [users, setUsers] = useState<any[]>([]); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [pw, setPw] = useState({ old_password: "", new_password: "" }); const [nu, setNu] = useState({ username: "", full_name: "", password: "", role: "cashier" });
  const loadUsers = () => { if (admin) api.get("/users").then((r) => setUsers(r.data)).catch((e) => setErr(errMsg(e))); };
  useEffect(() => { api.get("/settings").then((r) => setS(r.data)).catch((e) => setErr(errMsg(e))); loadUsers(); }, []);
  const go = async (f: () => Promise<any>, done: string) => { try { await f(); setMsg(done); setErr(""); } catch (x) { setErr(errMsg(x)); setMsg(""); } };
  const inp = "border rounded px-3 py-2 w-full";
  return (
    <div className="p-4 grid lg:grid-cols-2 gap-4 items-start">
      {(err || msg) && <p role={err ? "alert" : "status"} className={`lg:col-span-2 ${err ? "text-chili" : "text-teal-700"}`}>{err || msg}</p>}
      {admin && s && <form onSubmit={(e: FormEvent) => { e.preventDefault(); go(() => api.put("/settings", s), "Restaurant details saved."); }} className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
        <h2 className="font-bold">Restaurant details</h2>
        {([["name", "Restaurant name"], ["address", "Address"], ["gstin", "GSTIN (15 characters)"], ["phone", "Phone"], ["receipt_footer", "Receipt footer"], ["currency_symbol", "Currency symbol"], ["gst_rates", "Allowed GST rates (comma separated, e.g. 0,5,12,18)"], ["default_gst_rate", "Default GST rate"]] as const).map(([k, l]) =>
          <label key={k} className="block text-sm">{l}<input className={inp} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>)}
        <button className="bg-teal-700 text-white px-4 py-2 rounded">Save details</button></form>}
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); go(() => api.post("/auth/password", pw).then(() => setPw({ old_password: "", new_password: "" })), "Password changed."); }} className="bg-white border border-ink/10 rounded-lg p-4 space-y-2">
        <h2 className="font-bold">Change password</h2>
        <input required type="password" aria-label="Current password" placeholder="Current password" className={inp} value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} />
        <input required minLength={8} type="password" aria-label="New password" placeholder="New password (8+ characters)" className={inp} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
        <button className="bg-teal-700 text-white px-4 py-2 rounded">Change password</button></form>
      {admin && <section className="bg-white border border-ink/10 rounded-lg p-4 space-y-2 lg:col-span-2"><h2 className="font-bold">Staff accounts</h2>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); go(() => api.post("/users", nu).then(() => { setNu({ username: "", full_name: "", password: "", role: "cashier" }); loadUsers(); }), "Account created."); }} className="flex gap-2 flex-wrap">
          <input required aria-label="Username" placeholder="Username" className="border rounded px-3 py-2" value={nu.username} onChange={(e) => setNu({ ...nu, username: e.target.value })} />
          <input required aria-label="Full name" placeholder="Full name" className="border rounded px-3 py-2" value={nu.full_name} onChange={(e) => setNu({ ...nu, full_name: e.target.value })} />
          <input required minLength={8} type="password" aria-label="Initial password" placeholder="Initial password" className="border rounded px-3 py-2" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} />
          <select aria-label="Role" className="border rounded px-3 py-2" value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>{["admin", "manager", "cashier", "kitchen"].map((r) => <option key={r}>{r}</option>)}</select>
          <button className="bg-teal-700 text-white px-4 rounded">Create account</button></form>
        <table className="w-full text-left"><tbody>{users.map((u) => <tr key={u.id} className="border-t"><td className="py-1">{u.username}</td><td>{u.full_name}</td><td>{u.role}</td>
          <td><button onClick={() => go(() => api.patch(`/users/${u.id}`, { active: !u.active }).then(loadUsers), u.active ? "Account deactivated." : "Account activated.")} className="underline">{u.active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></section>}
    </div>
  );
}
