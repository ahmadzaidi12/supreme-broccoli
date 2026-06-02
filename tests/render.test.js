/* Render-safety tests. These render every food / topping / character
 * through a STRICT canvas that throws on negative or non-finite radii
 * (exactly what froze the game: a whipped-cream dollop radius going
 * negative when a server carried the dish at a small size). If any draw
 * call passes a bad value to the canvas, these tests fail loudly. */
const { loadGame, makeAsserter } = require("./harness");
const { makeStrictCtx } = require("./strict-canvas");

const { HK } = loadGame(makeStrictCtx);
const { assert, done } = makeAsserter("render.test");

const strict = makeStrictCtx();

// 0) sanity: the strict canvas really is strict
let threw = false;
try { strict.arc(0, 0, -1, 0, 7); } catch (e) { threw = true; }
assert(threw, "strict canvas throws on a negative arc radius (guard works)");

const items = Object.keys(HK.ITEMS);
const flavors = Object.keys(HK.FLAVORS);
const toppings = Object.keys(HK.TOPPINGS);
// includes the tiny sizes used for dishes carried by servers / on the pass
const sizes = [8, 9, 10, 11, 12, 14, 16, 20, 22, 28, 34];

function safe(label, fn) {
  try { fn(); return true; }
  catch (e) { console.error("    ↳ " + label + ": " + e.message); return false; }
}

// 1) every topping at every size (this is the exact bug class)
let toppingOk = true;
for (const t of toppings)
  for (const s of sizes)
    toppingOk = safe(`topping ${t} @ s=${s}`, () => HK.drawTopping(strict, 100, 100, s, t)) && toppingOk;
assert(toppingOk, "every topping renders at every size without a bad radius");

// 2) every food = item x flavor x topping, plated and bare, across sizes
let foodOk = true;
for (const item of items)
  for (const flavor of flavors)
    for (const topping of toppings)
      for (const s of sizes) {
        const recipe = { item, flavor, topping };
        foodOk = safe(`food ${item}/${flavor}/${topping} @ s=${s} (plated)`, () => HK.drawFood(strict, 100, 100, recipe, { s })) && foodOk;
        foodOk = safe(`food ${item}/${flavor}/${topping} @ s=${s} (bare)`, () => HK.drawFood(strict, 100, 100, recipe, { s, plate: false })) && foodOk;
      }
assert(foodOk, "every item x flavor x topping renders at every size");

// 3) the cast: cooks, servers, customers, steam — all sizes & moods
let castOk = true;
const moods = ["happy", "neutral", "stressed", "angry"];
for (const s of sizes) {
  for (const m of moods) {
    castOk = safe(`cook s=${s} ${m}`, () => HK.drawCook(strict, 100, 100, { s, skin: 0, mood: m, bob: 1, sweat: 1 })) && castOk;
    castOk = safe(`server s=${s} ${m}`, () => HK.drawServer(strict, 100, 100, { s, skin: 1, mood: m, bob: 1 })) && castOk;
    castOk = safe(`customer s=${s} ${m}`, () => HK.drawCustomer(strict, 100, 100, { s, skin: 2, mood: m, bob: 1 })) && castOk;
  }
  castOk = safe(`steam s=${s}`, () => HK.drawSteam(strict, 100, 100, 1234, 1)) && castOk;
}
assert(castOk, "all characters + steam render at every size and mood");

// 4) full-scene regression: a server actually CARRYING each topping/item
//    (the precise path that froze the live game), rendered via HK.render
let sceneOk = true;
for (const item of items) {
  for (const topping of toppings) {
    HK.newGame(); HK.state.levelIndex = HK.LEVELS.length - 1; HK.startLevel();
    HK.state.mode = HK.MODE.PLAY;
    const sv = HK.state.servers[0];
    sv.dish = { recipe: { item, flavor: "plain", topping }, quality: "perfect", customerId: 1, tableId: 1 };
    sv.state = "toTable";
    // also put a plated dish on the pass + stations in every phase
    HK.state.dishesAtPass.push({ recipe: { item, flavor: "chocchip", topping }, quality: "okay", customerId: 1, tableId: 1, x: 480, y: 372 });
    sceneOk = safe(`scene carry ${item}/${topping}`, () => HK.render(strict, 999)) && sceneOk;
  }
}
assert(sceneOk, "full HK.render is safe with servers carrying every dish (the freeze repro)");

// 5) render every phase of a station through a scripted playthrough
HK.newGame(); HK.state.levelIndex = 2; HK.startLevel(); HK.state.mode = HK.MODE.PLAY;
let playOk = true;
const goldenMid = (HK.FLIP.goldenStart + HK.FLIP.goldenEnd) / 2;
for (let i = 0; i < 1500 && playOk; i++) {
  HK.engine.update(16);
  playOk = safe(`render frame ${i}`, () => HK.render(strict, i * 16)) && playOk;
  HK.engine.assignOldest();
  for (const st of HK.state.stations)
    if (st.phase === "cook" && !st.flipped && st.sweep >= goldenMid) HK.engine.flip(st);
  const ap = HK.engine.activePlateStation();
  if (ap) HK.engine.plate(ap.ticket.recipe.topping);
}
assert(playOk, "render stays safe across a full simulated playthrough (1500 frames)");

done();
