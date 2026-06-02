# 🥞 Flippin' Chaos — Breakfast Kitchen

A fast, chaotic, **cute-but-not-too-cute** restaurant game in the spirit of
Hell's Kitchen. You're the **head chef** running a breakfast joint: fire
tickets, flip pancakes & waffles in the golden zone, plate the right toppings,
and keep your brigade of cooks and servers moving before hangry customers
storm out. Chef yells. It gets loud.

Built as a zero-dependency HTML5 Canvas game and an installable **PWA** —
runs on desktop and mobile, online or offline.

---

## ▶️ Play

**Quickest way:** open `index.html` in any modern browser.

**Recommended (enables the PWA / service worker):** serve over `localhost`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### Install on your phone (PWA)
A service worker (`sw.js`) + `manifest.webmanifest` make the game installable
and fully offline. Service workers require a **secure context**, so:

1. Deploy the repo to any HTTPS host. The easiest is **GitHub Pages** —
   in the repo: *Settings → Pages → Build from branch* and pick this branch /
   root. You'll get a `https://…github.io/…` URL.
2. Open that URL on your phone → browser menu → **Add to Home Screen** /
   **Install app**. It launches fullscreen in landscape like a native app.

---

## 🎮 How to play

You direct the whole kitchen from the pass:

1. **Fire a ticket** — tap an order in the top rail to send it to a free
   griddle. (Each griddle is one of your cooks.)
2. **Flip in the golden zone** — a sweep bar fills under each sizzling
   griddle. Tap the griddle when the marker hits the **green** band for a
   *Perfect*, the **yellow** for an *OK*. Miss it and it **BURNS**. 🔥
3. **Plate it** — when a dish is cooked, the matching **topping button**
   pulses green. Tap it to plate. Wrong topping = unhappy customer + penalty.
4. **Servers** automatically run plated dishes to the right table. Multi-item
   orders aren't happy until *every* dish is delivered.
5. **Watch the patience bars.** When one empties, the customer walks out, you
   lose a ❤️, and Chef lets you know about it.

### Head-chef powers
- **Expedite** (`E`) — "MOVE IT!" Speeds up the whole line and freezes
  customer patience for a few seconds. *(on cooldown)*
- **Sous Chef** (`S`) — your number two perfectly flips the griddle that's
  closest to burning, or instantly plates the dish at the pass. *(on cooldown)*

**Keys:** `E` Expedite · `S` Sous Chef · `Space`/`F` flip the most urgent
griddle (or fire the next ticket) · 🔊 button mutes.

### Scoring & progression
- Perfect cooks, fast service and **combo streaks** earn the most money + tips.
- Clear each **night** by serving its quota of happy tables.
- Run out of ❤️ (too many walkouts) and the kitchen gets **86'd**.
- Nights unlock more of the menu and ramp up the chaos:

| Night | Theme | Unlocks |
|------:|-------|---------|
| 1 | Opening Night | Pancakes & Waffles |
| 2 | Brunch Rush | Choc-chip, more tables, a 2nd server |
| 3 | French Toast Fridays | French Toast, red velvet, more toppings |
| 4 | The Omelette Station | Omelettes, matcha, 3-item orders |
| 5 | Dinner Service from Hell | Full house, everything, max pace |

---

## 🛠 Project structure

```
index.html              # shell + script/PWA tags
css/style.css           # responsive layout (scales to phones, edge-to-edge when installed)
manifest.webmanifest    # PWA manifest
sw.js                   # service worker (offline precache)
icons/                  # generated app icons (192 / 512 / 180)
js/
  config.js             # all tunable data: items, flavors, toppings, levels
  state.js              # per-session game state + level setup
  audio.js              # tiny synthesized WebAudio SFX (no asset files)
  characters.js         # procedural "cute-but-chaotic" art (chefs, food, fx)
  render.js             # per-frame drawing + clickable hot-zones
  engine.js             # simulation: spawning, cooking, serving, scoring, powers
  input.js              # pointer + keyboard handling (touch friendly)
  main.js               # boot, game loop, overlay screens, PWA registration
tests/
  harness.js            # loads the game headlessly (stubs the browser)
  strict-canvas.js      # canvas that throws on bad radii, like a real browser
  logic.test.js         # gameplay sim: fire->cook->flip->plate->serve->clear
  render.test.js        # renders every food/topping/character — catches draw bugs
tools/
  gen_icons.py          # regenerate the app icons (pure stdlib PNG encoder)
  repro.js              # real-click freeze repro in headless Chromium (Playwright)
  screenshot.js         # headless gameplay screenshots (needs Playwright)
.github/workflows/
  ci.yml                # runs `npm test` on every push + PR
  pages.yml             # deploys to GitHub Pages on push to main
```

### Extending the menu
Adding a breakfast item, flavor, topping, or a whole new night is mostly a
**data change in `js/config.js`** — the engine is generic. New food just needs
a small draw routine in `characters.js`.

### Tests
Pure-Node, zero dependencies, and run in CI on every push/PR:
```bash
npm test                    # logic + render-safety suites
```
- **logic** — drives a perfect service and asserts the loop clears a night,
  plus combo/penalty/burn rules.
- **render** — draws every item × flavor × topping and every character at all
  sizes through a *strict canvas* that throws on negative/non-finite radii.
  This catches the class of bug that once froze the game (a whipped-cream
  dollop radius going negative when a server carried the dish at a small size,
  which threw inside the animation loop and stopped clicks registering).

Deeper local end-to-end (needs Playwright):
```bash
python3 -m http.server 8000 & node tools/repro.js   # real-click freeze repro
python3 tools/gen_icons.py                           # rebuild app icons
```
