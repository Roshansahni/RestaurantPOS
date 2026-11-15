import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "./store";
import { api, setCurrency } from "./api";
import { useEffect, useState } from "react";
import Suppliers from "./pages/Suppliers";
import Audit from "./pages/Audit";
import Login from "./pages/Login";
import Pos from "./pages/Pos";
import Kitchen from "./pages/Kitchen";
import Dashboard from "./pages/Dashboard";
import Menu from "./pages/Menu";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Tables from "./pages/Tables";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Orders from "./pages/Orders";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Reservations from "./pages/Reservations";

export default function App() {
  const { token, role, refresh, logout } = useAuth();
  const signOut = () => { if (refresh) api.post("/auth/logout", { refresh_token: refresh }).catch(() => {}); logout(); };
  const [, bump] = useState(0);
  useEffect(() => { if (token) api.get("/settings").then((r) => { setCurrency(r.data.currency_symbol); bump((n) => n + 1); }).catch(() => {}); }, [token]);
  if (!token) return <Login />;
  const canSell = role !== "kitchen", canCook = true, staff = role === "admin" || role === "manager";
  const link = ({ isActive }: { isActive: boolean }) => `px-3 py-1.5 text-sm rounded font-medium ${isActive ? "bg-saffron text-ink" : "text-white/80 hover:text-white"}`;
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-ink text-white flex flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2">
        <span className="font-bold text-lg mr-3">RestaurantPOS</span>
        {canSell && <NavLink to="/pos" className={link}>Billing</NavLink>}
        {canCook && <NavLink to="/kitchen" className={link}>Kitchen</NavLink>}
        {canSell && <><NavLink to="/orders" className={link}>Orders</NavLink><NavLink to="/reservations" className={link}>Bookings</NavLink><NavLink to="/customers" className={link}>Customers</NavLink></>}
        {staff && <><NavLink to="/dashboard" className={link}>Dashboard</NavLink><NavLink to="/menu" className={link}>Menu</NavLink><NavLink to="/inventory" className={link}>Inventory</NavLink><NavLink to="/tables" className={link}>Tables</NavLink><NavLink to="/team" className={link}>Team</NavLink><NavLink to="/reports" className={link}>Reports</NavLink><NavLink to="/expenses" className={link}>Expenses</NavLink><NavLink to="/suppliers" className={link}>Suppliers</NavLink></>}
        {role === "admin" && <NavLink to="/audit" className={link}>Audit</NavLink>}
        <NavLink to="/settings" className={link}>Settings</NavLink>
        <span className="ml-auto text-sm text-white/70 pl-2">{role}</span>
        <button onClick={signOut} className="flex items-center gap-1 px-3 py-2 hover:bg-white/10 rounded"><LogOut size={16} />Log out</button>
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/pos" element={canSell ? <Pos /> : <Navigate to="/kitchen" />} />
          <Route path="/kitchen" element={<Kitchen />} />
          {canSell && <><Route path="/customers" element={<Customers />} /><Route path="/orders" element={<Orders />} /><Route path="/reservations" element={<Reservations />} /></>}
          {staff && <><Route path="/dashboard" element={<Dashboard />} /><Route path="/menu" element={<Menu />} /><Route path="/inventory" element={<Inventory />} /><Route path="/tables" element={<Tables />} /><Route path="/team" element={<Team />} /><Route path="/reports" element={<Reports />} /><Route path="/expenses" element={<Expenses />} /><Route path="/suppliers" element={<Suppliers />} /></>}
          <Route path="/settings" element={<Settings />} />
          {role === "admin" && <Route path="/audit" element={<Audit />} />}
          <Route path="*" element={<Navigate to={staff ? "/dashboard" : canSell ? "/pos" : "/kitchen"} />} />
        </Routes>
      </main>
    </div>
  );
}
