import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Printer, Search } from "lucide-react";
import { api, assetUrl, errMsg, inr } from "../api";

type P = { image_path?: string | null; id: number; name: string; price: string; gst_rate: string; category_id: number | null; available: boolean };
type T = { id: number; label: string; status: string };

export default function Pos() {
  const [products, setProducts] = useState<P[]>([]); const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [tables, setTables] = useState<T[]>([]);
  const [q, setQ] = useState(""); const [cat, setCat] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [type, setType] = useState("dine_in"); const [table, setTable] = useState<number | "">("");
  const [discount, setDiscount] = useState("0"); const [msg, setMsg] = useState(""); const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true); const [rush, setRush] = useState(false);
  const [custs, setCusts] = useState<any[]>([]); const [customer, setCustomer] = useState<number | "">(""); const [shop, setShop] = useState<any>(null);

  const load = () => Promise.all([api.get("/products?limit=200"), api.get("/categories"), api.get("/tables"), api.get("/customers"), api.get("/settings")])
    .then(([a, b, c, d, e]) => { setProducts(a.data); setCats(b.data); setTables(c.data); setCusts(d.data); setShop(e.data); })
    .catch((e) => setMsg(errMsg(e))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const shown = products.filter((p) => p.available && (!cat || p.category_id === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  const lines = useMemo(() => Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === +id)!, qty })).filter((l) => l.p), [cart, products]);
  const subtotal = lines.reduce((s, l) => s + +l.p.price * l.qty, 0);
  const add = (id: number, d: number) => setCart((c) => { const n = (c[id] || 0) + d; const { [id]: _, ...rest } = c; return n > 0 ? { ...rest, [id]: n } : rest; });

  async function checkout(method: string) {
    setMsg("");
    try {
      const o = await api.post("/orders", { order_type: type, table_id: type === "dine_in" ? table || null : null, discount: discount || "0", customer_id: customer || null, priority: rush ? "rush" : "normal",
        items: lines.map((l) => ({ product_id: l.p.id, qty: l.qty })) });
      const pay = await api.post(`/orders/${o.data.id}/pay`, { method });
      setReceipt({ ...pay.data, method }); setCart({}); setDiscount("0"); setCustomer(""); setRush(false); load();
    } catch (e) { setMsg(errMsg(e)); }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4 p-4">
      <section>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-ink/50" />
            <input aria-label="Search menu" placeholder="Search menu" className="w-full border rounded pl-9 pr-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <div className="flex gap-2 flex-wrap mb-3">
          <button onClick={() => setCat(null)} className={`px-3 py-1 rounded-full border ${!cat ? "bg-ink text-white" : "bg-white"}`}>All</button>
          {cats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={`px-3 py-1 rounded-full border ${cat === c.id ? "bg-ink text-white" : "bg-white"}`}>{c.name}</button>)}
        </div>
        {loading ? <p>Loading menu…</p> : shown.length === 0 ? <p className="text-ink/60">No items match. Clear the search or pick another category.</p> :
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {shown.map((p) => (
              <button key={p.id} onClick={() => add(p.id, 1)} className="bg-white border border-ink/10 rounded-lg p-3 text-left hover:border-teal-600 active:scale-95">
                {p.image_path && <img src={assetUrl(p.image_path)} alt="" className="w-full h-20 object-cover rounded mb-1" />}<div className="font-semibold leading-tight">{p.name}</div><div className="text-teal-700 mt-1">{inr(p.price)}</div>
              </button>))}
          </div>}
      </section>

      <aside className="bg-white border border-ink/10 rounded-lg p-4 h-fit space-y-3 lg:sticky lg:top-4">
        <div className="flex gap-2">
          <select aria-label="Order type" className="border rounded px-2 py-2 flex-1" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="dine_in">Dine-in</option><option value="takeaway">Takeaway</option><option value="online">Online</option></select>
          {type === "dine_in" && <select aria-label="Table" className="border rounded px-2 py-2 flex-1" value={table} onChange={(e) => setTable(+e.target.value || "")}>
            <option value="">Select table</option>{tables.filter((t) => t.status !== "occupied").map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>}
        </div>
        <select aria-label="Customer" className="border rounded px-2 py-2 w-full" value={customer} onChange={(e) => setCustomer(+e.target.value || "")}><option value="">Walk-in customer</option>{custs.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select>
        {lines.length === 0 ? <p className="text-ink/60 py-6 text-center">Tap a dish to start the bill.</p> :
          <ul className="divide-y">{lines.map((l) => (
            <li key={l.p.id} className="py-2 flex items-center gap-2"><span className="flex-1">{l.p.name}</span>
              <button aria-label={`Remove one ${l.p.name}`} onClick={() => add(l.p.id, -1)} className="p-1 border rounded"><Minus size={14} /></button>
              <span className="w-6 text-center">{l.qty}</span>
              <button aria-label={`Add one ${l.p.name}`} onClick={() => add(l.p.id, 1)} className="p-1 border rounded"><Plus size={14} /></button>
              <span className="w-20 text-right">{inr(+l.p.price * l.qty)}</span></li>))}</ul>}
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} />Rush order (kitchen sees it first)</label>
        <label className="flex justify-between items-center text-sm">Discount (₹)<input type="number" min="0" className="border rounded px-2 py-1 w-24 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
        <div className="flex justify-between font-semibold"><span>Subtotal (GST added at checkout)</span><span>{inr(subtotal)}</span></div>
        {msg && <p role="alert" className="text-chili text-sm">{msg}</p>}
        <div className="grid grid-cols-2 gap-2">
          {["cash", "upi", "card", "other"].map((m) => <button key={m} disabled={!lines.length} onClick={() => checkout(m)} className="bg-teal-700 text-white py-2 rounded font-semibold disabled:opacity-40 capitalize">Pay {m === "upi" ? "UPI" : m}</button>)}
        </div>
        <p className="text-xs text-ink/60">Payments are simulated. No gateway is connected.</p>
      </aside>

      {receipt && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div id="receipt" className="text-sm space-y-1">
              {shop && <div className="text-center"><div className="font-bold text-lg">{shop.name}</div><div>{shop.address}</div>{shop.gstin && <div>GSTIN {shop.gstin}</div>}</div>}
              <h2 className="font-bold">Tax Invoice {receipt.invoice}</h2>
              {receipt.order.created_at && <div className="text-ink/70">{new Date(receipt.order.created_at + "Z").toLocaleString()} · Paid by {String(receipt.method).toUpperCase()}</div>}
              {receipt.order.items.map((i: any, k: number) => <div key={k} className="flex justify-between"><span>{i.qty} × {i.name}</span><span>{inr(i.qty * i.unit_price)}</span></div>)}
              <hr /><div className="flex justify-between"><span>Subtotal</span><span>{inr(receipt.order.subtotal)}</span></div>
              {+receipt.order.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{inr(receipt.order.discount)}</span></div>}
              <div className="flex justify-between"><span>CGST</span><span>{inr(receipt.order.cgst)}</span></div>
              <div className="flex justify-between"><span>SGST</span><span>{inr(receipt.order.sgst)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{inr(receipt.order.total)}</span></div>
              {shop?.receipt_footer && <p className="text-center pt-2">{shop.receipt_footer}</p>}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => window.print()} className="flex-1 border rounded py-2 flex items-center justify-center gap-1"><Printer size={16} />Print receipt</button>
              <button onClick={() => setReceipt(null)} className="flex-1 bg-ink text-white rounded py-2">Done</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
