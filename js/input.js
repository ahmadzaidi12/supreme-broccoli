/* =====================================================================
 * input.js — pointer + keyboard handling. Translates screen taps into
 * canvas coords, hit-tests HK.hot (built by render.js) and dispatches
 * to engine actions. Works for both mouse and touch (PWA friendly).
 * ===================================================================== */
(function () {
  const HK = (window.HK = window.HK || {});

  HK.bindInput = function (canvas) {
    function toCanvas(e) {
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
      return { x: cx, y: cy };
    }

    function hitTest(x, y) {
      // iterate in reverse so topmost (later-drawn) zones win
      for (let i = HK.hot.length - 1; i >= 0; i--) {
        const z = HK.hot[i];
        if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z;
      }
      return null;
    }

    function dispatch(z) {
      const eng = HK.engine;
      switch (z.type) {
        case "ticket": eng.assignTicket(z.ref); break;
        case "station": eng.flip(z.ref); break;
        case "topping": eng.plate(z.ref); break;
        case "expedite": eng.expedite(); break;
        case "sous": eng.sousChef(); break;
      }
    }

    function onDown(e) {
      HK.audio.resume();
      if (!HK.state || HK.state.mode !== HK.MODE.PLAY) return;
      const p = toCanvas(e);
      const z = hitTest(p.x, p.y);
      if (z) {
        e.preventDefault();
        dispatch(z);
      }
    }

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    // prevent long-press context menu / double-tap zoom annoyances on mobile
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("dblclick", (e) => e.preventDefault());

    window.addEventListener("keydown", (e) => {
      if (!HK.state || HK.state.mode !== HK.MODE.PLAY) return;
      const k = e.key.toLowerCase();
      if (k === "e") HK.engine.expedite();
      else if (k === "s") HK.engine.sousChef();
      else if (k === " " || k === "f") {
        // flip the most urgent cooking station, or fire next ticket
        const s = HK.state;
        let urgent = null;
        for (const st of s.stations) {
          if (st.phase === "cook" && !st.flipped) {
            if (!urgent || st.sweep > urgent.sweep) urgent = st;
          }
        }
        if (urgent) HK.engine.flip(urgent);
        else HK.engine.assignOldest();
        e.preventDefault();
      }
    });
  };
})();
