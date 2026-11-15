// Client-side in-browser mock backend for standalone demo on GitHub Pages
export interface MockStore {
  settings: any;
  categories: any[];
  products: any[];
  tables: any[];
  customers: any[];
  inventory: any[];
  orders: any[];
  suppliers: any[];
  employees: any[];
  expenses: any[];
  reservations: any[];
  audit: any[];
}

const DEFAULT_STORE: MockStore = {
  settings: {
    id: 1,
    name: "The Grand Bistro",
    address: "123 Food Street, Bengaluru",
    phone: "+91 98765 43210",
    gst_number: "29AAAAA0000A1Z5",
    currency_symbol: "₹",
    gst_rates: "0,5,12,18,28",
    service_charge_rate: "0",
    receipt_footer: "Thank you for dining with us! Visit again."
  },
  categories: [
    { id: 1, name: "Starters" },
    { id: 2, name: "Main Course" },
    { id: 3, name: "Breads & Rice" },
    { id: 4, name: "Desserts" },
    { id: 5, name: "Beverages" }
  ],
  products: [
    { id: 1, name: "Paneer Tikka", price: "240.00", gst_rate: "5", category_id: 1, available: true, description: "Charcoal grilled cottage cheese with spices" },
    { id: 2, name: "Crispy Corn", price: "180.00", gst_rate: "5", category_id: 1, available: true, description: "Sweet corn tossed with pepper and herbs" },
    { id: 3, name: "Butter Chicken", price: "340.00", gst_rate: "5", category_id: 2, available: true, description: "Tender chicken simmered in rich tomato gravy" },
    { id: 4, name: "Dal Makhani", price: "220.00", gst_rate: "5", category_id: 2, available: true, description: "Slow cooked black lentils with cream" },
    { id: 5, name: "Butter Naan", price: "45.00", gst_rate: "5", category_id: 3, available: true, description: "Clay oven baked flatbread with butter" },
    { id: 6, name: "Jeera Rice", price: "140.00", gst_rate: "5", category_id: 3, available: true, description: "Basmati rice tempered with cumin" },
    { id: 7, name: "Gulab Jamun (2 pcs)", price: "90.00", gst_rate: "5", category_id: 4, available: true, description: "Warm milk dumplings in saffron syrup" },
    { id: 8, name: "Mango Lassi", price: "110.00", gst_rate: "5", category_id: 5, available: true, description: "Thick chilled yogurt with sweet mango" }
  ],
  tables: [
    { id: 1, label: "T1", seats: 4, status: "available" },
    { id: 2, label: "T2", seats: 2, status: "occupied" },
    { id: 3, label: "T3", seats: 6, status: "available" },
    { id: 4, label: "T4", seats: 4, status: "reserved" },
    { id: 5, label: "T5", seats: 4, status: "available" },
    { id: 6, label: "T6", seats: 2, status: "available" }
  ],
  customers: [
    { id: 1, name: "Asha Verma", phone: "9876500001", email: "asha@example.com" },
    { id: 2, name: "Rohit Jain", phone: "9876500002", email: "rohit@example.com" }
  ],
  inventory: [
    { id: 1, name: "Paneer", unit: "kg", quantity: 8.5, reorder_level: 5, supplier_id: 1 },
    { id: 2, name: "Basmati Rice", unit: "kg", quantity: 45, reorder_level: 15, supplier_id: 1 },
    { id: 3, name: "Butter", unit: "kg", quantity: 3.5, reorder_level: 4, supplier_id: 1 },
    { id: 4, name: "Cooking Oil", unit: "l", quantity: 25, reorder_level: 10, supplier_id: 1 }
  ],
  suppliers: [
    { id: 1, name: "Fresh Farms Organics", phone: "9876540001" },
    { id: 2, name: "Metro Dairy Supplies", phone: "9876540002" }
  ],
  employees: [
    { id: 1, name: "Chef Vikram", role: "Head Chef", phone: "9812345670", active: true },
    { id: 2, name: "Rani Sharma", role: "Cashier", phone: "9812345671", active: true },
    { id: 3, name: "Sunil Patel", role: "Captain", phone: "9812345672", active: true }
  ],
  expenses: [
    { id: 1, title: "Vegetable Market Purchase", amount: "1450.00", category: "Raw Materials", date: "2026-11-14" },
    { id: 2, title: "Gas Cylinder Refill", amount: "1150.00", category: "Utilities", date: "2026-11-13" }
  ],
  reservations: [
    { id: 1, customer_name: "Kapil Dev", customer_phone: "9876543299", table_id: 4, party_size: 4, reservation_time: "2026-11-15T20:30", status: "confirmed" }
  ],
  audit: [
    { id: 1, user: "admin", action: "system_init", detail: "RestaurantPOS initialized in demo mode", created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, user: "admin", action: "login", detail: "Admin authenticated", created_at: new Date().toISOString() }
  ],
  orders: [
    {
      id: 101,
      order_number: "ORD-101",
      order_type: "dine_in",
      table_id: 2,
      status: "preparing",
      priority: "rush",
      subtotal: "580.00",
      discount: "0.00",
      cgst: "14.50",
      sgst: "14.50",
      igst: "0.00",
      total: "609.00",
      paid: false,
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      items: [
        { id: 1, product_id: 1, name: "Paneer Tikka", product_name: "Paneer Tikka", qty: 1, unit_price: "240.00", price: "240.00", gst_rate: "5" },
        { id: 2, product_id: 3, name: "Butter Chicken", product_name: "Butter Chicken", qty: 1, unit_price: "340.00", price: "340.00", gst_rate: "5" }
      ]
    },
    {
      id: 100,
      order_number: "ORD-100",
      order_type: "takeaway",
      status: "ready",
      priority: "normal",
      subtotal: "330.00",
      discount: "0.00",
      cgst: "8.25",
      sgst: "8.25",
      igst: "0.00",
      total: "346.50",
      paid: true,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      items: [
        { id: 3, product_id: 4, name: "Dal Makhani", product_name: "Dal Makhani", qty: 1, unit_price: "220.00", price: "220.00", gst_rate: "5" },
        { id: 4, product_id: 8, name: "Mango Lassi", product_name: "Mango Lassi", qty: 1, unit_price: "110.00", price: "110.00", gst_rate: "5" }
      ]
    }
  ]
};

