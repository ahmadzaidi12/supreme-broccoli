/* =====================================================================
 * engine.js — simulation. Updates customers, tickets, griddle stations,
 * servers, scoring, combos, reputation and the head-chef powers.
 * Pure logic: rendering lives in render.js, clicks in input.js.
 * ===================================================================== */
(function () {
  const HK = (window.HK = window.HK || {});

  const POUR_MS = 700;
  const DONE_MS = 260;
  const SERVE_SPEED = 0.22; // px per ms
  const HAPPY_LINGER = 600;

  const RAMSAY_BAD = [
    "IT'S RAW!",
    "WHERE'S THE LAMB SAUCE?!",
    "YOU DONKEY!",
    "SORT IT OUT!",
    "MY GRAN COOKS FASTER!",
    "PANINI HEAD!",
  ];
  const RAMSAY_GOOD = [
    "BEAUTIFUL!",
    "FINALLY! YES!",
    "THAT'S IT, CHEF!",
    "GORGEOUS!",
  ];

  const SHIRTS = ["#9aa6ff", "#ffb3c8", "#8fe3c0", "#ffd56b", "#c5a6ff", "#7fd4ff"];
  const HAIRS = ["#5b3a29", "#2b2b2b", "#a85b2b", "#d9a441", "#6b4f8a"];

  /* fraction of the cook sweep (0..1) */
  const okayStart = HK.FLIP.goldenStart - HK.FLIP.okayPad;
  const okayEnd = HK.FLIP.goldenEnd + HK.FLIP.okayPad;

  const engine = (HK.engine = {});

  /* ---- floating popup / sparkle ---- */
  function popup(s, x, y, text, color, big) {
    s.fx.push({ x, y, text, color: color || "#fff", t: 0, life: 900, vy: -0.04, big });
  }
  function burst(s, x, y, color, n) {
    for (let i = 0; i < (n || 8); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.05 + Math.random() * 0.12;
      s.fx.push({
        x, y, particle: true, color,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.05,
        t: 0, life: 600, r: 2 + Math.random() * 3,
      });
    }
  }
  function ramsay(s, list) {
    s.flashRamsay = { text: list[(Math.random() * list.length) | 0], t: 0 };
  }

  /* ===================== SPAWNING ===================== */
  function trySpawn(s) {
    const L = s.level;
    const free = s.tables.filter((t) => !t.occupied);
    if (!free.length) return;
    const table = free[(Math.random() * free.length) | 0];
    const n = 1 + ((Math.random() * L.maxOrderItems) | 0);
    const order = [];
    for (let i = 0; i < n; i++) order.push(HK.randomItem(L));

    const cust = {
      id: HK.uid(),
      table,
      order,
      remaining: n,
      patience: L.patienceMs,
      maxPatience: L.patienceMs,
      arrived: s.time,
      mood: "neutral",
      skin: (Math.random() * HK.COLORS.skin.length) | 0,
      shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0],
      hair: HAIRS[(Math.random() * HAIRS.length) | 0],
      bob: Math.random() * 6,
    };
    table.occupied = true;
    table.customer = cust;
    s.customers.push(cust);

    // one ticket per item in the order
    order.forEach((recipe, i) => {
      s.tickets.push({
        id: HK.uid(),
        recipe,
        customerId: cust.id,
        tableId: table.id,
        idx: i,
        status: "waiting", // waiting|cooking|plated|delivering|done
        born: s.time,
      });
    });
    HK.sfx.sizzle();
  }

  /* ===================== PLAYER ACTIONS ===================== */

  // Fire the oldest (or given) waiting ticket onto a free griddle.
  engine.assignTicket = function (ticket) {
    const s = HK.state;
    if (!ticket || ticket.status !== "waiting") return false;
    const st = s.stations.find((x) => x.phase === "idle");
    if (!st) {
      popup(s, HK.W / 2, 150, "All griddles full!", "#ff6b6b");
      HK.sfx.wrong();
      return false;
    }
    st.phase = "pour";
    st.ticket = ticket;
    st.t = 0;
    st.sweep = 0;
    st.flipped = false;
    st.result = null;
    st.sous = false;
    st.cookMs = HK.ITEMS[ticket.recipe.item].cookMs;
    ticket.status = "cooking";
    HK.sfx.fire();
    return true;
  };

  // Auto-fire the oldest waiting ticket (used by tapping the rail / E rush).
  engine.assignOldest = function () {
    const s = HK.state;
    const t = s.tickets.find((x) => x.status === "waiting");
    return t ? engine.assignTicket(t) : false;
  };

  // Flip a station that's in the cook phase. Returns result or null.
  engine.flip = function (st) {
    const s = HK.state;
    if (!st || st.phase !== "cook" || st.flipped) return null;
    const sw = st.sweep;
    if (sw < okayStart) {
      // too early — a little "not yet" puff, no penalty
      popup(s, st.x, st.y - 60, "not yet!", "#fff");
      return null;
    }
    st.flipped = true;
    if (sw >= HK.FLIP.goldenStart && sw <= HK.FLIP.goldenEnd) {
      st.result = "perfect";
      HK.sfx.flipPerfect();
      popup(s, st.x, st.y - 60, "PERFECT!", "#7ed957", true);
      burst(s, st.x, st.y - 20, "#7ed957", 12);
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      if (s.combo === 4) ramsay(s, RAMSAY_GOOD);
    } else {
      st.result = "okay";
      HK.sfx.flipOkay();
      popup(s, st.x, st.y - 60, "ok!", "#ffcf4d");
    }
    return st.result;
  };

  // Plate the active (front-of-queue) station with a chosen topping.
  engine.plate = function (toppingKey) {
    const s = HK.state;
    const st = engine.activePlateStation();
    if (!st) return false;
    const need = st.ticket.recipe.topping;
    let quality = st.result || "okay";
    if (toppingKey !== need) {
      quality = "wrong";
      addMoney(s, HK.SCORE.wrongTopping, st.x, st.y - 50, "WRONG!", "#ff6b6b");
      HK.sfx.wrong();
      s.combo = 0;
      s.shake = 8;
    } else {
      HK.sfx.plate();
    }
    completePlate(s, st, quality);
    return true;
  };

  // The station whose plating the topping buttons currently control.
  engine.activePlateStation = function () {
    const s = HK.state;
    let best = null;
    for (const st of s.stations) {
      if (st.phase === "plate" && (!best || st.t > best.t)) best = st;
    }
    return best;
  };

  function completePlate(s, st, quality) {
    const ticket = st.ticket;
    // score the cook quality
    let pts = 0;
    if (quality === "perfect") pts = HK.SCORE.perfect;
    else if (quality === "okay") pts = HK.SCORE.okay;
    else if (quality === "burnt") pts = HK.SCORE.burntPenalty;
    if (pts > 0) {
      const mult = 1 + s.combo * HK.SCORE.comboStep;
      pts = Math.round(pts * mult);
    }
    if (quality === "perfect") {
      addMoney(s, pts, st.x, st.y - 50, "+" + pts, "#7ed957");
    } else if (quality === "okay") {
      addMoney(s, pts, st.x, st.y - 50, "+" + pts, "#ffcf4d");
    } else if (quality === "burnt") {
      addMoney(s, pts, st.x, st.y - 50, pts, "#ff6b6b");
    }

    // dish goes to the pass for a server to grab
    s.dishesAtPass.push({
      id: HK.uid(),
      recipe: ticket.recipe,
      quality,
      customerId: ticket.customerId,
      tableId: ticket.tableId,
      ticketId: ticket.id,
      x: HK.W / 2,
      y: 372,
    });
    ticket.status = "plated";

    st.phase = "done";
    st.t = 0;
  }

  function addMoney(s, amt, x, y, text, color) {
    s.moneyThisLevel += amt;
    s.totalMoney = Math.max(0, s.totalMoney + amt);
    if (amt > 0) HK.sfx.coin();
    if (text) popup(s, x, y, text, color);
  }

  /* ---- head-chef powers ---- */
  engine.expedite = function () {
    const s = HK.state;
    if (s.powers.expediteCd > 0) return false;
    s.powers.expediteCd = HK.POWERS.expediteCd;
    s.powers.expediteDur = HK.POWERS.expediteDur;
    popup(s, HK.W / 2, 200, "EXPEDITE! MOVE IT!", "#ffd56b", true);
    HK.sfx.serve();
    return true;
  };

  engine.sousChef = function () {
    const s = HK.state;
    if (s.powers.sousCd > 0) return false;
    // priority: a cooking station about to burn → perfect flip;
    // else the active plating station → auto-plate correctly.
    let target = null;
    for (const st of s.stations) {
      if (st.phase === "cook" && !st.flipped) {
        if (!target || st.sweep > target.sweep) target = st;
      }
    }
    if (target) {
      target.flipped = true;
      target.result = "perfect";
      target.sweep = (HK.FLIP.goldenStart + HK.FLIP.goldenEnd) / 2;
      target.sous = true;
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      popup(s, target.x, target.y - 70, "Sous: got it, Chef!", "#8fe3c0");
      burst(s, target.x, target.y - 20, "#8fe3c0", 10);
      HK.sfx.flipPerfect();
    } else {
      const st = engine.activePlateStation();
      if (!st) return false;
      popup(s, st.x, st.y - 70, "Sous plates it!", "#8fe3c0");
      completePlate(s, st, st.result || "okay");
    }
    s.powers.sousCd = HK.POWERS.sousCd;
    return true;
  };

  /* ===================== MAIN UPDATE ===================== */
  engine.update = function (dt) {
    const s = HK.state;
    if (s.mode !== HK.MODE.PLAY) return;
    s.time += dt;

    const rushing = s.powers.expediteDur > 0;
    const rushMul = rushing ? 2.2 : 1;

    // cooldowns
    s.powers.expediteCd = Math.max(0, s.powers.expediteCd - dt);
    s.powers.expediteDur = Math.max(0, s.powers.expediteDur - dt);
    s.powers.sousCd = Math.max(0, s.powers.sousCd - dt);

    // spawning
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      trySpawn(s);
      s.spawnTimer = s.level.spawnMs * (0.8 + Math.random() * 0.4);
    }

    // customers / patience
    for (const c of s.customers) {
      c.bob += dt * 0.004;
      if (c.done) continue;
      if (!rushing) c.patience -= dt;
      const f = c.patience / c.maxPatience;
      c.mood = f > 0.5 ? "neutral" : f > 0.22 ? "stressed" : "angry";
      if (c.patience <= 0) walkout(s, c);
    }

    // stations
    for (const st of s.stations) {
      st.t += dt;
      if (st.phase === "pour") {
        const pourMs = POUR_MS * (rushing ? 0.2 : 1);
        if (st.t >= pourMs) {
          st.phase = "cook";
          st.t = 0;
          st.sweep = 0;
          HK.sfx.sizzle();
        }
      } else if (st.phase === "cook") {
        st.sweep += dt / st.cookMs;
        if (!st.flipped && st.sweep >= okayEnd) {
          // missed the window → burnt
          st.flipped = true;
          st.result = "burnt";
          s.combo = 0;
          s.shake = 10;
          HK.sfx.burnt();
          popup(s, st.x, st.y - 60, "BURNT!", "#ff6b6b", true);
          burst(s, st.x, st.y - 20, "#3a2417", 14);
          ramsay(s, RAMSAY_BAD);
        }
        if (st.sweep >= 1) {
          st.phase = "plate";
          st.t = 0;
        }
      } else if (st.phase === "plate") {
        // waits for the player (or sous) to choose a topping
      } else if (st.phase === "done") {
        if (st.t >= DONE_MS) {
          st.phase = "idle";
          st.ticket = null;
          st.result = null;
          st.sous = false;
        }
      }
    }

    // cooks visual stress
    for (const ck of s.cooks) {
      ck.bob += dt * 0.006;
      const st = s.stations[ck.station];
      const cooking = st && st.phase === "cook";
      ck.sweat += (cooking && st.sweep > 0.5 ? 1 : -1) * dt * 0.003;
      ck.sweat = Math.max(0, Math.min(1, ck.sweat));
    }

    updateServers(s, dt, rushMul);
    updateFx(s, dt);

    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 0.04);
    if (s.flashRamsay) {
      s.flashRamsay.t += dt;
      if (s.flashRamsay.t > 1700) s.flashRamsay = null;
    }

    // win condition
    if (s.served >= s.level.quota) {
      s.totalMoney += 0; // already counted
      s.mode =
        s.levelIndex >= HK.LEVELS.length - 1 ? HK.MODE.WIN : HK.MODE.LEVEL_CLEAR;
      HK.sfx.levelUp();
      if (HK.onModeChange) HK.onModeChange();
    }
    // lose condition
    if (s.rep <= 0) {
      s.rep = 0;
      s.mode = HK.MODE.GAME_OVER;
      HK.sfx.gameOver();
      if (HK.onModeChange) HK.onModeChange();
    }
  };

  function walkout(s, c) {
    c.done = true;
    c.walkedOut = true;
    s.rep -= 1;
    s.combo = 0;
    s.shake = 12;
    popup(s, c.table.x, c.table.y - 60, "WALKOUT!", "#ff6b6b", true);
    ramsay(s, RAMSAY_BAD);
    HK.sfx.walkout();
    // cancel this customer's outstanding tickets + pass dishes
    s.tickets = s.tickets.filter(
      (t) => t.customerId !== c.id || t.status === "plated" || t.status === "delivering"
    );
    s.dishesAtPass = s.dishesAtPass.filter((d) => d.customerId !== c.id);
    // free the table shortly after
    c.freeAt = s.time + 500;
  }

  function updateServers(s, dt, rushMul) {
    for (const sv of s.servers) {
      sv.bob += dt * 0.008;
      if (sv.state === "idle") {
        // grab a plated dish whose customer is still seated
        const dish = s.dishesAtPass.find((d) => {
          const c = s.customers.find((c) => c.id === d.customerId);
          return c && !c.done;
        });
        if (dish) {
          const table = s.tables.find((t) => t.id === dish.tableId);
          if (table) {
            sv.dish = dish;
            sv.targetTable = table;
            sv.state = "toTable";
            s.dishesAtPass = s.dishesAtPass.filter((d) => d !== dish);
            const tk = s.tickets.find((t) => t.id === dish.ticketId);
            if (tk) tk.status = "delivering";
          }
        }
      } else if (sv.state === "toTable") {
        const tx = sv.targetTable.x;
        const ty = sv.targetTable.y - 36;
        if (moveTo(sv, tx, ty, SERVE_SPEED * rushMul * dt)) {
          deliver(s, sv);
          sv.state = "back";
        }
      } else if (sv.state === "back") {
        if (moveTo(sv, sv.homeX, sv.homeY, SERVE_SPEED * rushMul * dt)) {
          sv.state = "idle";
          sv.dish = null;
          sv.targetTable = null;
        }
      }
    }

    // free tables of finished/walked customers once their linger ends
    for (const t of s.tables) {
      const c = t.customer;
      if (c && c.done && c.freeAt != null && s.time >= c.freeAt) {
        t.occupied = false;
        t.customer = null;
      }
    }
    // a done customer is rendered until their table is released, then pruned
    s.customers = s.customers.filter(
      (c) => !c.done || (c.freeAt != null && s.time < c.freeAt)
    );
  }

  function moveTo(o, tx, ty, step) {
    const dx = tx - o.x;
    const dy = ty - o.y;
    const d = Math.hypot(dx, dy);
    if (d <= step || d < 0.5) {
      o.x = tx;
      o.y = ty;
      return true;
    }
    o.x += (dx / d) * step;
    o.y += (dy / d) * step;
    return false;
  }

  function deliver(s, sv) {
    const dish = sv.dish;
    const c = s.customers.find((c) => c.id === dish.customerId);
    const tk = s.tickets.find((t) => t.id === dish.ticketId);
    if (tk) tk.status = "done";
    HK.sfx.serve();
    burst(s, sv.x, sv.y - 20, "#fff", 6);
    if (!c || c.done) return;
    c.remaining -= 1;
    if (c.remaining <= 0) {
      // whole order delivered → happy customer
      c.done = true;
      c.happy = true;
      c.freeAt = s.time + HAPPY_LINGER;
      s.served += 1;
      const f = c.patience / c.maxPatience;
      const tip = Math.round(HK.SCORE.tipPerfect * Math.max(0.1, f));
      addMoney(s, tip, c.table.x, c.table.y - 60, "+" + tip + " tip", "#ffd56b");
      popup(s, c.table.x, c.table.y - 90, "♥", "#ff8fb1", true);
    }
  }

  function updateFx(s, dt) {
    for (const f of s.fx) {
      f.t += dt;
      if (f.particle) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 0.0005 * dt;
      } else {
        f.y += f.vy * dt;
      }
    }
    s.fx = s.fx.filter((f) => f.t < f.life);
  }
})();
