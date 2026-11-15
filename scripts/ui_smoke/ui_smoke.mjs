// Real-browser click-through (cashier -> kitchen -> admin). Usage: SEED_PW=... node ui_smoke.mjs
// On macOS set CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome". Linux without Chrome falls back to @sparticuz/chromium.
import puppeteer from "puppeteer-core";
const cp = process.env.CHROME_PATH;
const chromium = cp ? null : (await import("@sparticuz/chromium")).default;
const b = await puppeteer.launch(cp ? { executablePath: cp, headless: "new" } : { args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" });
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 820 });
const problems = [], ok = [];
p.on("pageerror", e => problems.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") problems.push("console: " + m.text().slice(0, 160)); });
p.on("response", r => { if (r.status() >= 400 && !r.url().includes("/auth/login")) problems.push(`http ${r.status()} ${r.url()}`); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const check = (n, c) => { (c ? ok : problems).push(c ? "PASS " + n : "FAIL " + n); };
const text = () => p.evaluate(() => document.body.innerText);
const shot = n => p.screenshot({ path: `./shots/${n}.png` });
const click = async t => { const el = (await p.$(`button::-p-text(${t})`)) || (await p.$(`a::-p-text(${t})`)); if (!el) throw new Error("no clickable: " + t); await el.click(); };
async function login(u) {
  await p.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle0" });
  const ins = await p.$$("input"); await ins[0].type(u); await ins[1].type((process.env.SEED_PW || "demo-pass-123")); await click("Sign in"); await sleep(1500);
}
const logout = async () => { await click("Log out"); await sleep(500); };

await p.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle0" }); await shot("01-login");
check("login page renders", (await text()).includes("Sign in to RestaurantPOS"));
await login("cashier1"); await shot("02-billing");
check("cashier lands on billing with menu", (await text()).includes("Starters Item 1"));
check("cashier has no Dashboard link", !(await text()).includes("Dashboard"));
await click("Starters Item 1"); await click("Starters Item 1"); await sleep(300);
await p.select('select[aria-label="Order type"]', "takeaway"); await shot("03-cart");
await click("Pay cash"); await sleep(1500); await shot("04-receipt");
const t = await text(); check("receipt shows invoice + GST split", t.includes("Tax Invoice INV-") && t.includes("CGST") && t.includes("SGST"));
await click("Done"); await logout();

await login("kitchen1"); await sleep(1500); await shot("05-kitchen");
const k = await text(); check("kitchen sees the order and is Live", k.includes("Starters Item 1") && k.includes("Live"));
check("kitchen only has Kitchen link", !k.includes("Billing") && !k.includes("Dashboard"));
await click("Start"); await sleep(1200); await shot("06-kitchen-preparing");
check("order moved to Preparing", (await text()).includes("Preparing (1)"));
await logout();

await login("admin"); await sleep(1500); await shot("07-dashboard");
const d = await text(); check("dashboard shows revenue and popular dish", d.includes("Revenue") && d.includes("Starters Item 1"));
for (const [name, link, expect] of [["menu", "Menu", "Add dish"], ["inventory", "Inventory", "Add ingredient"], ["reports", "Reports", "Payments by method"], ["settings", "Settings", "Staff accounts"], ["audit", "Audit", "login"]]) {
  await p.click(`nav a::-p-text(${link}), header a::-p-text(${link})`); await sleep(1200); await shot("08-" + name);
  check(`admin ${name} screen loads`, (await text()).includes(expect));
}
await b.close();
console.log(ok.join("\n")); console.log("\nPROBLEMS:", problems.length ? "\n" + problems.join("\n") : "none");
