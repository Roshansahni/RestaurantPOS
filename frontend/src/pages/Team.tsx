import { FormEvent, useEffect, useState } from "react";
import { api, errMsg } from "../api";

export default function Team() {
  const [list, setList] = useState<any[]>([]); const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [name, setName] = useState(""); const [role, setRole] = useState("chef"); const [phone, setPhone] = useState(""); const [editId, setEditId] = useState<number | null>(null);
  const load = () => api.get("/employees").then((r) => setList(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  async function add(e: FormEvent) { e.preventDefault(); try { editId ? await api.put(`/employees/${editId}`, { name, role, phone, active: true }) : await api.post("/employees", { name, role, phone }); setEditId(null); setName(""); setPhone(""); setErr(""); load(); } catch (x) { setErr(errMsg(x)); } }
  async function mark(id: number, present: boolean) { try { await api.post(`/employees/${id}/attendance`, null, { params: { present } }); setOk(`Marked ${present ? "present" : "absent"}.`); setErr(""); } catch (x) { setErr(errMsg(x)); } }
  return (
    <div className="p-4 space-y-3">
      <form onSubmit={add} className="flex gap-2 flex-wrap"><input required aria-label="Employee name" placeholder="Name" className="border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <input required aria-label="Job role" placeholder="Role" className="border rounded px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)} />
        <input aria-label="Phone" placeholder="Phone" className="border rounded px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} /><button className="bg-teal-700 text-white px-4 rounded">{editId ? "Save changes" : "Add employee"}</button></form>
      {err && <p role="alert" className="text-chili">{err}</p>}{ok && <p role="status" className="text-teal-700">{ok}</p>}
      {list.length === 0 ? <p className="text-ink/60">No employees yet.</p> :
      <table className="w-full bg-white border border-ink/10 rounded-lg text-left"><thead><tr className="border-b"><th className="p-2">Name</th><th>Role</th><th>Phone</th><th>Today</th><th></th></tr></thead>
        <tbody>{list.map((e) => <tr key={e.id} className="border-b last:border-0"><td className="p-2">{e.name}</td><td>{e.role}</td><td>{e.phone}</td>
          <td className="space-x-2"><button onClick={() => mark(e.id, true)} className="underline">Present</button><button onClick={() => mark(e.id, false)} className="underline text-chili">Absent</button></td><td className="space-x-2"><button className="underline" onClick={() => { setEditId(e.id); setName(e.name); setRole(e.role); setPhone(e.phone); }}>Edit</button><button className="underline text-chili" onClick={() => confirm(`Delete ${e.name}?`) && api.delete(`/employees/${e.id}`).then(load).catch((x) => setErr(errMsg(x)))}>Delete</button></td></tr>)}</tbody></table>}
    </div>
  );
}
