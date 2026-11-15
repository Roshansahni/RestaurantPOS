import { FormEvent, useEffect, useState } from "react";
import { api, errMsg } from "../api";

export default function Tables() {
  const [list, setList] = useState<any[]>([]); const [err, setErr] = useState(""); const [label, setLabel] = useState(""); const [seats, setSeats] = useState("4");
  const load = () => api.get("/tables").then((r) => setList(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  const run = (p: Promise<any>) => p.then(() => { setErr(""); load(); }).catch((e) => setErr(errMsg(e)));
  const save = (t: any, status: string) => run(api.put(`/tables/${t.id}`, { label: t.label, seats: t.seats, status }));
  async function add(e: FormEvent) { e.preventDefault(); await run(api.post("/tables", { label, seats: +seats }).then(() => setLabel(""))); }
  return (
    <div className="p-4 space-y-3">
      <form onSubmit={add} className="flex gap-2 flex-wrap"><input required aria-label="Table label" placeholder="Label, e.g. T11" className="border rounded px-3 py-2" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input aria-label="Seats" type="number" min="1" className="border rounded px-3 py-2 w-24" value={seats} onChange={(e) => setSeats(e.target.value)} /><button className="bg-teal-700 text-white px-4 rounded">Add table</button></form>
      {err && <p role="alert" className="text-chili">{err}</p>}
      {list.length === 0 ? <p className="text-ink/60">No tables yet.</p> :
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">{list.map((t) => (
        <div key={t.id} className={`bg-white border-l-8 rounded p-3 ${t.status === "occupied" ? "border-chili" : t.status === "reserved" ? "border-saffron" : "border-teal-600"}`}>
          <div className="font-bold text-lg">{t.label}</div><div className="text-sm text-ink/60">{t.seats} seats</div>
          <select aria-label={`Status of ${t.label}`} className="border rounded mt-2 w-full" value={t.status} onChange={(e) => save(t, e.target.value)}><option value="available">Available</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option></select>
          <button onClick={() => confirm(`Delete ${t.label}?`) && run(api.delete(`/tables/${t.id}`))} className="underline text-chili text-sm mt-1">Delete</button></div>))}</div>}
    </div>
  );
}
