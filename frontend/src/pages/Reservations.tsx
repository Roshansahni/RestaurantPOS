import { FormEvent, useEffect, useState } from "react";
import { api, errMsg } from "../api";

export default function Reservations() {
  const [list, setList] = useState<any[]>([]); const [tables, setTables] = useState<any[]>([]); const [err, setErr] = useState("");
  const [f, setF] = useState({ table_id: "", guest_name: "", phone: "", party_size: "2", reserved_for: "" });
  const load = () => Promise.all([api.get("/reservations"), api.get("/tables")]).then(([a, b]) => { setList(a.data); setTables(b.data); }).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  async function add(e: FormEvent) { e.preventDefault(); try { await api.post("/reservations", { ...f, table_id: +f.table_id, party_size: +f.party_size }); setErr(""); load(); } catch (x) { setErr(errMsg(x)); } }
  const set = (id: number, status: string) => api.patch(`/reservations/${id}`, { status }).then(load).catch((e) => setErr(errMsg(e)));
  const label = (id: number) => tables.find((t) => t.id === id)?.label ?? id;
  return (
    <div className="p-4 space-y-3">
      <form onSubmit={add} className="flex gap-2 flex-wrap"><select required aria-label="Table" className="border rounded px-3 py-2" value={f.table_id} onChange={(e) => setF({ ...f, table_id: e.target.value })}><option value="">Table</option>{tables.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.seats} seats)</option>)}</select>
        <input required aria-label="Guest name" placeholder="Guest name" className="border rounded px-3 py-2" value={f.guest_name} onChange={(e) => setF({ ...f, guest_name: e.target.value })} />
        <input aria-label="Phone" placeholder="Phone" className="border rounded px-3 py-2" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input type="number" min="1" aria-label="Guests" className="border rounded px-3 py-2 w-20" value={f.party_size} onChange={(e) => setF({ ...f, party_size: e.target.value })} />
        <input required type="datetime-local" aria-label="Date and time" className="border rounded px-3 py-2" value={f.reserved_for} onChange={(e) => setF({ ...f, reserved_for: e.target.value })} /><button className="bg-teal-700 text-white px-4 rounded">Book table</button></form>
      {err && <p role="alert" className="text-chili">{err}</p>}
      {list.length === 0 ? <p className="text-ink/60">No reservations yet.</p> : <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><tbody>{list.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="p-2">{new Date(r.reserved_for).toLocaleString()}</td><td>Table {label(r.table_id)}</td><td>{r.guest_name} ({r.party_size})</td><td>{r.status}</td>
        <td className="space-x-2">{r.status === "booked" && <><button className="underline" onClick={() => set(r.id, "seated")}>Seat</button><button className="underline text-chili" onClick={() => set(r.id, "cancelled")}>Cancel</button></>}{r.status === "seated" && <button className="underline" onClick={() => set(r.id, "completed")}>Complete</button>}</td></tr>)}</tbody></table>}
    </div>
  );
}
