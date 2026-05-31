/* =====================================================================
 * audio.js — tiny synthesized SFX via WebAudio. No asset files, so it
 * works straight from file:// and inside the PWA cache. Sounds are
 * short and punchy to match the chaotic vibe.
 * ===================================================================== */
(function () {
  const HK = (window.HK = window.HK || {});

  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(vol || 0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  function noise(dur, vol) {
    if (muted || !ensure()) return;
    if (ctx.state === "suspended") ctx.resume();
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol || 0.15;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1400;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start();
  }

  HK.sfx = {
    fire: () => tone(680, 0.08, "triangle", 0.25, 980),
    flipPerfect: () => {
      tone(700, 0.09, "square", 0.22, 1100);
      setTimeout(() => tone(1180, 0.12, "square", 0.22), 70);
    },
    flipOkay: () => tone(520, 0.1, "triangle", 0.2, 640),
    burnt: () => {
      noise(0.35, 0.2);
      tone(150, 0.3, "sawtooth", 0.18, 70);
    },
    sizzle: () => noise(0.12, 0.05),
    plate: () => tone(880, 0.07, "sine", 0.2, 1320),
    serve: () => {
      tone(660, 0.08, "sine", 0.22, 990);
      setTimeout(() => tone(990, 0.1, "sine", 0.22, 1320), 60);
    },
    coin: () => tone(1320, 0.07, "square", 0.16, 1760),
    walkout: () => {
      tone(330, 0.25, "sawtooth", 0.2, 120);
    },
    wrong: () => tone(220, 0.18, "square", 0.2, 160),
    levelUp: () => {
      [523, 659, 784, 1046].forEach((f, i) =>
        setTimeout(() => tone(f, 0.18, "triangle", 0.24), i * 110)
      );
    },
    gameOver: () => {
      [440, 392, 330, 262].forEach((f, i) =>
        setTimeout(() => tone(f, 0.3, "sawtooth", 0.2), i * 160)
      );
    },
  };

  HK.audio = {
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted: () => muted,
    resume() {
      if (ensure() && ctx.state === "suspended") ctx.resume();
    },
  };
})();
