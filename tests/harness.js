/* Shared test harness: stub the browser just enough to load the game's
 * plain scripts (which attach to window.HK), and return the HK namespace.
 * Pass a ctxFactory to control which 2D context the canvas hands out. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

function noop() {}

function loadGame(ctxFactory) {
  const ctx = (ctxFactory || (() => makeNoopCtx()))();
  const canvas = {
    width: 960,
    height: 600,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
    addEventListener: noop,
  };
  const overlay = { innerHTML: "", classList: { add: noop, remove: noop }, addEventListener: noop };
  const muteBtn = { addEventListener: noop, textContent: "" };

  global.window = global;
  global.addEventListener = noop;
  global.document = {
    getElementById: (id) => (id === "game" ? canvas : id === "overlay" ? overlay : muteBtn),
  };
  global.navigator = {};
  global.requestAnimationFrame = () => 1; // tests drive update()/render() manually
  global.performance = global.performance || { now: () => Date.now() };

  const files = ["config", "state", "audio", "characters", "render", "engine", "input", "main"];
  for (const f of files) {
    const code = fs.readFileSync(path.join(__dirname, "..", "js", f + ".js"), "utf8");
    vm.runInThisContext(code, { filename: f + ".js" });
  }
  return { HK: global.HK, ctx };
}

/* permissive context for logic tests: every method/gradient is a no-op */
function makeNoopCtx() {
  const grad = { addColorStop: noop };
  return new Proxy({}, {
    get: (t, p) => (p in t ? t[p] : p === "createLinearGradient" || p === "createRadialGradient" ? () => grad : p === "measureText" ? () => ({ width: 8 }) : () => undefined),
    set: (t, p, v) => ((t[p] = v), true),
  });
}

/* tiny assertion helpers shared by the test files */
function makeAsserter(label) {
  let fail = 0;
  const assert = (cond, msg) => {
    if (!cond) { console.error("  ✗ " + msg); fail++; }
    else console.log("  ✓ " + msg);
  };
  const done = () => {
    console.log(fail ? `\n${label} FAILED (${fail})` : `\n${label}: all passed`);
    if (fail) process.exitCode = 1;
    return fail === 0;
  };
  return { assert, done, fails: () => fail };
}

module.exports = { loadGame, makeNoopCtx, makeAsserter };
