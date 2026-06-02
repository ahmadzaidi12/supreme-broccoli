/* =====================================================================
 * main.js — boots the game: canvas, the rAF loop, overlay screens
 * (menu / level intro / clear / game over / win), the mute button and
 * the service-worker registration that makes this installable as a PWA.
 * ===================================================================== */
(function () {
  const HK = window.HK;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const muteBtn = document.getElementById("mute-btn");

  HK.newGame();
  HK.bindInput(canvas);

  let lastMode = null;
  HK.onModeChange = syncOverlay;

  /* ---------- main loop ---------- */
  let last = performance.now();
  function frame(now) {
    let dt = now - last;
    last = now;
    if (dt > 60) dt = 60; // clamp after tab-switch / hitch
    // never let a single bad frame kill the loop (which would freeze the
    // game and make clicks stop registering) — log and keep going.
    try {
      HK.engine.update(dt);
      HK.render(ctx, now);
      if (HK.state.mode !== lastMode) syncOverlay();
    } catch (err) {
      console.error("frame error (recovered):", err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- overlay screens ---------- */
  function show(html) {
    overlay.innerHTML = html;
    overlay.classList.add("show");
  }
  function hide() {
    overlay.classList.remove("show");
    overlay.innerHTML = "";
  }

  function menuItemChips(L) {
    const all = [];
    L.items.forEach((k) =>
      all.push(`<span class="chip"><span class="emoji">${HK.ITEMS[k].emoji}</span>${HK.ITEMS[k].name}</span>`)
    );
    L.toppings.forEach((k) =>
      all.push(`<span class="chip"><span class="emoji">${HK.TOPPINGS[k].emoji}</span>${HK.TOPPINGS[k].name}</span>`)
    );
    return all.join("");
  }

  function syncOverlay() {
    const s = HK.state;
    lastMode = s.mode;
    switch (s.mode) {
      case HK.MODE.MENU:
        show(`
          <span class="tag">Hell's Breakfast</span>
          <h1>Flippin'<br/>Chaos</h1>
          <p>You're the <b>head chef</b>. Fire tickets, flip griddles in the golden zone,
          plate the right topping, and keep your cooks &amp; servers moving before
          hangry customers storm out. It's gonna get loud.</p>
          <button class="btn" data-act="start">Start Service 🔥</button>
          <p class="muted">Tip: tap a sizzling griddle right when the marker hits green.</p>
        `);
        break;

      case HK.MODE.INTRO: {
        const L = HK.LEVELS[s.levelIndex];
        show(`
          <span class="tag">Night ${L.n}</span>
          <h2>${L.name}</h2>
          <p>${L.blurb}</p>
          <div class="recipe-grid">${menuItemChips(L)}</div>
          <p class="muted">Serve <b>${L.quota}</b> happy tables &middot;
          ${L.cooks} cooks &middot; ${L.servers} server${L.servers > 1 ? "s" : ""}</p>
          <button class="btn" data-act="begin">Let's cook! 🍳</button>
        `);
        break;
      }

      case HK.MODE.LEVEL_CLEAR:
        show(`
          <span class="tag">Service Done</span>
          <h2>Night ${s.level.n} cleared! 🎉</h2>
          <div class="stat-row">
            <div>Earned<br/><b>$${s.moneyThisLevel}</b></div>
            <div>Best combo<br/><b>x${s.bestCombo}</b></div>
            <div>Hearts left<br/><b>${"♥".repeat(s.rep)}</b></div>
          </div>
          <p>Word's spreading about your breakfast joint. New items unlocked next night.</p>
          <button class="btn" data-act="next">Next Night →</button>
        `);
        break;

      case HK.MODE.GAME_OVER:
        show(`
          <span class="tag" style="background:#ff5d7a">86'd</span>
          <h1 style="color:#ff8fb1">Kitchen<br/>Closed</h1>
          <p>Too many walkouts — the rep tanked and Chef pulled the plug on Night ${s.level.n}.</p>
          <div class="stat-row"><div>Total earned<br/><b>$${s.totalMoney}</b></div></div>
          <button class="btn" data-act="retry">Retry Night ${s.level.n}</button>
          <button class="btn secondary" data-act="menu">Main Menu</button>
        `);
        break;

      case HK.MODE.WIN:
        show(`
          <span class="tag" style="background:#7ed957;color:#1c3d12">Legend</span>
          <h1>You Run<br/>The Pass!</h1>
          <p>Every night cleared. The brigade salutes you, Chef. The breakfast empire is yours.</p>
          <div class="stat-row"><div>Lifetime earnings<br/><b>$${s.totalMoney}</b></div></div>
          <button class="btn" data-act="again">Play Again</button>
        `);
        break;

      default:
        hide();
    }
  }

  overlay.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    HK.audio.resume();
    const act = btn.dataset.act;
    const s = HK.state;
    if (act === "start") {
      s.levelIndex = 0;
      s.mode = HK.MODE.INTRO;
      HK.startLevel();
      syncOverlay();
    } else if (act === "begin") {
      s.mode = HK.MODE.PLAY;
      hide();
      lastMode = s.mode;
    } else if (act === "next") {
      s.levelIndex++;
      HK.startLevel();
      s.mode = HK.MODE.INTRO;
      syncOverlay();
    } else if (act === "retry") {
      HK.startLevel();
      s.rep = HK.START_REP;
      s.mode = HK.MODE.INTRO;
      syncOverlay();
    } else if (act === "menu" || act === "again") {
      HK.newGame();
      syncOverlay();
    }
  });

  /* ---------- mute ---------- */
  muteBtn.addEventListener("click", () => {
    const m = HK.audio.toggleMute();
    muteBtn.textContent = m ? "🔇" : "🔊";
  });

  /* ---------- PWA: register the service worker ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  syncOverlay();
})();
