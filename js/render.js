/* =====================================================================
 * render.js — draws the whole scene each frame and (re)builds the list
 * of clickable hot-zones (HK.hot) that input.js dispatches against.
 * ===================================================================== */
(function () {
  const HK = (window.HK = window.HK || {});
  const C = HK.COLORS;
  HK.hot = []; // [{x,y,w,h,type,ref}]

  function zone(type, x, y, w, h, ref) {
    HK.hot.push({ type, x, y, w, h, ref });
  }

  HK.render = function (ctx, now) {
    const s = HK.state;
    HK.hot = [];
    ctx.clearRect(0, 0, HK.W, HK.H);

    // screen shake
    let sx = 0, sy = 0;
    if (s && s.shake > 0.2) {
      sx = (Math.random() - 0.5) * s.shake;
      sy = (Math.random() - 0.5) * s.shake;
    }
    ctx.save();
    ctx.translate(sx, sy);

    drawRoom(ctx, now);
    if (s && s.mode === HK.MODE.PLAY) {
      drawTickets(ctx, s, now);
      drawKitchen(ctx, s, now);
      drawPassAndToppings(ctx, s, now);
      drawDining(ctx, s, now);
      drawServers(ctx, s, now);
      drawFx(ctx, s);
      drawHUD(ctx, s, now);
      drawRamsay(ctx, s);
    } else {
      drawDining(ctx, s || { tables: [], customers: [], servers: [] }, now);
    }
    ctx.restore();
  };

  /* ---------- backgrounds ---------- */
  function drawRoom(ctx, now) {
    // wall
    ctx.fillStyle = C.wall;
    ctx.fillRect(0, 0, HK.W, 392);
    // wall tiles
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    for (let x = 0; x < HK.W; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 156);
      ctx.lineTo(x, 392);
      ctx.stroke();
    }
    for (let y = 168; y < 392; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(HK.W, y);
      ctx.stroke();
    }
    // trim
    ctx.fillStyle = C.wallTrim;
    ctx.fillRect(0, 150, HK.W, 8);
    // floor
    const g = ctx.createLinearGradient(0, 392, 0, HK.H);
    g.addColorStop(0, C.floor);
    g.addColorStop(1, C.floorDark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 392, HK.W, HK.H - 392);
    // floor stripes
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    for (let i = 0; i < 14; i++) {
      if (i % 2) ctx.fillRect((HK.W / 14) * i, 392, HK.W / 14, HK.H - 392);
    }
  }

  /* ---------- ticket rail ---------- */
  function drawTickets(ctx, s, now) {
    const rail = HK.LAYOUT.ticketRail;
    // rail board
    ctx.fillStyle = "#7a4f2c";
    HK.rr(ctx, rail.x - 6, rail.y - 8, rail.w + 12, rail.h + 14, 12);
    ctx.fill();
    ctx.fillStyle = "#915d33";
    HK.rr(ctx, rail.x - 6, rail.y - 8, rail.w + 12, 10, 6);
    ctx.fill();

    const waiting = s.tickets.filter(
      (t) => t.status === "waiting" || t.status === "cooking"
    );
    const tw = 118, th = 84, gap = 8;
    let x = rail.x + 4;
    for (const t of waiting) {
      if (x + tw > rail.x + rail.w) break;
      const cooking = t.status === "cooking";
      ctx.save();
      ctx.translate(x, rail.y);
      // paper
      ctx.fillStyle = cooking ? "#e9e0c4" : C.ticket;
      ctx.globalAlpha = cooking ? 0.7 : 1;
      HK.rr(ctx, 0, 0, tw, th, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      // pin
      ctx.fillStyle = C.ticketPin;
      ctx.beginPath();
      ctx.arc(tw / 2, 6, 5, 0, 7);
      ctx.fill();
      // recipe text
      const r = t.recipe;
      const item = HK.ITEMS[r.item];
      const fl = HK.FLAVORS[r.flavor];
      const tp = HK.TOPPINGS[r.topping];
      ctx.fillStyle = C.ink;
      ctx.font = "700 14px Fredoka, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(item.emoji + " " + item.name, 8, 22);
      ctx.font = "500 12px Fredoka, sans-serif";
      ctx.fillStyle = "#6b4f33";
      ctx.fillText(fl.emoji + " " + fl.name, 8, 42);
      ctx.fillText(tp.emoji + " " + tp.name, 8, 60);
      if (!cooking) {
        ctx.fillStyle = "#2b7a2b";
        ctx.font = "700 11px Fredoka, sans-serif";
        ctx.fillText("TAP TO FIRE", 8, 76);
        zone("ticket", x, rail.y, tw, th, t);
      } else {
        ctx.fillStyle = "#a07b3a";
        ctx.font = "700 11px Fredoka, sans-serif";
        ctx.fillText("on the griddle…", 8, 76);
      }
      ctx.restore();
      x += tw + gap;
    }

    if (!waiting.length) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "600 16px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("orders will come in…", HK.W / 2, rail.y + 50);
    }
  }

  /* ---------- kitchen: griddles + cooks + flip bars ---------- */
  function drawKitchen(ctx, s, now) {
    // counter base
    ctx.fillStyle = "#b87a44";
    ctx.fillRect(0, 300, HK.W, 52);
    ctx.fillStyle = "#9c6234";
    ctx.fillRect(0, 300, HK.W, 6);

    for (const st of s.stations) {
      const cook = s.cooks.find((c) => c.station === s.stations.indexOf(st));
      // griddle
      ctx.fillStyle = C.griddle;
      HK.rr(ctx, st.x - 46, st.y + 6, 92, 30, 8);
      ctx.fill();
      ctx.fillStyle = st.phase === "cook" || st.phase === "pour" ? "#7a5a52" : C.griddleHot;
      HK.rr(ctx, st.x - 42, st.y + 8, 84, 22, 6);
      ctx.fill();

      // food on griddle
      if (st.phase === "cook" || st.phase === "pour" || st.phase === "plate" || st.phase === "done") {
        drawCookingFood(ctx, st, now);
      }

      // cook behind the griddle
      if (cook) {
        HK.drawCook(ctx, st.x, st.y - 40, {
          s: 32,
          skin: cook.skin,
          mood: st.phase === "cook" && st.sweep > 0.7 ? "stressed" : st.result === "burnt" ? "angry" : "neutral",
          bob: cook.bob,
          sweat: cook.sweat,
          accent: st.sous ? "#8fe3c0" : "#ff8fb1",
        });
      }

      // flip mini-game bar during cook
      if (st.phase === "cook") {
        drawFlipBar(ctx, st);
        zone("station", st.x - 50, st.y - 10, 100, 56, st);
      }

      // plate-phase prompt
      if (st.phase === "plate") {
        const active = HK.engine.activePlateStation() === st;
        ctx.save();
        ctx.textAlign = "center";
        const need = HK.TOPPINGS[st.ticket.recipe.topping];
        const pulse = active ? 0.5 + 0.5 * Math.sin(now * 0.012) : 0.3;
        ctx.fillStyle = active ? `rgba(126,217,87,${0.55 + pulse * 0.4})` : "rgba(255,255,255,0.4)";
        HK.rr(ctx, st.x - 52, st.y - 78, 104, 24, 10);
        ctx.fill();
        ctx.fillStyle = "#234d18";
        ctx.font = "700 12px Fredoka, sans-serif";
        ctx.fillText(active ? "ADD " + need.name + "!" : "waiting…", st.x, st.y - 61);
        ctx.restore();
      }

      // steam
      if (st.phase === "cook" && st.sweep > 0.3) {
        HK.drawSteam(ctx, st.x, st.y, now, Math.min(1, st.sweep));
      }
    }
  }

  function drawCookingFood(ctx, st, now) {
    const r = st.ticket.recipe;
    // batter darkens as it cooks; burnt = dark
    let tint = 1;
    if (st.phase === "cook") tint = 1 - st.sweep * 0.15;
    const burnt = st.result === "burnt";
    ctx.save();
    ctx.translate(st.x, st.y + 4);
    if (st.phase === "pour") {
      // pouring batter blob
      ctx.fillStyle = HK.FLAVORS[r.flavor].color;
      ctx.beginPath();
      ctx.ellipse(0, 6, 18 * Math.min(1, st.t / 700 + 0.3), 7, 0, 0, 7);
      ctx.fill();
    } else {
      const fakeRecipe = { item: r.item, flavor: r.flavor, topping: st.phase === "plate" || st.phase === "done" ? null : null };
      ctx.save();
      if (burnt) ctx.filter = "brightness(0.45) saturate(0.4)";
      HK.drawFood(ctx, 0, 2, fakeRecipe, { s: 16, plate: false, topping: false });
      ctx.restore();
    }
    ctx.restore();
  }

  function drawFlipBar(ctx, st) {
    const bw = 96, bh = 12;
    const bx = st.x - bw / 2;
    const by = st.y + 40;
    // track
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    HK.rr(ctx, bx, by, bw, bh, 6);
    ctx.fill();
    // okay zones
    const okS = HK.FLIP.goldenStart - HK.FLIP.okayPad;
    const okE = HK.FLIP.goldenEnd + HK.FLIP.okayPad;
    ctx.fillStyle = "rgba(255,207,77,0.85)";
    HK.rr(ctx, bx + bw * okS, by, bw * (okE - okS), bh, 6);
    ctx.fill();
    // golden zone
    ctx.fillStyle = "#7ed957";
    const gS = HK.FLIP.goldenStart, gE = HK.FLIP.goldenEnd;
    HK.rr(ctx, bx + bw * gS, by, bw * (gE - gS), bh, 4);
    ctx.fill();
    // marker
    const mx = bx + bw * Math.min(1, st.sweep);
    ctx.fillStyle = st.sweep > okE ? "#ff6b6b" : "#fff";
    HK.rr(ctx, mx - 3, by - 4, 6, bh + 8, 3);
    ctx.fill();
    // "FLIP!" hint near the zone
    if (st.sweep > okS - 0.08 && st.sweep < okE && !st.flipped) {
      ctx.fillStyle = "#fff";
      ctx.font = "700 11px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FLIP!", st.x, by - 8);
    }
  }

  /* ---------- pass counter + topping buttons ---------- */
  function drawPassAndToppings(ctx, s, now) {
    // pass counter strip
    ctx.fillStyle = C.pass;
    ctx.fillRect(0, 352, HK.W, 40);
    ctx.fillStyle = C.passLip;
    ctx.fillRect(0, 352, HK.W, 5);
    ctx.fillStyle = "#fff";
    ctx.font = "700 12px Fredoka, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("◤ THE PASS ◢", 12, 377);

    // dishes waiting at the pass
    let dx = 150;
    for (const d of s.dishesAtPass) {
      HK.drawFood(ctx, dx, 372, d.recipe, { s: 12 });
      dx += 64;
    }

    // topping buttons (only this level's toppings)
    const L = s.level;
    const keys = L.toppings;
    const n = keys.length;
    const pad = 8;
    const totalW = HK.W - 24;
    const bw = (totalW - pad * (n - 1)) / n;
    const active = HK.engine.activePlateStation();
    const need = active ? active.ticket.recipe.topping : null;

    for (let i = 0; i < n; i++) {
      const key = keys[i];
      const tp = HK.TOPPINGS[key];
      const x = 12 + i * (bw + pad);
      const y = 398;
      const h = 30;
      const isNeed = key === need;
      ctx.fillStyle = isNeed ? "#7ed957" : active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.5)";
      if (isNeed) {
        const p = 0.5 + 0.5 * Math.sin(now * 0.014);
        ctx.fillStyle = `rgb(${126 + p * 40},${217},${87})`;
      }
      HK.rr(ctx, x, y, bw, h, 8);
      ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.font = "600 13px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(tp.emoji + " " + tp.name, x + bw / 2, y + 20);
      if (active) zone("topping", x, y, bw, h, key);
    }
  }

  /* ---------- dining: tables + customers ---------- */
  function drawDining(ctx, s, now) {
    if (!s.tables) return;
    for (const t of s.tables) {
      // table
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 34, 46, 14, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#c98a52";
      HK.rr(ctx, t.x - 40, t.y + 6, 80, 26, 8);
      ctx.fill();
      ctx.fillStyle = "#e0a368";
      HK.rr(ctx, t.x - 40, t.y + 6, 80, 8, 6);
      ctx.fill();

      const c = t.customer;
      if (c) {
        HK.drawCustomer(ctx, t.x, t.y - 18, {
          s: 28,
          skin: c.skin,
          shirt: c.shirt,
          hair: c.hair,
          mood: c.happy ? "happy" : c.walkedOut ? "angry" : c.mood,
          bob: c.bob,
        });
        if (!c.done) drawPatience(ctx, t.x, t.y - 56, c);
        if (c.happy) {
          ctx.fillStyle = "#ff8fb1";
          ctx.font = "20px serif";
          ctx.textAlign = "center";
          ctx.fillText("♥", t.x + 24, t.y - 50 - Math.sin(now * 0.01) * 4);
        }
      }
    }
  }

  function drawPatience(ctx, x, y, c) {
    const f = Math.max(0, c.patience / c.maxPatience);
    const w = 52, h = 7;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    HK.rr(ctx, x - w / 2, y, w, h, 4);
    ctx.fill();
    ctx.fillStyle = f > 0.5 ? "#7ed957" : f > 0.22 ? "#ffcf4d" : "#ff6b6b";
    HK.rr(ctx, x - w / 2, y, w * f, h, 4);
    ctx.fill();
    // order bubble (how many items remain)
    ctx.fillStyle = "#fff";
    HK.rr(ctx, x - 14, y - 30, 28, 22, 6);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.font = "700 13px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("×" + c.remaining, x, y - 14);
  }

  /* ---------- servers ---------- */
  function drawServers(ctx, s, now) {
    for (const sv of s.servers) {
      // carried dish
      if (sv.dish) {
        ctx.save();
        ctx.translate(0, -38);
        HK.drawFood(ctx, sv.x, sv.y, sv.dish.recipe, { s: 10 });
        ctx.restore();
      }
      HK.drawServer(ctx, sv.x, sv.y, {
        s: 26,
        skin: sv.skin,
        bob: sv.bob,
        mood: sv.state === "idle" ? "neutral" : "happy",
        look: sv.state === "toTable" ? 1 : sv.state === "back" ? -1 : 0,
      });
    }
  }

  /* ---------- floating fx ---------- */
  function drawFx(ctx, s) {
    for (const f of s.fx) {
      const a = 1 - f.t / f.life;
      ctx.globalAlpha = Math.max(0, a);
      if (f.particle) {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 7);
        ctx.fill();
      } else {
        ctx.fillStyle = f.color;
        ctx.font = (f.big ? "800 26px " : "700 16px ") + "Baloo 2, Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillText(f.text, f.x, f.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- HUD + power buttons ---------- */
  function drawHUD(ctx, s, now) {
    ctx.fillStyle = "rgba(43,36,64,0.92)";
    ctx.fillRect(0, 0, HK.W, HK.LAYOUT.hudH);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd56b";
    ctx.font = "800 22px Baloo 2, Fredoka, sans-serif";
    ctx.fillText("$" + s.totalMoney, 16, 36);

    // level + quota progress
    ctx.fillStyle = "#fff";
    ctx.font = "600 15px Fredoka, sans-serif";
    ctx.fillText("Night " + s.level.n + " · " + s.level.name, 130, 24);
    const qf = Math.min(1, s.served / s.level.quota);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    HK.rr(ctx, 130, 32, 220, 12, 6);
    ctx.fill();
    ctx.fillStyle = "#7ed957";
    HK.rr(ctx, 130, 32, 220 * qf, 12, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 11px Fredoka, sans-serif";
    ctx.fillText(s.served + " / " + s.level.quota + " happy", 360, 42);

    // reputation hearts
    ctx.textAlign = "left";
    for (let i = 0; i < HK.START_REP; i++) {
      ctx.fillStyle = i < s.rep ? "#ff5d7a" : "rgba(255,255,255,0.18)";
      ctx.font = "18px serif";
      ctx.fillText("♥", 470 + i * 22, 36);
    }

    // combo
    if (s.combo > 1) {
      ctx.fillStyle = "#ffd56b";
      ctx.font = "800 18px Baloo 2, Fredoka, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🔥 x" + s.combo + " combo", 600, 36);
    }

    // power buttons (right side)
    drawPowerBtn(ctx, "EXPEDITE (E)", HK.W - 320, s.powers.expediteCd, HK.POWERS.expediteCd, s.powers.expediteDur > 0, "#ffd56b", "expedite");
    drawPowerBtn(ctx, "SOUS CHEF (S)", HK.W - 158, s.powers.sousCd, HK.POWERS.sousCd, false, "#8fe3c0", "sous");
  }

  function drawPowerBtn(ctx, label, x, cd, cdMax, active, color, type) {
    const y = 8, w = 150, h = 38;
    const ready = cd <= 0;
    ctx.fillStyle = active ? "#fff" : ready ? color : "rgba(255,255,255,0.18)";
    HK.rr(ctx, x, y, w, h, 10);
    ctx.fill();
    if (!ready) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      HK.rr(ctx, x, y, w * (cd / cdMax), h, 10);
      ctx.fill();
    }
    ctx.fillStyle = ready ? "#3a2b2b" : "rgba(255,255,255,0.6)";
    ctx.font = "700 13px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ready ? label : "…", x + w / 2, y + 24);
    if (ready) zone(type, x, y, w, h, null);
  }

  /* ---------- Ramsay flash ---------- */
  function drawRamsay(ctx, s) {
    if (!s.flashRamsay) return;
    const f = s.flashRamsay;
    const a = f.t < 200 ? f.t / 200 : f.t > 1400 ? (1700 - f.t) / 300 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.textAlign = "center";
    ctx.font = "800 40px Baloo 2, Fredoka, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#e85d86";
    const y = 210 + Math.sin(f.t * 0.02) * 3;
    ctx.strokeText(f.text, HK.W / 2, y);
    ctx.fillText(f.text, HK.W / 2, y);
    ctx.restore();
  }
})();
