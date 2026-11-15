import { Fragment, useEffect, useState } from "react";
import { api, errMsg, inr } from "../api";

export default function Orders() {
  const [list, setList] = useState<any[]>([]); const [st, setSt] = useState(""); const [err, setErr] = useState(""); const [open, setOpen] = useState<number | null>(null);
  const load = () => api.get("/orders", { params: { status: st || undefined, limit: 100 } }).then((r) => setList(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, [st]);
  const cancel = (id: number) => confirm(`Cancel order #${id}? Ingredient stock will be restored.`) && api.patch(`/orders/${id}/status`, { status: "cancelled" }).then(() => { setErr(""); load(); }).catch((e) => setErr(errMsg(e)));
  return (
    <div className="p-4 space-y-3">
      <select aria-label="Filter by status" className="border rounded px-3 py-2" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All orders</option>{["pending", "preparing", "ready", "completed", "cancelled"].map((s) => <option key={s}>{s}</option>)}</select>
      {err && <p role="alert" className="text-chili">{err}</p>}
      {list.length === 0 ? <p className="text-ink/60">No orders match this filter.</p> :
      <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><thead><tr className="border-b"><th className="p-2">Order</th><th>Type</th><th>Status</th><th>Total</th><th>Paid</th><th>Time</th><th></th></tr></thead>
        <tbody>{list.map((o) => (<Fragment key={o.id}>
          <tr className="border-b"><td className="p-2"><button className="underline" onClick={() => setOpen(open === o.id ? null : o.id)}>#{o.id}</button></td><td>{o.order_type}</td><td>{o.status}</td><td>{inr(o.total)}</td><td>{o.paid ? "Yes" : "No"}</td><td>{new Date(o.created_at + "Z").toLocaleString()}</td>
            <td className="space-x-2">{o.status !== "completed" && o.status !== "cancelled" && <button onClick={() => api.patch(`/orders/${o.id}/priority`, null, { params: { priority: o.priority === "rush" ? "normal" : "rush" } }).then(load).catch((e) => setErr(errMsg(e)))} className="underline">{o.priority === "rush" ? "Remove rush" : "Mark rush"}</button>}{!o.paid && o.status !== "cancelled" && <button onClick={() => cancel(o.id)} className="underline text-chili">Cancel</button>}</td></tr>
          {open === o.id && <tr className="border-b bg-paper"><td colSpan={7} className="p-2">{o.items.map((i: any, k: number) => <div key={k}>{i.qty} × {i.name} @ {inr(i.unit_price)} ({i.gst_rate}% GST)</div>)}</td></tr>}</Fragment>))}</tbody></table>}
    </div>
  );
}
