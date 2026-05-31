/* =====================================================================
 * state.js — the single source of truth for a play session.
 * Holds the brigade (cooks, servers, sous), stations, tickets,
 * customers, score, reputation, power cooldowns and screen mode.
 * ===================================================================== */
(function () {
  const HK = (window.HK = window.HK || {});

  HK.MODE = {
    MENU: "menu",
    INTRO: "intro",
    PLAY: "play",
    LEVEL_CLEAR: "levelClear",
    GAME_OVER: "gameOver",
    WIN: "win",
  };

  let _uid = 1;
  HK.uid = () => _uid++;

  HK.state = null;

  /* Build a fresh whole-game state (starts at level index 0). */
  HK.newGame = function () {
    HK.state = {
      mode: HK.MODE.MENU,
      levelIndex: 0,
      totalMoney: 0,
      rep: HK.START_REP,
      // per-level fields filled by startLevel()
      level: null,
      tickets: [],
      stations: [],
      cooks: [],
      servers: [],
      customers: [],
      tables: [],
      dishesAtPass: [],
      served: 0, // happy customers this level
      moneyThisLevel: 0,
      combo: 0,
      bestCombo: 0,
      time: 0, // ms elapsed this level
      spawnTimer: 0,
      powers: { expediteCd: 0, expediteDur: 0, sousCd: 0 },
      fx: [], // floating particles / popups
      shake: 0,
      flashRamsay: null, // {text, t}
    };
    return HK.state;
  };

  /* Configure state for the level at the current levelIndex. */
  HK.startLevel = function () {
    const s = HK.state;
    const L = HK.LEVELS[s.levelIndex];
    s.level = L;
    s.tickets = [];
    s.customers = [];
    s.dishesAtPass = [];
    s.served = 0;
    s.moneyThisLevel = 0;
    s.combo = 0;
    s.time = 0;
    s.spawnTimer = 900; // small grace before first order
    s.fx = [];
    s.shake = 0;
    s.flashRamsay = null;
    s.powers = { expediteCd: 0, expediteDur: 0, sousCd: 0 };

    // --- stations (griddles), one per cook ---
    s.stations = [];
    s.cooks = [];
    const gap = 200;
    const startX = HK.W / 2 - (gap * (L.cooks - 1)) / 2;
    for (let i = 0; i < L.cooks; i++) {
      const x = startX + i * gap;
      const y = 252;
      s.stations.push({
        id: HK.uid(),
        x,
        y,
        phase: "idle", // idle | pour | cook | plate | done
        ticket: null, // ticket being worked
        itemIdx: 0, // which item in a multi-item order
        t: 0, // phase timer
        cookMs: 0, // total cook time for current item
        sweep: 0, // 0..1 flip indicator
        flipped: false,
        result: null, // perfect | okay | burnt
        sous: false, // sous chef assisting this station
      });
      s.cooks.push({
        id: HK.uid(),
        station: i,
        skin: i % HK.COLORS.skin.length,
        sweat: 0,
        bob: Math.random() * Math.PI * 2,
      });
    }

    // --- dining tables ---
    s.tables = [];
    const tableCount = Math.min(6, 3 + s.levelIndex);
    const tGap = HK.W / (tableCount + 1);
    for (let i = 0; i < tableCount; i++) {
      s.tables.push({
        id: HK.uid(),
        x: tGap * (i + 1),
        y: 530,
        occupied: false,
        customer: null,
      });
    }

    // --- servers idle at the pass ---
    s.servers = [];
    for (let i = 0; i < L.servers; i++) {
      s.servers.push({
        id: HK.uid(),
        x: HK.W / 2 + (i - (L.servers - 1) / 2) * 90,
        y: 452,
        homeX: HK.W / 2 + (i - (L.servers - 1) / 2) * 90,
        homeY: 452,
        skin: (i + 2) % HK.COLORS.skin.length,
        state: "idle", // idle | toTable | back
        dish: null,
        targetTable: null,
        bob: Math.random() * Math.PI * 2,
      });
    }
  };

  /* Pick a random recipe (item + flavor + topping) from the level menu. */
  HK.randomItem = function (L) {
    const item = L.items[(Math.random() * L.items.length) | 0];
    const flavor = L.flavors[(Math.random() * L.flavors.length) | 0];
    const topping = L.toppings[(Math.random() * L.toppings.length) | 0];
    return { item, flavor, topping };
  };
})();
