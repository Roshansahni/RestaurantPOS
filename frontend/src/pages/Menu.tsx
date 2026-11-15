import { FormEvent, useEffect, useState } from "react";
import { api, assetUrl, errMsg, inr } from "../api";
import Recipe from "./Recipe";
type P = { id?: number; image_path?: string | null; name: string; price: string; gst_rate: string; category_id: number | null; available: boolean; description: string };
const blank: P = { name: "", price: "", gst_rate: "5", category_id: null, available: true, description: "" };

export default function Menu() {
  const [items, setItems] = useState<P[]>([]); const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [edit, setEdit] = useState<P | null>(null); const [rec, setRec] = useState<P | null>(null); const [rates, setRates] = useState<string[]>(["0", "5", "12", "18", "28"]); const [err, setErr] = useState(""); const [q, setQ] = useState("");
  const load = () => Promise.all([api.get("/products?limit=200"), api.get("/categories")]).then(([a, b]) => { setItems(a.data); setCats(b.data); }).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); api.get("/settings").then((r) => setRates(r.data.gst_rates.split(","))).catch(() => {}); }, []);
  async function photo(p: P, f?: File) { if (!f) return; const fd = new FormData(); fd.append("file", f); try { await api.post(`/products/${p.id}/image`, fd); setErr(""); load(); } catch (x) { setErr(errMsg(x)); } }
  async function save(e: FormEvent) {
    e.preventDefault(); setErr("");
    try { const body = { ...edit, price: edit!.price, gst_rate: edit!.gst_rate };
      edit!.id ? await api.put(`/products/${edit!.id}`, body) : await api.post("/products", body); setEdit(null); load(); } catch (x) { setErr(errMsg(x)); }
  }
  async function remove(p: P) { if (!confirm(`Delete ${p.name}?`)) return; try { await api.delete(`/products/${p.id}`); load(); } catch (x) { setErr(errMsg(x)); } }
  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3"><input aria-label="Search menu" placeholder="Search menu" className="border rounded px-3 py-2 flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setEdit(blank)} className="bg-teal-700 text-white px-4 rounded font-semibold">Add dish</button></div>
      {err && <p role="alert" className="text-chili mb-2">{err}</p>}
      {items.length === 0 ? <p className="text-ink/60">No dishes yet. Add your first one.</p> :
      <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><thead><tr className="border-b"><th className="p-2">Name</th><th>Price</th><th>GST</th><th>Status</th><th></th></tr></thead>
        <tbody>{items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).map((p) => (
          <tr key={p.id} className="border-b last:border-0"><td className="p-2 flex items-center gap-2">{p.image_path && <img src={assetUrl(p.image_path)} alt="" className="w-10 h-10 object-cover rounded" />}{p.name}</td><td>{inr(p.price)}</td><td>{p.gst_rate}%</td><td>{p.available ? "Available" : "Hidden"}</td>
            <td className="text-right pr-2 space-x-2"><label className="underline cursor-pointer">Photo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Upload photo for ${p.name}`} onChange={(e) => photo(p, e.target.files?.[0])} /></label><button onClick={() => setRec(p)} className="underline">Recipe</button><button onClick={() => setEdit(p)} className="underline">Edit</button><button onClick={() => remove(p)} className="underline text-chili">Delete</button></td></tr>))}</tbody></table>}
      {rec && <Recipe product={rec} onClose={() => setRec(null)} />}
      {edit && <div className="fixed inset-0 bg-black/50 grid place-items-center p-4" role="dialog" aria-modal="true">
        <form onSubmit={save} className="bg-white rounded-lg p-6 w-full max-w-md space-y-3">
          <h2 className="font-bold text-lg">{edit.id ? "Edit dish" : "Add dish"}</h2>
          <input required aria-label="Name" placeholder="Name" className="border rounded px-3 py-2 w-full" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <div className="flex gap-2"><input required type="number" step="0.01" min="0.01" aria-label="Price" placeholder="Price (₹, before GST)" className="border rounded px-3 py-2 flex-1" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
            <select aria-label="GST rate" className="border rounded px-3 py-2 w-24" value={String(+edit.gst_rate)} onChange={(e) => setEdit({ ...edit, gst_rate: e.target.value })}>{rates.map((r) => <option key={r} value={String(+r)}>{r}%</option>)}</select></div>
          <select aria-label="Category" className="border rounded px-3 py-2 w-full" value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: +e.target.value || null })}><option value="">No category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <label className="flex gap-2"><input type="checkbox" checked={edit.available} onChange={(e) => setEdit({ ...edit, available: e.target.checked })} />Available for sale</label>
          <div className="flex gap-2"><button type="button" onClick={() => setEdit(null)} className="flex-1 border rounded py-2">Cancel</button><button className="flex-1 bg-teal-700 text-white rounded py-2">Save dish</button></div>
        </form></div>}
    </div>
  );
}
