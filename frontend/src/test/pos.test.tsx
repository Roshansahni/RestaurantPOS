import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../api", async () => { const a = await vi.importActual<any>("../api"); return { ...a, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }; });
import { api } from "../api";
import Pos from "../pages/Pos";

const data: Record<string, any> = {
  "/products?limit=200": [{ id: 1, name: "Paneer Tikka", price: "200.00", gst_rate: "5", category_id: 1, available: true },
                           { id: 2, name: "Hidden Dish", price: "50.00", gst_rate: "5", category_id: 1, available: false }],
  "/categories": [{ id: 1, name: "Starters" }], "/tables": [{ id: 1, label: "T1", status: "available" }],
  "/customers": [{ id: 7, name: "Asha", phone: "9876500001" }], "/settings": { name: "Spice Hub", address: "Jaipur", gstin: "", receipt_footer: "Thanks!" },
};
beforeEach(() => {
  vi.clearAllMocks();
  (api.get as any).mockImplementation((u: string) => Promise.resolve({ data: data[u] }));
});

describe("Billing screen", () => {
  it("lists only available dishes and filters by search", async () => {
    render(<Pos />);
    expect(await screen.findByText("Paneer Tikka")).toBeTruthy();
    expect(screen.queryByText("Hidden Dish")).toBeNull();
    await userEvent.type(screen.getByLabelText("Search menu"), "zzz");
    expect(screen.getByText(/No items match/)).toBeTruthy();
  });
  it("totals the cart and disables payment when it is empty", async () => {
    render(<Pos />);
    const pay = screen.getByRole("button", { name: "Pay cash" }) as HTMLButtonElement;
    expect(pay.disabled).toBe(true);
    await userEvent.click((await screen.findAllByText("Paneer Tikka"))[0]);
    await userEvent.click(screen.getAllByText("Paneer Tikka")[0]);
    expect(screen.getAllByText("₹400.00").length).toBeGreaterThan(0);
    expect(pay.disabled).toBe(false);
  });
  it("creates the order with server-side pricing inputs, pays, and shows the GST receipt", async () => {
    (api.post as any).mockImplementation((u: string) => Promise.resolve({ data: u === "/orders" ? { id: 5 } : {
      invoice: "INV-2026-000005", order: { items: [{ name: "Paneer Tikka", qty: 2, unit_price: 200 }], subtotal: 400, discount: 0, cgst: 10, sgst: 10, total: 420 } } }));
    render(<Pos />);
    await userEvent.click((await screen.findAllByText("Paneer Tikka"))[0]);
    await userEvent.click(screen.getAllByText("Paneer Tikka")[0]);
    await userEvent.selectOptions(screen.getByLabelText("Order type"), "takeaway");
    await userEvent.click(screen.getByRole("button", { name: "Pay UPI" }));
    await waitFor(() => expect(screen.getByText(/Tax Invoice INV-2026-000005/)).toBeTruthy());
    const body = (api.post as any).mock.calls[0][1];
    expect(body.items).toEqual([{ product_id: 1, qty: 2 }]);
    expect(body.order_type).toBe("takeaway");
    expect(body).not.toHaveProperty("total");  // the browser never sends totals
    expect((api.post as any).mock.calls[1][0]).toBe("/orders/5/pay");
    expect(screen.getByText("Spice Hub")).toBeTruthy();
    expect(screen.getByText("₹420.00")).toBeTruthy();
  });
});
