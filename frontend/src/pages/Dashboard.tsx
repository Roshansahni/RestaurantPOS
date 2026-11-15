import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, download, errMsg, inr } from "../api";

export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api.get("/reports/dashboard").then((r) => setD(r.data)).catch((e) => setErr(errMsg(e))); }, []);
  if (err) return <p role="alert" className="p-4 text-chili">{err}</p>;
  if (!d) return <p className="p-4">Loading dashboard…</p>;
  const stat = (label: string, v: string | number) => <div className="bg-white border border-ink/10 rounded-lg p-4"><div className="text-sm text-ink/60">{label}</div><div className="text-2xl font-bold">{v}</div></div>;
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{stat("Revenue", inr(d.revenue))}{stat("Orders", d.orders)}{stat("Customers", d.customers)}{stat("Menu items", d.products)}</div>
      <section className="bg-white border border-ink/10 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2"><h2 className="font-bold">Daily sales, last 14 days</h2>
          <div className="flex gap-2"><button onClick={() => download("/reports/sales.csv", "sales.csv")} className="border rounded px-3 py-1">Export CSV</button>
            <button onClick={() => download("/reports/sales.pdf", "sales.pdf")} className="border rounded px-3 py-1">Export PDF</button></div></div>
        <div className="h-64"><ResponsiveContainer><BarChart data={d.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#2a7a74" /></BarChart></ResponsiveContainer></div>
      </section>
      <div className="grid md:grid-cols-3 gap-3">
        <section className="bg-white border border-ink/10 rounded-lg p-4"><h2 className="font-bold mb-2">Popular dishes</h2>
          {d.popular.length ? d.popular.map((p: any) => <div key={p.name} className="flex justify-between"><span>{p.name}</span><span>{p.qty}</span></div>) : <p className="text-ink/60">Sell something to see rankings.</p>}</section>
        <section className="bg-white border border-ink/10 rounded-lg p-4"><h2 className="font-bold mb-2">Recent payments</h2>
          {d.recent.length ? d.recent.map((p: any) => <div key={p.id} className="flex justify-between"><span>Order #{p.order_id} · {p.method}</span><span>{inr(p.amount)}</span></div>) : <p className="text-ink/60">No payments yet.</p>}</section>
        <section className="bg-white border border-ink/10 rounded-lg p-4"><h2 className="font-bold mb-2">Low stock</h2>
          {d.low_stock.length ? d.low_stock.map((i: any) => <div key={i.name} className="flex justify-between text-chili"><span>{i.name}</span><span>{i.quantity} {i.unit}</span></div>) : <p className="text-ink/60">All stock levels are fine.</p>}</section>
      </div>
    </div>
  );
}
