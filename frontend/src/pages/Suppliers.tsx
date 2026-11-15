import { FormEvent, useEffect, useState } from "react";
import { api, errMsg } from "../api";

export default function Suppliers() {
  const [list, setList] = useState<any[]>([]); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [err, setErr] = useState("");
  const load = () => api.get("/suppliers").then((r) => setList(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  async function add(e: FormEvent) { e.preventDefault(); try { await api.post("/suppliers", { name, phone }); setName(""); setPhone(""); setErr(""); load(); } catch (x) { setErr(errMsg(x)); } }
  const del = (s: any) => confirm(`Delete ${s.name}?`) && api.delete(`/suppliers/${s.id}`).then(() => { setErr(""); load(); }).catch((e) => setErr(errMsg(e)));
  return (
    <div className="p-4 space-y-3">
      <form onSubmit={add} className="flex gap-2 flex-wrap"><input required aria-label="Supplier name" placeholder="Supplier name" className="border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Phone" placeholder="Phone" className="border rounded px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} /><button className="bg-teal-700 text-white px-4 rounded">Add supplier</button></form>
      {err && <p role="alert" className="text-chili">{err}</p>}
      {list.length === 0 ? <p className="text-ink/60">No suppliers yet.</p> : <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><tbody>{list.map((s) => <tr key={s.id} className="border-b last:border-0"><td className="p-2">{s.name}</td><td>{s.phone}</td><td className="text-right pr-2"><button onClick={() => del(s)} className="underline text-chili">Delete</button></td></tr>)}</tbody></table>}
    </div>
  );
}
