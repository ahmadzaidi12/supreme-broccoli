/* Launch the game in headless Chromium, play a few seconds, and capture
 * screenshots of the menu and live gameplay. Run: node tools/screenshot.js
 * (expects a static server on http://localhost:8000). */
process.env.NODE_PATH = require("child_process").execSync("npm root -g").toString().trim();
require("module").Module._initPaths();
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 720 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto("http://localhost:8000/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "tools/shot-menu.png" });

  // start service and play to a busy moment, acting as a decent player
  await page.evaluate(() => {
    HK.state.levelIndex = 1; // brunch rush — more going on for the shot
    HK.startLevel();
    HK.state.mode = HK.MODE.PLAY;
    document.getElementById("overlay").classList.remove("show");
  });

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const goldenMid = (HK.FLIP.goldenStart + HK.FLIP.goldenEnd) / 2;
    for (let i = 0; i < 220; i++) {
      HK.engine.assignOldest();
      for (const st of HK.state.stations)
        if (st.phase === "cook" && !st.flipped && st.sweep >= goldenMid) HK.engine.flip(st);
      const ap = HK.engine.activePlateStation();
      // plate ~70% of the time so a couple linger for the shot
      if (ap && Math.random() < 0.7) HK.engine.plate(ap.ticket.recipe.topping);
      await sleep(16);
    }
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: "tools/shot-play.png" });

  await browser.close();
  console.log(errors.length ? "PAGE ERRORS:\n" + errors.join("\n") : "no page errors");
})();
