import { useEffect, useState } from "react";
import { api, errMsg } from "../api";

export default function Recipe({ product, onClose }: { product: { id?: number; name: string }; onClose: () => void }) {
  const [inv, setInv] = useState<any[]>([]); const [rows, setRows] = useState<{ item_id: number | ""; quantity: string }[]>([]); const [err, setErr] = useState("");
  useEffect(() => { Promise.all([api.get("/inventory"), api.get(`/recipes/${product.id}`)]).then(([a, b]) => { setInv(a.data); setRows(b.data.ingredients.map((i: any) => ({ item_id: i.item_id, quantity: String(i.quantity) }))); }).catch((e) => setErr(errMsg(e))); }, []);
  const save = () => api.put(`/recipes/${product.id}`, { ingredients: rows.filter((r) => r.item_id) }).then(onClose).catch((e) => setErr(errMsg(e)));
  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center p-4" role="dialog" aria-modal="true"><div className="bg-white rounded-lg p-6 w-full max-w-md space-y-2">
      <h2 className="font-bold text-lg">Recipe: {product.name}</h2><p className="text-sm text-ink/60">Ingredients used per portion. Stock is deducted when the order is placed and restored if it is cancelled.</p>
      {rows.map((r, k) => <div key={k} className="flex gap-2"><select aria-label="Ingredient" className="border rounded px-2 py-1 flex-1" value={r.item_id} onChange={(e) => setRows(rows.map((x, j) => j === k ? { ...x, item_id: +e.target.value || "" } : x))}><option value="">Choose…</option>{inv.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select>
        <input aria-label="Quantity" type="number" min="0.001" step="0.001" className="border rounded px-2 py-1 w-24" value={r.quantity} onChange={(e) => setRows(rows.map((x, j) => j === k ? { ...x, quantity: e.target.value } : x))} />
        <button aria-label="Remove ingredient" onClick={() => setRows(rows.filter((_, j) => j !== k))} className="px-2">✕</button></div>)}
      <button onClick={() => setRows([...rows, { item_id: "", quantity: "" }])} className="underline">Add ingredient</button>
      {err && <p role="alert" className="text-chili">{err}</p>}
      <div className="flex gap-2"><button onClick={onClose} className="flex-1 border rounded py-2">Cancel</button><button onClick={save} className="flex-1 bg-teal-700 text-white rounded py-2">Save recipe</button></div></div></div>
  );
}
