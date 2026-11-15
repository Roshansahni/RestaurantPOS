import { useEffect, useState } from "react";
import { api, errMsg } from "../api";

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]); const [err, setErr] = useState(""); const [name, setName] = useState(""); const [unit, setUnit] = useState("kg"); const [lvl, setLvl] = useState("0");
  const [amt, setAmt] = useState<Record<number, string>>({});
  const load = () => api.get("/inventory").then((r) => setItems(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  const run = (p: Promise<any>) => p.then(() => { setErr(""); load(); }).catch((e) => setErr(errMsg(e)));
  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2 flex-wrap"><input aria-label="Item name" placeholder="New ingredient" className="border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Unit" className="border rounded px-3 py-2 w-20" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input aria-label="Reorder level" type="number" min="0" className="border rounded px-3 py-2 w-28" value={lvl} onChange={(e) => setLvl(e.target.value)} />
        <button disabled={!name} onClick={() => run(api.post("/inventory", { name, unit, reorder_level: lvl }).then(() => setName("")))} className="bg-teal-700 text-white px-4 rounded disabled:opacity-40">Add ingredient</button></div>
      {err && <p role="alert" className="text-chili">{err}</p>}
      {items.length === 0 ? <p className="text-ink/60">No ingredients tracked yet.</p> :
      <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><thead><tr className="border-b"><th className="p-2">Ingredient</th><th>In stock</th><th>Reorder at</th><th>Update stock</th></tr></thead>
        <tbody>{items.map((i) => (<tr key={i.id} className="border-b last:border-0"><td className="p-2">{i.name}{i.low && <span className="ml-2 text-chili text-sm">Low</span>}</td><td>{i.quantity} {i.unit}</td><td>{i.reorder_level}</td>
          <td className="p-1 flex gap-1"><input aria-label={`Quantity for ${i.name}`} type="number" min="0" step="0.001" className="border rounded px-2 py-1 w-24" value={amt[i.id] ?? ""} onChange={(e) => setAmt({ ...amt, [i.id]: e.target.value })} />
            {(["purchase", "consumption"] as const).map((k) => <button key={k} disabled={!amt[i.id]} onClick={() => run(api.post(`/inventory/${i.id}/stock`, { kind: k, quantity: amt[i.id] }).then(() => setAmt({ ...amt, [i.id]: "" })))} className="border rounded px-2 capitalize disabled:opacity-40">{k === "purchase" ? "Add stock" : "Use"}</button>)}</td></tr>))}</tbody></table>}
    </div>
  );
}
