/* Gameplay logic tests: simulate a (perfect) service and assert the core
 * loop progresses, plus penalty/combo behaviour. No browser required. */
const { loadGame, makeAsserter } = require("./harness");

const { HK, ctx } = loadGame();
const { assert, done } = makeAsserter("logic.test");

// --- start night 1
HK.state.levelIndex = 0;
HK.startLevel();
HK.state.mode = HK.MODE.PLAY;
assert(HK.state.stations.length === 2, "night 1 has 2 cook stations");
assert(HK.state.servers.length === 1, "night 1 has 1 server");

// --- drive a perfect player to clear the night
let ticks = 0, fired = 0, plated = 0;
const goldenMid = (HK.FLIP.goldenStart + HK.FLIP.goldenEnd) / 2;
while (HK.state.mode === HK.MODE.PLAY && ticks < 4000) {
  HK.engine.update(16);
  HK.render(ctx, ticks * 16); // render path must not throw during play
  if (HK.engine.assignOldest()) fired++;
  for (const st of HK.state.stations)
    if (st.phase === "cook" && !st.flipped && st.sweep >= goldenMid) HK.engine.flip(st);
  const ap = HK.engine.activePlateStation();
  if (ap) { HK.engine.plate(ap.ticket.recipe.topping); plated++; }
  if (ticks % 900 === 0) HK.engine.expedite();
  if (ticks % 700 === 0) HK.engine.sousChef();
  ticks++;
}
assert(fired > 0, "tickets were fired to the griddle (" + fired + ")");
assert(plated > 0, "dishes were plated (" + plated + ")");
assert(HK.state.served > 0, "customers were served (" + HK.state.served + ")");
assert(
  HK.state.mode === HK.MODE.LEVEL_CLEAR || HK.state.mode === HK.MODE.WIN,
  "a perfect player clears the night (mode=" + HK.state.mode + ")"
);
assert(HK.state.rep > 0, "no reputation lost on a perfect run (rep=" + HK.state.rep + ")");

// --- wrong topping penalises + breaks combo
HK.newGame(); HK.state.levelIndex = 0; HK.startLevel(); HK.state.mode = HK.MODE.PLAY;
const st = HK.state.stations[0];
st.phase = "plate"; st.result = "perfect"; st.t = 100;
st.ticket = { id: HK.uid(), recipe: { item: "pancake", flavor: "plain", topping: "syrup" }, customerId: 999, tableId: 1, status: "cooking" };
HK.state.combo = 3;
const before = HK.state.moneyThisLevel;
const wrongTop = HK.state.level.toppings.find((t) => t !== "syrup");
HK.engine.plate(wrongTop);
assert(HK.state.combo === 0, "wrong topping resets the combo");
assert(HK.state.moneyThisLevel < before, "wrong topping costs money");

// --- a missed flip burns the dish and breaks the combo
HK.newGame(); HK.state.levelIndex = 0; HK.startLevel(); HK.state.mode = HK.MODE.PLAY;
const s2 = HK.state.stations[0];
s2.phase = "cook"; s2.flipped = false; s2.result = null; s2.cookMs = 2000; s2.sweep = 0.99;
s2.ticket = { id: HK.uid(), recipe: { item: "waffle", flavor: "plain", topping: "syrup" }, customerId: 1, tableId: 1, status: "cooking" };
HK.state.combo = 5;
HK.engine.update(16); // pushes sweep past the window -> burnt
assert(s2.result === "burnt", "missing the flip window burns the dish");
assert(HK.state.combo === 0, "a burnt dish breaks the combo");

done();
