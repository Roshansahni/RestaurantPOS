import { useEffect, useState } from "react";
import { api, errMsg, wsUrl } from "../api";
import { useAuth } from "../store";

type O = { priority?: string; id: number; status: string; order_type: string; table_id: number | null; created_at: string; items: { name: string; qty: number }[] };
const COLS = [["pending", "New", "preparing", "Start"], ["preparing", "Preparing", "ready", "Mark ready"], ["ready", "Ready", "completed", "Complete"]] as const;

export default function Kitchen() {
  const [orders, setOrders] = useState<O[]>([]); const [err, setErr] = useState(""); const [, tick] = useState(0);
  const load = () => api.get("/orders?limit=100").then((r) => { setOrders(r.data); setErr(""); }).catch((e) => setErr(errMsg(e)));
  const [live, setLive] = useState(false);
  useEffect(() => {
    let ws: WebSocket | null = null, retry: ReturnType<typeof setTimeout>, stopped = false, delay = 1000;
    load();
    const connect = () => {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => ws!.send(useAuth.getState().token ?? "");
      ws.onmessage = (m) => { const t = JSON.parse(m.data).type; if (t === "ready") { setLive(true); delay = 1000; load(); } else load(); };
      ws.onclose = () => { setLive(false); if (!stopped) { retry = setTimeout(connect, delay); delay = Math.min(delay * 2, 15000); } };
    };
    connect();
    const poll = setInterval(() => { if (!ws || ws.readyState !== WebSocket.OPEN) load(); }, 5000);  // fallback only while disconnected
    const safety = setInterval(load, 60000), clock = setInterval(() => tick((n) => n + 1), 30000);
    return () => { stopped = true; clearTimeout(retry); clearInterval(poll); clearInterval(safety); clearInterval(clock); ws?.close(); };
  }, []);
  const move = (id: number, status: string) => api.patch(`/orders/${id}/status`, { status }).then(load).catch((e) => setErr(errMsg(e)));
  const mins = (d: string) => Math.max(0, Math.round((Date.now() - new Date(d + "Z").getTime()) / 60000));
  return (
    <div className="p-4">
      {err && <p role="alert" className="text-chili mb-2">{err}</p>}
      <p role="status" className={`text-sm mb-3 ${live ? "text-teal-700" : "text-chili"}`}>{live ? "Live: new orders appear instantly." : "Reconnecting… checking for orders every 5 seconds."}</p>
      <div className="grid md:grid-cols-3 gap-4">
        {COLS.map(([st, title, next, label]) => {
          const list = orders.filter((o) => o.status === st).reverse().sort((a, b) => Number(b.priority === "rush") - Number(a.priority === "rush"));
          return (
            <section key={st}><h2 className="text-3xl font-bold mb-3">{title} ({list.length})</h2>
              {list.length === 0 && <p className="text-ink/50">No orders here.</p>}
              <div className="space-y-3">{list.map((o) => (
                <article key={o.id} className={`bg-white border-l-8 rounded p-4 ${mins(o.created_at) > 15 ? "border-chili" : "border-saffron"}`}>
                  <div className="flex justify-between text-2xl font-bold"><span>{o.priority === "rush" && <b className="bg-chili text-white px-2 mr-2 rounded">RUSH</b>}#{o.id} · {o.order_type === "dine_in" ? `Table ${o.table_id}` : o.order_type}</span><span>{mins(o.created_at)} min</span></div>
                  <ul className="text-3xl font-semibold my-3 leading-snug">{o.items.map((i, k) => <li key={k}>{i.qty} × {i.name}</li>)}</ul>
                  <button onClick={() => move(o.id, next)} className="w-full bg-teal-700 text-white text-2xl py-4 rounded font-semibold">{label}</button>
                </article>))}</div>
            </section>);
        })}
      </div>
    </div>
  );
}
