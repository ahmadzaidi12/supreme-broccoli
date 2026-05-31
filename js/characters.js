/* =====================================================================
 * characters.js — procedural "cute-but-chaotic" art helpers.
 * Round bodies, big dot eyes, toques for kitchen staff; stress shows
 * as sweat beads, motion jitter and exclamation puffs. Food is drawn
 * from primitives so new items are just a new draw routine.
 * ===================================================================== */
(function () {
  const HK = (window.HK = window.HK || {});
  const C = HK.COLORS;

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  HK.rr = rr;

  /* eyes + blush + mouth. mood: happy | neutral | stressed | angry */
  function face(ctx, x, y, s, mood, lookDir) {
    lookDir = lookDir || 0;
    // eyes
    ctx.fillStyle = "#3a2b2b";
    const eo = s * 0.22;
    const ey = y - s * 0.05;
    const ex = lookDir * s * 0.05;
    ctx.beginPath();
    ctx.arc(x - eo + ex, ey, s * 0.11, 0, 7);
    ctx.arc(x + eo + ex, ey, s * 0.11, 0, 7);
    ctx.fill();
    // eye shine
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(x - eo + ex + s * 0.04, ey - s * 0.04, s * 0.035, 0, 7);
    ctx.arc(x + eo + ex + s * 0.04, ey - s * 0.04, s * 0.035, 0, 7);
    ctx.fill();
    // blush
    ctx.fillStyle = "rgba(255,140,170,0.5)";
    ctx.beginPath();
    ctx.arc(x - s * 0.34, y + s * 0.12, s * 0.1, 0, 7);
    ctx.arc(x + s * 0.34, y + s * 0.12, s * 0.1, 0, 7);
    ctx.fill();
    // mouth
    ctx.strokeStyle = "#3a2b2b";
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.lineCap = "round";
    ctx.beginPath();
    const my = y + s * 0.22;
    if (mood === "happy") {
      ctx.arc(x, my - s * 0.05, s * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (mood === "angry") {
      ctx.arc(x, my + s * 0.12, s * 0.16, 1.15 * Math.PI, 1.85 * Math.PI);
    } else if (mood === "stressed") {
      ctx.moveTo(x - s * 0.12, my);
      ctx.lineTo(x + s * 0.12, my);
    } else {
      ctx.arc(x, my - s * 0.02, s * 0.1, 0.1 * Math.PI, 0.9 * Math.PI);
    }
    ctx.stroke();
  }
  HK.face = face;

  function sweat(ctx, x, y, s) {
    ctx.fillStyle = "rgba(120,200,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(x + s * 0.42, y - s * 0.1, s * 0.07, s * 0.11, 0, 0, 7);
    ctx.fill();
  }

  /* ---- Kitchen cook: round body + chef toque ---- */
  HK.drawCook = function (ctx, x, y, opt) {
    opt = opt || {};
    const s = opt.s || 34;
    const skin = C.skin[opt.skin || 0];
    const mood = opt.mood || "neutral";
    const bob = Math.sin(opt.bob || 0) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.95, s * 0.7, s * 0.22, 0, 0, 7);
    ctx.fill();
    // body (apron whites)
    ctx.fillStyle = "#fff7ec";
    rr(ctx, -s * 0.62, s * 0.1, s * 1.24, s * 0.85, s * 0.32);
    ctx.fill();
    // apron string accent
    ctx.fillStyle = opt.accent || "#ff8fb1";
    rr(ctx, -s * 0.62, s * 0.5, s * 1.24, s * 0.12, s * 0.06);
    ctx.fill();
    // head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -s * 0.25, s * 0.5, 0, 7);
    ctx.fill();
    // toque (chef hat)
    ctx.fillStyle = C.toque;
    ctx.beginPath();
    ctx.arc(-s * 0.22, -s * 0.78, s * 0.2, 0, 7);
    ctx.arc(s * 0.22, -s * 0.78, s * 0.2, 0, 7);
    ctx.arc(0, -s * 0.9, s * 0.24, 0, 7);
    ctx.fill();
    rr(ctx, -s * 0.4, -s * 0.72, s * 0.8, s * 0.34, s * 0.1);
    ctx.fill();
    // hat band
    ctx.fillStyle = opt.accent || "#ff8fb1";
    rr(ctx, -s * 0.4, -s * 0.45, s * 0.8, s * 0.08, s * 0.04);
    ctx.fill();
    // face
    face(ctx, 0, -s * 0.22, s, mood, opt.look || 0);
    if (opt.sweat > 0.3) sweat(ctx, 0, -s * 0.22, s);
    ctx.restore();
  };

  /* ---- Server: smaller, visor + tray ---- */
  HK.drawServer = function (ctx, x, y, opt) {
    opt = opt || {};
    const s = opt.s || 28;
    const skin = C.skin[opt.skin || 1];
    const bob = Math.sin(opt.bob || 0) * 2.5;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.95, s * 0.6, s * 0.2, 0, 0, 7);
    ctx.fill();
    // body (mint vest)
    ctx.fillStyle = "#8fe3c0";
    rr(ctx, -s * 0.55, s * 0.1, s * 1.1, s * 0.8, s * 0.3);
    ctx.fill();
    ctx.fillStyle = "#fff7ec";
    rr(ctx, -s * 0.16, s * 0.1, s * 0.32, s * 0.8, s * 0.12);
    ctx.fill();
    // head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, s * 0.46, 0, 7);
    ctx.fill();
    // visor cap
    ctx.fillStyle = "#ff8fb1";
    rr(ctx, -s * 0.45, -s * 0.62, s * 0.9, s * 0.22, s * 0.1);
    ctx.fill();
    ctx.fillStyle = "#ffb3c8";
    rr(ctx, -s * 0.5, -s * 0.46, s * 1.0, s * 0.1, s * 0.05);
    ctx.fill();
    face(ctx, 0, -s * 0.18, s, opt.mood || "happy", opt.look || 0);
    ctx.restore();
  };

  /* ---- Customer: round patron in a booth ---- */
  HK.drawCustomer = function (ctx, x, y, opt) {
    opt = opt || {};
    const s = opt.s || 30;
    const skin = C.skin[opt.skin || 0];
    const shirt = opt.shirt || "#9aa6ff";
    const bob = Math.sin(opt.bob || 0) * 1.5;
    ctx.save();
    ctx.translate(x, y + bob);
    // body
    ctx.fillStyle = shirt;
    rr(ctx, -s * 0.6, s * 0.05, s * 1.2, s * 0.7, s * 0.28);
    ctx.fill();
    // head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s * 0.5, 0, 7);
    ctx.fill();
    // hair tuft
    ctx.fillStyle = opt.hair || "#5b3a29";
    ctx.beginPath();
    ctx.arc(0, -s * 0.62, s * 0.5, Math.PI, 2 * Math.PI);
    ctx.fill();
    face(ctx, 0, -s * 0.28, s, opt.mood || "neutral", opt.look || 0);
    ctx.restore();
  };

  /* ===================== FOOD ===================== */

  // a single round cake (pancake / french toast base)
  function disc(ctx, x, y, r, top, side) {
    ctx.fillStyle = side;
    rr(ctx, x - r, y - r * 0.32, r * 2, r * 0.5, r * 0.32);
    ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.18, r, r * 0.42, 0, 0, 7);
    ctx.fill();
  }

  HK.drawFood = function (ctx, x, y, recipe, opt) {
    opt = opt || {};
    const s = opt.s || 22;
    const item = recipe.item;
    const flavor = HK.FLAVORS[recipe.flavor];
    const base = flavor.color;
    const dark = shade(base, -0.18);
    ctx.save();
    // plate
    if (opt.plate !== false) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.5, s * 1.5, s * 0.5, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.38, s * 1.45, s * 0.45, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#e9eef5";
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.36, s * 1.1, s * 0.32, 0, 0, 7);
      ctx.fill();
    }

    if (item === "pancake") {
      disc(ctx, x, y + s * 0.3, s, base, dark);
      disc(ctx, x, y - s * 0.02, s * 0.96, base, dark);
      disc(ctx, x, y - s * 0.32, s * 0.92, base, dark);
      if (recipe.flavor === "chocchip") chips(ctx, x, y - s * 0.32, s * 0.9);
    } else if (item === "waffle") {
      disc(ctx, x, y, s * 1.05, shade(base, 0.05), dark);
      // grid
      ctx.strokeStyle = "rgba(120,80,30,0.55)";
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s * 0.32, y - s * 0.32);
        ctx.lineTo(x + i * s * 0.32, y + s * 0.1);
        ctx.stroke();
      }
      for (let j = 0; j <= 2; j++) {
        ctx.beginPath();
        ctx.moveTo(x - s, y - s * 0.28 + j * s * 0.2);
        ctx.lineTo(x + s, y - s * 0.28 + j * s * 0.2);
        ctx.stroke();
      }
    } else if (item === "frenchToast") {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.18);
      ctx.fillStyle = dark;
      rr(ctx, -s, -s * 0.7, s * 2, s * 0.95, s * 0.18);
      ctx.fill();
      ctx.fillStyle = shade(base, 0.08);
      rr(ctx, -s * 0.85, -s * 0.62, s * 1.7, s * 0.78, s * 0.14);
      ctx.fill();
      ctx.restore();
    } else if (item === "omelette") {
      ctx.fillStyle = "#ffd95e";
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.15, s * 0.62, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#ffc83a";
      ctx.beginPath();
      ctx.ellipse(x - s * 0.2, y - s * 0.05, s * 0.7, s * 0.4, -0.2, 0, 7);
      ctx.fill();
      // chives
      ctx.fillStyle = "#5bbf6a";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(x - s * 0.6 + i * s * 0.3, y - s * 0.2 + (i % 2) * 6, 4, 4);
      }
    }

    // topping
    if (recipe.topping && opt.topping !== false) {
      drawTopping(ctx, x, y - s * 0.55, s, recipe.topping);
    }
    ctx.restore();
  };

  function chips(ctx, x, y, r) {
    ctx.fillStyle = "#3a2417";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.2, 2.4, 0, 7);
      ctx.fill();
    }
  }

  function drawTopping(ctx, x, y, s, key) {
    const t = HK.TOPPINGS[key];
    if (key === "syrup") {
      ctx.fillStyle = "rgba(165,100,45,0.85)";
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.2, s * 0.9, s * 0.3, 0, 0, 7);
      ctx.fill();
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s * 0.5, y);
        ctx.quadraticCurveTo(x + i * s * 0.5 + 4, y + s * 0.4, x + i * s * 0.5, y + s * 0.6);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(165,100,45,0.85)";
        ctx.stroke();
      }
    } else if (key === "cream") {
      ctx.fillStyle = "#fffdf5";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + (i - 1) * s * 0.4, y, s * 0.32 - i * 2, 0, 7);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.5);
      ctx.lineTo(x - s * 0.18, y);
      ctx.lineTo(x + s * 0.18, y);
      ctx.fill();
    } else if (key === "berries") {
      const cols = ["#7b4bd1", "#9a5bd6", "#5b3aa8"];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.arc(x - s * 0.6 + i * s * 0.32, y + ((i % 2) - 0.5) * 6, s * 0.16, 0, 7);
        ctx.fill();
      }
    } else if (key === "banana") {
      ctx.fillStyle = "#ffe14d";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(x - s * 0.45 + i * s * 0.32, y, s * 0.18, s * 0.1, 0.5, 0, 7);
        ctx.fill();
        ctx.strokeStyle = "#e8c43a";
        ctx.stroke();
      }
    } else if (key === "nutella") {
      ctx.strokeStyle = "#5a3420";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - s * 0.7, y);
      ctx.quadraticCurveTo(x, y - s * 0.5, x + s * 0.2, y);
      ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.4, x + s * 0.7, y - s * 0.1);
      ctx.stroke();
    } else if (key === "strawberry") {
      for (let i = 0; i < 3; i++) {
        const sx = x - s * 0.45 + i * s * 0.45;
        ctx.fillStyle = "#ff5d6c";
        ctx.beginPath();
        ctx.moveTo(sx, y + s * 0.3);
        ctx.lineTo(sx - s * 0.18, y - s * 0.1);
        ctx.lineTo(sx + s * 0.18, y - s * 0.1);
        ctx.fill();
        ctx.fillStyle = "#5bbf6a";
        ctx.fillRect(sx - s * 0.12, y - s * 0.18, s * 0.24, 4);
      }
    }
  }
  HK.drawTopping = drawTopping;

  /* shade a hex color by amt (-1..1) */
  function shade(hex, amt) {
    const c = hex.replace("#", "");
    let r = parseInt(c.substr(0, 2), 16);
    let g = parseInt(c.substr(2, 2), 16);
    let b = parseInt(c.substr(4, 2), 16);
    r = Math.max(0, Math.min(255, Math.round(r + 255 * amt)));
    g = Math.max(0, Math.min(255, Math.round(g + 255 * amt)));
    b = Math.max(0, Math.min(255, Math.round(b + 255 * amt)));
    return `rgb(${r},${g},${b})`;
  }
  HK.shade = shade;

  /* steam wisps above a hot griddle */
  HK.drawSteam = function (ctx, x, y, t, intensity) {
    ctx.save();
    ctx.globalAlpha = 0.4 * (intensity || 1);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const ph = t * 0.004 + i * 2;
      const bx = x + (i - 1) * 14;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.quadraticCurveTo(bx + Math.sin(ph) * 8, y - 16, bx, y - 30);
      ctx.quadraticCurveTo(bx - Math.sin(ph) * 8, y - 44, bx, y - 58);
      ctx.stroke();
    }
    ctx.restore();
  };
})();
