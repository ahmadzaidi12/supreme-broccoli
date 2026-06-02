/* Repro: play with REAL pointer clicks in headless Chromium and capture
 * any exception that kills the rAF loop (symptom: clicks stop working).
 * Needs a static server on :8000. Run: node tools/repro.js */
process.env.NODE_PATH = require("child_process").execSync("npm root -g").toString().trim();
require("module").Module._initPaths();
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
  const errors = []; // real JS exceptions only
  page.on("pageerror", (e) => errors.push(e.stack || String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/ERR_CERT|Failed to load resource|fonts\.googleapis|fonts\.gstatic/.test(t)) return; // ignore font CDN noise
    errors.push("console: " + t);
  });

  await page.goto("http://localhost:8000/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.click('[data-act="start"]');
  await page.waitForTimeout(200);
  await page.click('[data-act="begin"]');

  // helper that runs in-page: dispatch a real pointerdown at a hot-zone center
  const clickZone = async (pick) =>
    page.evaluate((pick) => {
      const c = document.getElementById("game");
      const rect = c.getBoundingClientRect();
      const zones = HK.hot || [];
      let z = null;
      if (pick === "flip") z = zones.find((q) => q.type === "station");
      else if (pick === "topping") {
        const ap = HK.engine.activePlateStation();
        if (ap) z = zones.find((q) => q.type === "topping" && q.ref === ap.ticket.recipe.topping);
      } else if (pick === "ticket") z = zones.find((q) => q.type === "ticket");
      else if (pick === "power") z = zones.find((q) => q.type === "expedite" || q.type === "sous");
      if (!z) return false;
      const cx = rect.left + (z.x + z.w / 2) * (rect.width / c.width);
      const cy = rect.top + (z.y + z.h / 2) * (rect.height / c.height);
      const ev = new PointerEvent("pointerdown", { clientX: cx, clientY: cy, bubbles: true, cancelable: true });
      c.dispatchEvent(ev);
      return true;
    }, pick);

  const snapshot = () =>
    page.evaluate(() => ({
      mode: HK.state.mode,
      served: HK.state.served,
      rep: HK.state.rep,
      stations: HK.state.stations.map((s) => s.phase),
      fx: HK.state.fx.length,
      customers: HK.state.customers.length,
      tickets: HK.state.tickets.length,
    }));

  let lastTime = null, stalled = 0;
  for (let i = 0; i < 400 && errors.length === 0; i++) {
    // act: flip when possible, plate, fire tickets, sometimes powers
    await clickZone("flip");
    await clickZone("topping");
    if (i % 2 === 0) await clickZone("ticket");
    if (i % 25 === 0) { await page.keyboard.press("e"); await page.keyboard.press("s"); }
    await page.waitForTimeout(90);

    // detect a frozen loop: during PLAY, engine time advances every frame
    const st = await page.evaluate(() => ({ t: HK.state.time, mode: HK.state.mode }));
    if (st.mode === "play") {
      if (st.t === lastTime) stalled++; else stalled = 0;
      lastTime = st.t;
      if (stalled > 4) { errors.push("LOOP STALLED (engine time frozen at " + st.t + ") at iter " + i); break; }
    }

    if (i % 40 === 0) console.log("iter", i, JSON.stringify(await snapshot()));
  }

  console.log("\nFINAL", JSON.stringify(await snapshot()));
  console.log(errors.length ? "\n=== ERRORS ===\n" + errors.slice(0, 3).join("\n\n") : "\nNO ERRORS CAPTURED");
  await browser.close();
})();
