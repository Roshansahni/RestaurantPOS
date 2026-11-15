import { useEffect, useState } from "react";
import { api, errMsg } from "../api";

export default function Audit() {
  const [rows, setRows] = useState<any[]>([]); const [err, setErr] = useState(""); const [q, setQ] = useState("");
  useEffect(() => { api.get("/audit", { params: { limit: 300 } }).then((r) => setRows(r.data)).catch((e) => setErr(errMsg(e))); }, []);
  const shown = rows.filter((r) => `${r.user} ${r.action} ${r.detail}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="p-4 space-y-3">
      <input aria-label="Filter audit log" placeholder="Filter by user, action or detail" className="border rounded px-3 py-2 w-full max-w-md" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p role="alert" className="text-chili">{err}</p>}
      {shown.length === 0 ? <p className="text-ink/60">No matching entries.</p> :
      <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><thead><tr className="border-b"><th className="p-2">Time</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody>{shown.map((r) => <tr key={r.id} className={`border-b last:border-0 ${r.action === "login_failed" ? "text-chili" : ""}`}><td className="p-2">{new Date(r.created_at + "Z").toLocaleString()}</td><td>{r.user}</td><td>{r.action}</td><td>{r.detail}</td></tr>)}</tbody></table>}
    </div>
  );
}
