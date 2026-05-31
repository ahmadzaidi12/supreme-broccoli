/* =====================================================================
 * Flippin' Chaos — config.js
 * All tunable data: canvas layout, colours, breakfast items, flavors,
 * toppings, and the level/day progression. The engine is generic, so
 * adding a new level or breakfast item is mostly a data change here.
 * ===================================================================== */
(function () {
  const HK = (window.HK = window.HK || {});

  HK.W = 960;
  HK.H = 600;

  /* ---- cute-but-chaotic palette ---- */
  HK.COLORS = {
    floor: "#ffe2b0",
    floorDark: "#f3cf93",
    wall: "#ffd0dd",
    wallTrim: "#ff9bb5",
    pass: "#c98a52",
    passLip: "#a96d3a",
    griddle: "#4a4453",
    griddleHot: "#6b5a63",
    ink: "#4a3320",
    toque: "#fffdf7",
    skin: ["#ffd9b8", "#f0bd95", "#d49a6a", "#a9784f"],
    ticket: "#fffbe9",
    ticketPin: "#ff5d7a",
    good: "#7ed957",
    okay: "#ffcf4d",
    bad: "#ff6b6b",
    syrup: "#a5642d",
  };

  /* ---- layout zones (canvas coords) ---- */
  HK.LAYOUT = {
    hudH: 54,
    ticketRail: { x: 16, y: 60, w: 928, h: 96 },
    kitchen: { x: 0, y: 156, w: 960, h: 196 }, // griddles + cooks live here
    pass: { x: 0, y: 352, w: 960, h: 40 },
    dining: { x: 0, y: 392, w: 960, h: 208 },
  };

  /* ---- breakfast items: shape/draw key + base cook time ---- */
  HK.ITEMS = {
    pancake: { name: "Pancakes", emoji: "🥞", cookMs: 2600 },
    waffle: { name: "Waffles", emoji: "🧇", cookMs: 2900 },
    frenchToast: { name: "French Toast", emoji: "🍞", cookMs: 2400 },
    omelette: { name: "Omelette", emoji: "🍳", cookMs: 2300 },
  };

  /* ---- flavors tint the batter ---- */
  HK.FLAVORS = {
    plain: { name: "Classic", color: "#f6c873", emoji: "🌾" },
    buttermilk: { name: "Buttermilk", color: "#ffdf9e", emoji: "🧈" },
    chocchip: { name: "Choc-Chip", color: "#caa15e", emoji: "🍫" },
    redvelvet: { name: "Red Velvet", color: "#d9756f", emoji: "❤️" },
    matcha: { name: "Matcha", color: "#a9cf7a", emoji: "🍵" },
  };

  /* ---- toppings: chosen at the plating step ---- */
  HK.TOPPINGS = {
    syrup: { name: "Syrup", color: "#a5642d", emoji: "🍯" },
    berries: { name: "Berries", color: "#7b4bd1", emoji: "🫐" },
    cream: { name: "Whipped Cream", color: "#fffdf5", emoji: "🍦" },
    banana: { name: "Banana", color: "#ffe14d", emoji: "🍌" },
    nutella: { name: "Choc Sauce", color: "#5a3420", emoji: "🍫" },
    strawberry: { name: "Strawberry", color: "#ff5d6c", emoji: "🍓" },
  };

  /* ---------------------------------------------------------------
   * LEVELS — "service nights" at the restaurant.
   * Each level unlocks items/flavors/toppings, sets pace + a quota of
   * happy customers to clear the night. Difficulty ramps via spawn
   * speed, customer patience, and how many tables fill up.
   * ------------------------------------------------------------- */
  HK.LEVELS = [
    {
      n: 1,
      name: "Opening Night",
      blurb: "Just pancakes & waffles. Keep the griddle moving, Chef.",
      items: ["pancake", "waffle"],
      flavors: ["plain", "buttermilk"],
      toppings: ["syrup", "berries", "cream"],
      quota: 6,
      cooks: 2,
      servers: 1,
      spawnMs: 4200,
      patienceMs: 26000,
      maxOrderItems: 1,
    },
    {
      n: 2,
      name: "Brunch Rush",
      blurb: "Choc-chip is on. Word's getting out — tables are filling up.",
      items: ["pancake", "waffle"],
      flavors: ["plain", "buttermilk", "chocchip"],
      toppings: ["syrup", "berries", "cream", "banana"],
      quota: 9,
      cooks: 2,
      servers: 2,
      spawnMs: 3500,
      patienceMs: 24000,
      maxOrderItems: 2,
    },
    {
      n: 3,
      name: "French Toast Fridays",
      blurb: "New on the menu: French Toast. Don't let it burn!",
      items: ["pancake", "waffle", "frenchToast"],
      flavors: ["plain", "buttermilk", "chocchip", "redvelvet"],
      toppings: ["syrup", "berries", "cream", "banana", "nutella", "strawberry"],
      quota: 11,
      cooks: 3,
      servers: 2,
      spawnMs: 3100,
      patienceMs: 23000,
      maxOrderItems: 2,
    },
    {
      n: 4,
      name: "The Omelette Station",
      blurb: "Eggs are live. The whole brigade is in the weeds — direct them!",
      items: ["pancake", "waffle", "frenchToast", "omelette"],
      flavors: ["plain", "buttermilk", "chocchip", "redvelvet", "matcha"],
      toppings: ["syrup", "berries", "cream", "banana", "nutella", "strawberry"],
      quota: 14,
      cooks: 3,
      servers: 2,
      spawnMs: 2700,
      patienceMs: 22000,
      maxOrderItems: 3,
    },
    {
      n: 5,
      name: "Dinner Service from Hell",
      blurb: "Full house. Everything's on fire (the good kind). Show 'em, Chef.",
      items: ["pancake", "waffle", "frenchToast", "omelette"],
      flavors: ["plain", "buttermilk", "chocchip", "redvelvet", "matcha"],
      toppings: ["syrup", "berries", "cream", "banana", "nutella", "strawberry"],
      quota: 18,
      cooks: 3,
      servers: 3,
      spawnMs: 2300,
      patienceMs: 20000,
      maxOrderItems: 3,
    },
  ];

  /* ---- scoring / economy ---- */
  HK.SCORE = {
    perfect: 100,
    okay: 55,
    burntPenalty: -25,
    wrongTopping: -20,
    walkout: -1, // reputation hearts, not money
    tipPerfect: 40,
    comboStep: 0.15, // +15% per combo tier
  };

  HK.START_REP = 5; // hearts

  /* timing windows for the flip mini-game (fraction of the sweep) */
  HK.FLIP = {
    goldenStart: 0.62,
    goldenEnd: 0.82, // perfect zone
    okayPad: 0.12, // okay zone padding around golden
  };

  /* cooldowns (ms) for the head-chef powers */
  HK.POWERS = {
    expediteCd: 14000,
    expediteDur: 4500,
    sousCd: 11000,
  };
})();
