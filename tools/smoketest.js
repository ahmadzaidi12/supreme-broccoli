/* Headless smoke test: stub the browser, load the game scripts, then
 * drive the simulation like a (perfect) player and assert it progresses.
 * Run: node tools/smoketest.js */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

// --- stub a 2D context: every method is a no-op that returns the proxy
function makeCtx() {
  const store = {};
  const proxy = new Proxy(store, {
    get(t, p) {
      if (p in t) return t[p];
      return () => proxy; // methods (incl. gradients) return the proxy
    },
    set(t, p, v) { t[p] = v; return true; },
  });
  return proxy;
}
const ctx = makeCtx();

const canvas = {
  width: 960, height: 600,
  getContext: () => ctx,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
  addEventListener() {},
};
const overlay = {
  innerHTML: "",
  classList: { add() {}, remove() {} },
  addEventListener() {},
};
const muteBtn = { addEventListener() {}, textContent: "" };

global.window = global;
global.addEventListener = () => {}; // window.addEventListener (window === global)
global.document = {
  getElementById: (id) =>
    id === "game" ? canvas : id === "overlay" ? overlay : muteBtn,
};
global.navigator = {}; // no serviceWorker -> registration skipped
global.requestAnimationFrame = () => 1; // we drive update() manually
global.performance = global.performance || { now: () => Date.now() };

// load scripts in index.html order
const files = ["config", "state", "audio", "characters", "render", "engine", "input", "main"];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, "..", "js", f + ".js"), "utf8");
  vm.runInThisContext(code, { filename: f + ".js" });
}

const HK = global.HK;
let fail = 0;
const assert = (c, m) => { if (!c) { console.error("  ✗ " + m); fail++; } else console.log("  ✓ " + m); };

// --- begin a service on level 1
HK.state.levelIndex = 0;
HK.startLevel();
HK.state.mode = HK.MODE.PLAY;
assert(HK.state.stations.length === 2, "level 1 has 2 cooks/stations");
assert(HK.state.servers.length === 1, "level 1 has 1 server");

// --- drive a "perfect" player for up to ~60s of game time
let ticks = 0, plated = 0, fired = 0;
const goldenMid = (HK.FLIP.goldenStart + HK.FLIP.goldenEnd) / 2;
while (HK.state.mode === HK.MODE.PLAY && ticks < 4000) {
  HK.engine.update(16);
  HK.render(ctx, ticks * 16); // exercise the render path too

  // fire any waiting ticket onto a free griddle
  if (HK.engine.assignOldest()) fired++;

  // flip cooking stations when the marker reaches the golden zone
  for (const st of HK.state.stations) {
    if (st.phase === "cook" && !st.flipped && st.sweep >= goldenMid) HK.engine.flip(st);
  }

  // plate the active station with the CORRECT topping
  const ap = HK.engine.activePlateStation();
  if (ap) { HK.engine.plate(ap.ticket.recipe.topping); plated++; }

  // exercise powers occasionally
  if (ticks % 900 === 0) HK.engine.expedite();
  if (ticks % 700 === 0) HK.engine.sousChef();

  ticks++;
}

assert(fired > 0, "tickets were fired to the griddle (" + fired + ")");
assert(plated > 0, "dishes were plated (" + plated + ")");
assert(HK.state.served > 0, "customers were served happily (" + HK.state.served + ")");
assert(
  HK.state.mode === HK.MODE.LEVEL_CLEAR || HK.state.mode === HK.MODE.WIN,
  "a perfect player clears the night (mode=" + HK.state.mode + ", served=" + HK.state.served + "/" + HK.LEVELS[0].quota + ")"
);
assert(HK.state.rep > 0, "no reputation lost on a perfect run (rep=" + HK.state.rep + ")");

// --- topping mismatch should penalise + break combo
HK.newGame(); HK.state.levelIndex = 0; HK.startLevel(); HK.state.mode = HK.MODE.PLAY;
// push a station straight into plate phase
const st = HK.state.stations[0];
st.phase = "plate"; st.result = "perfect"; st.t = 100;
st.ticket = { id: HK.uid(), recipe: { item: "pancake", flavor: "plain", topping: "syrup" }, customerId: 999, tableId: 1, status: "cooking" };
HK.state.combo = 3;
const before = HK.state.moneyThisLevel;
const wrongTop = HK.state.level.toppings.find((t) => t !== "syrup");
HK.engine.plate(wrongTop);
assert(HK.state.combo === 0, "wrong topping resets the combo");
assert(HK.state.moneyThisLevel < before, "wrong topping costs money");

console.log(fail ? `\nSMOKE TEST FAILED (${fail})` : "\nALL SMOKE TESTS PASSED");
process.exit(fail ? 1 : 0);
