/* A strict, headless 2D canvas context that throws on the same inputs a
 * real browser rejects with IndexSizeError — negative / non-finite radii
 * in arc(), ellipse() and arcTo(). This lets us catch drawing bugs (like a
 * dollop radius going negative at small sizes) in Node, with no browser.
 *
 * Every other method is a no-op; gradients return a stub with addColorStop.
 * Property assignments (fillStyle, font, …) are accepted and ignored.
 */
function badRadius(name, r) {
  return typeof r !== "number" || !isFinite(r) || r < 0
    ? new Error(`${name}: invalid radius ${r} (browser would throw IndexSizeError)`)
    : null;
}

function makeStrictCtx() {
  const gradient = { addColorStop() {} };
  const store = {};
  const handler = {
    get(_t, prop) {
      if (prop in store) return store[prop];
      switch (prop) {
        case "arc":
          return (x, y, r) => { const e = badRadius("arc", r); if (e) throw e; };
        case "ellipse":
          return (x, y, rx, ry) => {
            let e = badRadius("ellipse.radiusX", rx); if (e) throw e;
            e = badRadius("ellipse.radiusY", ry); if (e) throw e;
          };
        case "arcTo":
          return (x1, y1, x2, y2, r) => { const e = badRadius("arcTo", r); if (e) throw e; };
        case "createLinearGradient":
        case "createRadialGradient":
        case "createPattern":
          return () => gradient;
        case "measureText":
          return () => ({ width: 8 });
        case "getImageData":
          return () => ({ data: [] });
        default:
          return () => undefined; // all other ctx methods: no-op
      }
    },
    set(_t, prop, value) { store[prop] = value; return true; },
  };
  return new Proxy({}, handler);
}

module.exports = { makeStrictCtx, badRadius };
