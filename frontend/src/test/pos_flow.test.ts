import { describe, it, expect } from "vitest";
import { handleMockRoute } from "../mockBackend";

describe("Complete POS Mock Engine", () => {
  it("processes order creation, tax calculation, and payment correctly", () => {
    // 1. Auth
    const auth = handleMockRoute("post", "/auth/login", JSON.stringify({ username: "admin" }));
    expect(auth.role).toBe("admin");

    // 2. Products
    const products = handleMockRoute("get", "/products");
    expect(products.length).toBeGreaterThan(0);
    const mangoLassi = products.find((p: any) => p.name === "Mango Lassi");
    expect(mangoLassi).toBeDefined();
    expect(mangoLassi.price).toBe("110.00");

    // 3. Create Order for 2x Mango Lassi (₹220 + 5% GST = ₹231)
    const newOrder = handleMockRoute("post", "/orders", JSON.stringify({
      order_type: "online",
      table_id: null,
      discount: "0",
      items: [{ product_id: mangoLassi.id, qty: 2 }]
    }));

    expect(newOrder.items.length).toBe(1);
    expect(newOrder.items[0].name).toBe("Mango Lassi");
    expect(newOrder.items[0].qty).toBe(2);
    expect(newOrder.subtotal).toBe("220.00");
    expect(newOrder.cgst).toBe("5.50");
    expect(newOrder.sgst).toBe("5.50");
    expect(newOrder.total).toBe("231.00");

    // 4. Pay Order via UPI
    const receipt = handleMockRoute("post", `/orders/${newOrder.id}/pay`, JSON.stringify({ method: "upi" }));
    expect(receipt.invoice).toMatch(/^INV-\d{4}-\d{6}$/);
    expect(receipt.order.subtotal).toBe("220.00");
    expect(receipt.order.cgst).toBe("5.50");
    expect(receipt.order.sgst).toBe("5.50");
    expect(receipt.order.total).toBe("231.00");
    expect(receipt.order.items.length).toBe(1);
    expect(receipt.order.items[0].name).toBe("Mango Lassi");
    expect(receipt.order.items[0].unit_price).toBe("110.00");

    // 5. Dashboard reflects order
    const dash = handleMockRoute("get", "/reports/dashboard");
    expect(dash.revenue).toBeGreaterThanOrEqual(231);
    expect(dash.orders).toBeGreaterThan(0);
  });
});
