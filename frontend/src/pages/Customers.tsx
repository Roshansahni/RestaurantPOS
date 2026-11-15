import { FormEvent, useEffect, useState } from "react";
import { api, errMsg, inr } from "../api";

export default function Customers() {
  const [list, setList] = useState<any[]>([]); const [q, setQ] = useState(""); const [err, setErr] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const load = () => api.get("/customers", { params: { q } }).then((r) => setList(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);
  async function add(e: FormEvent) { e.preventDefault(); try { await api.post("/customers", { name, phone }); setName(""); setPhone(""); setErr(""); load(); } catch (x) { setErr(errMsg(x)); } }
  return (
    <div className="p-4 space-y-3">
      <form onSubmit={add} className="flex gap-2 flex-wrap"><input required aria-label="Customer name" placeholder="Name" className="border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <input required minLength={7} aria-label="Phone" placeholder="Phone" className="border rounded px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} /><button className="bg-teal-700 text-white px-4 rounded">Add customer</button></form>
      <input aria-label="Search customers" placeholder="Search by name or phone" className="border rounded px-3 py-2 w-full max-w-md" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p role="alert" className="text-chili">{err}</p>}
      {list.length === 0 ? <p className="text-ink/60">No customers found.</p> :
      <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><thead><tr className="border-b"><th className="p-2">Name</th><th>Phone</th><th>Orders</th><th>Total spent</th></tr></thead>
        <tbody>{list.map((c) => <tr key={c.id} className="border-b last:border-0"><td className="p-2">{c.name}</td><td>{c.phone}</td><td>{c.orders}</td><td>{inr(c.total_spent)}</td></tr>)}</tbody></table>}
    </div>
  );
}
