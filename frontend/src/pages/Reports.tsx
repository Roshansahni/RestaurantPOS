import { useEffect, useState } from "react";
import { api, download, errMsg, inr } from "../api";

export default function Reports() {
  const [period, setPeriod] = useState("day"); const [sales, setSales] = useState<any[]>([]); const [pay, setPay] = useState<any[]>([]); const [inv, setInv] = useState<any[]>([]); const [pf, setPf] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api.get("/reports/sales", { params: { period } }).then((r) => setSales(r.data)).catch((e) => setErr(errMsg(e))); }, [period]);
  useEffect(() => { Promise.all([api.get("/reports/payments"), api.get("/reports/inventory"), api.get("/reports/profit")]).then(([a, b, c]) => { setPay(a.data); setInv(b.data); setPf(c.data); }).catch((e) => setErr(errMsg(e))); }, []);
  const box = "bg-white border border-ink/10 rounded-lg p-4";
  return (
    <div className="p-4 grid lg:grid-cols-2 gap-4 items-start">
      {err && <p role="alert" className="text-chili lg:col-span-2">{err}</p>}
      <div className="lg:col-span-2 flex gap-2 flex-wrap items-center"><span className="text-sm">Export:</span>{["sales", "payments", "inventory", "expenses"].flatMap((r) => ["csv", "pdf"].map((f) => <button key={r + f} onClick={() => download(`/reports/export?report=${r}&format=${f}&period=${period}`, `${r}.${f}`).catch((e) => setErr(errMsg(e)))} className="border rounded px-3 py-1 capitalize">{r} {f.toUpperCase()}</button>))}</div>
      <section className={box}><div className="flex justify-between mb-2"><h2 className="font-bold">Sales</h2>
        <select aria-label="Period" className="border rounded px-2" value={period} onChange={(e) => setPeriod(e.target.value)}>{[["day", "Daily"], ["week", "Weekly"], ["month", "Monthly"], ["year", "Annual"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        {sales.length === 0 ? <p className="text-ink/60">No paid orders in this range.</p> : <table className="w-full text-left"><tbody>{sales.map((s) => <tr key={s.period} className="border-t"><td className="py-1">{s.period}</td><td>{s.orders} orders</td><td className="text-right">{inr(s.revenue)}</td></tr>)}</tbody></table>}</section>
      <section className={box}><h2 className="font-bold mb-2">Payments by method</h2>
        {pay.length === 0 ? <p className="text-ink/60">No payments yet.</p> : pay.map((p) => <div key={p.method} className="flex justify-between border-t py-1"><span className="capitalize">{p.method} ({p.count})</span><span>{inr(p.amount)}</span></div>)}
        {pf && <div className="mt-4 text-sm"><div className="flex justify-between"><span>Revenue incl. GST</span><span>{inr(pf.revenue_incl_gst)}</span></div><div className="flex justify-between"><span>Expenses</span><span>{inr(pf.expenses)}</span></div><p className="text-ink/60 mt-1">{pf.note}</p></div>}</section>
      <section className={`${box} lg:col-span-2`}><h2 className="font-bold mb-2">Inventory</h2>
        {inv.length === 0 ? <p className="text-ink/60">No ingredients tracked.</p> : <table className="w-full text-left"><thead><tr><th>Ingredient</th><th>In stock</th><th>Purchases</th><th></th></tr></thead><tbody>{inv.map((i) => <tr key={i.name} className="border-t"><td className="py-1">{i.name}</td><td>{i.quantity} {i.unit}</td><td>{inr(i.purchase_spend)}</td><td className="text-chili">{i.low ? "Low" : ""}</td></tr>)}</tbody></table>}</section>
    </div>
  );
}
