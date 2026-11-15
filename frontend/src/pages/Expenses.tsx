import { FormEvent, useEffect, useState } from "react";
import { api, errMsg, inr } from "../api";
const blank = { category: "", amount: "", note: "" };

export default function Expenses() {
  const [list, setList] = useState<any[]>([]); const [f, setF] = useState(blank); const [editId, setEditId] = useState<number | null>(null); const [err, setErr] = useState("");
  const load = () => api.get("/expenses").then((r) => setList(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  async function save(e: FormEvent) { e.preventDefault(); try { editId ? await api.put(`/expenses/${editId}`, f) : await api.post("/expenses", f); setF(blank); setEditId(null); setErr(""); load(); } catch (x) { setErr(errMsg(x)); } }
  const del = (id: number) => confirm("Delete this expense?") && api.delete(`/expenses/${id}`).then(load).catch((e) => setErr(errMsg(e)));
  return (
    <div className="p-4 space-y-3">
      <form onSubmit={save} className="flex gap-2 flex-wrap"><input required aria-label="Category" placeholder="Category (Rent, Gas…)" className="border rounded px-3 py-2" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <input required type="number" min="0.01" step="0.01" aria-label="Amount" placeholder="Amount" className="border rounded px-3 py-2 w-32" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <input aria-label="Note" placeholder="Note" className="border rounded px-3 py-2" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        <button className="bg-teal-700 text-white px-4 rounded">{editId ? "Save changes" : "Record expense"}</button>{editId && <button type="button" onClick={() => { setEditId(null); setF(blank); }} className="border rounded px-3">Cancel</button>}</form>
      {err && <p role="alert" className="text-chili">{err}</p>}
      {list.length === 0 ? <p className="text-ink/60">No expenses recorded.</p> : <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><tbody>{list.map((e) => <tr key={e.id} className="border-b last:border-0"><td className="p-2">{e.category}</td><td>{e.note}</td><td>{inr(e.amount)}</td><td>{new Date(e.created_at + "Z").toLocaleDateString()}</td>
        <td className="space-x-2"><button className="underline" onClick={() => { setEditId(e.id); setF({ category: e.category, amount: String(e.amount), note: e.note }); }}>Edit</button><button className="underline text-chili" onClick={() => del(e.id)}>Delete</button></td></tr>)}</tbody></table>}
    </div>
  );
}