let memoryStore: MockStore | null = null;

function getStore(): MockStore {
  if (memoryStore) return memoryStore;
  try {
    if (typeof window !== "undefined") {
      const raw = window.localStorage?.getItem?.("pos_mock_db_v2");
      if (raw) {
        memoryStore = JSON.parse(raw);
        return memoryStore!;
      }
    }
  } catch {}
  memoryStore = JSON.parse(JSON.stringify(DEFAULT_STORE));
  return memoryStore!;
}

function saveStore(s: MockStore) {
  memoryStore = s;
  try {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem?.("pos_mock_db_v2", JSON.stringify(s));
    }
  } catch {}
}

export function handleMockRoute(method: string, url: string, data?: any, params?: any): any {
  const cleanUrl = url.replace(/^.*\/api/, "").replace(/\?.*$/, "");
  const store = getStore();
  const m = (method || "get").toLowerCase();

  // Parse body properly whether string or JSON object
  let body = data;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      try {
        const sp = new URLSearchParams(body);
        const obj: Record<string, any> = {};
        sp.forEach((v, k) => { obj[k] = v; });
        body = obj;
      } catch {}
    }
  }

  // Auth
  if (cleanUrl === "/auth/login") {
    let role = "admin";
    const u = (body?.username || "").toLowerCase();
    if (u.includes("kitchen")) role = "kitchen";
    else if (u.includes("cashier")) role = "cashier";
    else if (u.includes("manager")) role = "manager";
    else role = "admin";

    store.audit.unshift({
      id: Date.now(),
      user: u || "admin",
      action: "login",
      detail: `Role ${role} authenticated`,
      created_at: new Date().toISOString()
    });
    saveStore(store);

    return { access_token: "mock-jwt-token", refresh_token: "mock-refresh-token", role, token_type: "bearer" };
  }

  if (cleanUrl === "/auth/refresh") {
    return { access_token: "mock-jwt-token", refresh_token: "mock-refresh-token", role: "admin" };
  }

  if (cleanUrl === "/auth/logout" || cleanUrl === "/auth/password") {
    return { message: "ok" };
  }

  // Settings
  if (cleanUrl === "/settings") {
    if (m === "put") {
      store.settings = { ...store.settings, ...body };
      saveStore(store);
      return store.settings;
    }
    return store.settings;
  }

  // Categories
  if (cleanUrl === "/categories") {
    if (m === "post") {
      const item = { id: Date.now(), ...body };
      store.categories.push(item);
      saveStore(store);
      return item;
    }
    return store.categories;
  }

  // Products
  if (cleanUrl.startsWith("/products")) {
    if (cleanUrl.endsWith("/image")) {
      return { message: "Image updated in demo mode." };
    }
    if (m === "get") {
      return store.products;
    }
    if (m === "post") {
      const item = { id: Date.now(), available: true, ...body };
      store.products.push(item);
      saveStore(store);
      return item;
    }
    if (m === "put") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.products = store.products.map((p) => (p.id === id ? { ...p, ...body } : p));
      saveStore(store);
      return body;
    }
    if (m === "delete") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.products = store.products.filter((p) => p.id !== id);
      saveStore(store);
      return { ok: true };
    }
  }

  // Tables
  if (cleanUrl.startsWith("/tables")) {
    if (m === "get") return store.tables;
    if (m === "post") {
      const item = { id: Date.now(), status: "available", ...body };
      store.tables.push(item);
      saveStore(store);
      return item;
    }
    if (m === "patch" || m === "put") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.tables = store.tables.map((t) => (t.id === id ? { ...t, ...body } : t));
      saveStore(store);
      return { ok: true };
    }
    if (m === "delete") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.tables = store.tables.filter((t) => t.id !== id);
      saveStore(store);
      return { ok: true };
    }
  }

  // Customers
  if (cleanUrl.startsWith("/customers")) {
    if (m === "get") {
      const q = params?.q?.toLowerCase();
      if (q) return store.customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
      return store.customers;
    }
    if (m === "post") {
      const item = { id: Date.now(), ...body };
      store.customers.push(item);
      saveStore(store);
      return item;
    }
  }

  // Inventory
  if (cleanUrl.startsWith("/inventory")) {
    if (cleanUrl.includes("/stock")) {
      const id = parseInt(cleanUrl.split("/")[2]);
      const qty = parseFloat(body?.quantity || 1);
      const isUse = body?.kind === "consumption";
      store.inventory = store.inventory.map((inv) =>
        inv.id === id ? { ...inv, quantity: Math.max(0, inv.quantity + (isUse ? -qty : qty)) } : inv
      );
      saveStore(store);
      return { ok: true };
    }
    if (m === "get") return store.inventory;
    if (m === "post") {
      const item = { id: Date.now(), ...body, quantity: 10 };
      store.inventory.push(item);
      saveStore(store);
      return item;
    }
  }

  // Recipes
  if (cleanUrl.startsWith("/recipes")) {
    if (m === "get") return { product_id: 1, ingredients: [] };
    return { ok: true };
  }

  // Orders
  if (cleanUrl.startsWith("/orders")) {
    if (cleanUrl.includes("/status")) {
      const id = parseInt(cleanUrl.split("/")[2]);
      const status = body?.status || "completed";
      store.orders = store.orders.map((o) => (o.id === id ? { ...o, status } : o));
      saveStore(store);
      return { ok: true };
    }
    if (cleanUrl.includes("/priority")) {
      const id = parseInt(cleanUrl.split("/")[2]);
      const priority = params?.priority || "normal";
      store.orders = store.orders.map((o) => (o.id === id ? { ...o, priority } : o));
      saveStore(store);
      return { ok: true };
    }
    if (cleanUrl.includes("/pay")) {
      const id = parseInt(cleanUrl.split("/")[2]);
      const method = body?.method || "cash";
      let ord = store.orders.find((o) => o.id === id);
      if (ord) {
        ord.paid = true;
        ord.status = "preparing";
        if (ord.table_id) {
          const t = store.tables.find((tbl) => tbl.id === ord.table_id);
          if (t) t.status = "occupied";
        }
      }
      saveStore(store);

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(id).padStart(6, "0")}`;
      return {
        invoice: invoiceNumber,
        note: "Simulated payment",
        method,
        order: {
          id,
          order_type: ord?.order_type || "dine_in",
          status: ord?.status || "preparing",
          table_id: ord?.table_id || null,
          subtotal: ord?.subtotal || "0.00",
          discount: ord?.discount || "0.00",
          cgst: ord?.cgst || "0.00",
          sgst: ord?.sgst || "0.00",
          igst: "0.00",
          total: ord?.total || "0.00",
          paid: true,
          priority: ord?.priority || "normal",
          created_at: ord?.created_at || new Date().toISOString(),
          items: (ord?.items || []).map((it: any) => ({
            name: it.name || it.product_name || "Item",
            qty: it.qty || 1,
            unit_price: it.unit_price || it.price || "0.00",
            gst_rate: it.gst_rate || "5"
          }))
        }
      };
    }
    if (m === "get") {
      const st = params?.status;
      if (st) return store.orders.filter((o) => o.status === st);
      return store.orders;
    }
    if (m === "post") {
      const newId = store.orders.length ? Math.max(...store.orders.map((o) => o.id)) + 1 : 101;
      const rawItems = Array.isArray(body?.items) ? body.items : [];
      const lines = rawItems.map((it: any, idx: number) => {
        const prod = store.products.find((p) => p.id === it.product_id);
        const name = prod ? prod.name : `Item #${it.product_id}`;
        const unit_price = prod ? prod.price : "150.00";
        return {
          id: idx + 1,
          product_id: it.product_id,
          name,
          product_name: name,
          qty: it.qty || 1,
          unit_price,
          price: unit_price,
          gst_rate: prod?.gst_rate || "5"
        };
      });

      const subtotalNum = lines.reduce((acc: number, l: any) => acc + parseFloat(l.price) * l.qty, 0);
      const discountNum = parseFloat(body?.discount || "0") || 0;
      const taxable = Math.max(0, subtotalNum - discountNum);
      const taxNum = taxable * 0.05;
      const cgst = (taxNum / 2).toFixed(2);
      const sgst = (taxNum / 2).toFixed(2);
      const total = (taxable + taxNum).toFixed(2);
      const subtotal = subtotalNum.toFixed(2);
      const discount = discountNum.toFixed(2);

      const newOrder = {
        id: newId,
        order_number: `ORD-${newId}`,
        order_type: body?.order_type || "dine_in",
        table_id: body?.table_id || null,
        status: "pending",
        priority: body?.priority || "normal",
        subtotal,
        discount,
        cgst,
        sgst,
        igst: "0.00",
        total,
        paid: false,
        created_at: new Date().toISOString(),
        items: lines
      };

      if (body?.table_id) {
        const t = store.tables.find((tbl) => tbl.id === body.table_id);
        if (t) t.status = "occupied";
      }

      store.orders.unshift(newOrder);
      saveStore(store);
      return newOrder;
    }
  }

  // Reports
  if (cleanUrl.startsWith("/reports/dashboard")) {
    const paidOrders = store.orders.filter((o) => o.paid);
    const totalRev = paidOrders.reduce((acc, o) => acc + parseFloat(o.total || "0"), 0);
    return {
      revenue: totalRev || 4520,
      orders: store.orders.length,
      customers: store.customers.length,
      products: store.products.length,
      daily: [
        { date: "2026-11-09", revenue: 3400 },
        { date: "2026-11-10", revenue: 3100 },
        { date: "2026-11-11", revenue: 4200 },
        { date: "2026-11-12", revenue: 3900 },
        { date: "2026-11-13", revenue: 5100 },
        { date: "2026-11-14", revenue: 4800 },
        { date: "2026-11-15", revenue: totalRev || 4520 }
      ],
      popular: [
        { name: "Butter Chicken", qty: 28 },
        { name: "Paneer Tikka", qty: 24 },
        { name: "Butter Naan", qty: 45 },
        { name: "Mango Lassi", qty: 19 }
      ],
      recent: paidOrders.slice(0, 5).map((o, idx) => ({
        id: idx + 1,
        order_id: o.id,
        method: "UPI",
        amount: o.total
      })),
      low_stock: store.inventory.filter((i) => i.quantity <= i.reorder_level)
    };
  }

  if (cleanUrl.startsWith("/reports/sales")) {
    return {
      total_sales: 12450,
      total_tax: 622.5,
      items: [
        { name: "Butter Chicken", qty: 22, total: 7480 },
        { name: "Paneer Tikka", qty: 18, total: 4320 },
        { name: "Butter Naan", qty: 35, total: 1575 }
      ]
    };
  }
  if (cleanUrl.startsWith("/reports/payments")) return [{ method: "Cash", total: 4500 }, { method: "UPI", total: 6200 }, { method: "Card", total: 1750 }];
  if (cleanUrl.startsWith("/reports/inventory")) return store.inventory;
  if (cleanUrl.startsWith("/reports/profit")) return { sales: 12450, food_cost: 4100, expenses: 2600, gross_profit: 5750 };

  // Team / Employees
  if (cleanUrl.startsWith("/employees")) {
    if (cleanUrl.includes("/attendance")) return { ok: true };
    if (m === "get") return store.employees;
    if (m === "post") {
      const item = { id: Date.now(), active: true, ...body };
      store.employees.push(item);
      saveStore(store);
      return item;
    }
    if (m === "put") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.employees = store.employees.map((e) => (e.id === id ? { ...e, ...body } : e));
      saveStore(store);
      return body;
    }
    if (m === "delete") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.employees = store.employees.filter((e) => e.id !== id);
      saveStore(store);
      return { ok: true };
    }
  }

  // Suppliers
  if (cleanUrl.startsWith("/suppliers")) {
    if (m === "get") return store.suppliers;
    if (m === "post") {
      const item = { id: Date.now(), ...body };
      store.suppliers.push(item);
      saveStore(store);
      return item;
    }
    if (m === "delete") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.suppliers = store.suppliers.filter((s) => s.id !== id);
      saveStore(store);
      return { ok: true };
    }
  }

  // Expenses
  if (cleanUrl.startsWith("/expenses")) {
    if (m === "get") return store.expenses;
    if (m === "post") {
      const item = { id: Date.now(), ...body };
      store.expenses.push(item);
      saveStore(store);
      return item;
    }
    if (m === "delete") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.expenses = store.expenses.filter((e) => e.id !== id);
      saveStore(store);
      return { ok: true };
    }
  }

  // Reservations
  if (cleanUrl.startsWith("/reservations")) {
    if (m === "get") return store.reservations;
    if (m === "post") {
      const item = { id: Date.now(), status: "confirmed", ...body };
      store.reservations.push(item);
      saveStore(store);
      return item;
    }
    if (m === "patch") {
      const id = parseInt(cleanUrl.split("/")[2]);
      store.reservations = store.reservations.map((r) => (r.id === id ? { ...r, ...body } : r));
      saveStore(store);
      return { ok: true };
    }
  }

  // Audit
  if (cleanUrl.startsWith("/audit")) {
    return store.audit;
  }

  // Users (Admin)
  if (cleanUrl.startsWith("/users")) {
    if (m === "get") {
      return [
        { id: 1, username: "admin", full_name: "Administrator", role: "admin", active: true },
        { id: 2, username: "manager", full_name: "Store Manager", role: "manager", active: true },
        { id: 3, username: "cashier1", full_name: "Cashier One", role: "cashier", active: true },
        { id: 4, username: "kitchen1", full_name: "Kitchen Head", role: "kitchen", active: true }
      ];
    }
    return { ok: true };
  }

  // Fallback
  return { ok: true };
}
