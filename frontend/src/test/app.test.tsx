import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const DASH = { revenue: 0, orders: 0, customers: 0, products: 0, daily: [], popular: [], recent: [], low_stock: [] };
vi.mock("../api", async () => {
  const a = await vi.importActual<any>("../api");
  const get = vi.fn((u: string) => Promise.resolve({ data: u === "/reports/dashboard" ? DASH : u === "/settings" ? { currency_symbol: "₹" } : [] }));
  return { ...a, api: { get, post: vi.fn() } };
});
class FakeWS { onopen: any; onclose: any; onmessage: any; readyState = 0; send() {} close() {} }
vi.stubGlobal("WebSocket", FakeWS);
import { useAuth } from "../store";
import App from "../App";

const as = (role: string) => useAuth.setState({ token: "t", refresh: "r", role });
beforeEach(() => { sessionStorage.clear(); });

describe("Role-based navigation", () => {
  it("shows the login form when signed out", () => {
    useAuth.setState({ token: null, role: null, refresh: null });
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });
  it("kitchen staff only see the Kitchen link", () => {
    as("kitchen"); render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText("Kitchen")).toBeTruthy();
    for (const hidden of ["Billing", "Dashboard", "Menu", "Audit"]) expect(screen.queryByText(hidden)).toBeNull();
  });
  it("cashiers see Billing but not management screens", () => {
    as("cashier"); render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText("Billing")).toBeTruthy();
    for (const hidden of ["Dashboard", "Inventory", "Reports", "Audit"]) expect(screen.queryByText(hidden)).toBeNull();
  });
  it("admins see management screens and Audit", () => {
    as("admin"); render(<MemoryRouter><App /></MemoryRouter>);
    for (const shown of ["Dashboard", "Menu", "Reports", "Audit", "Suppliers"]) expect(screen.getByText(shown)).toBeTruthy();
  });
});
