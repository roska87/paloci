/* Motes — the ambient canvas of golden dust drifting behind the palace. */

export function initMotes() {
  const canvas = document.getElementById("motes");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let motes = [], W, H, raf;

  function resize() {
    W = canvas.width = innerWidth * dpr; H = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px";
  }
  function make() {
    motes = [];
    const n = Math.max(24, Math.min(70, Math.round(innerWidth * innerHeight / 26000)));
    for (let i = 0; i < n; i++) motes.push({
      x: Math.random() * W, y: Math.random() * H,
      r: (Math.random() * 1.6 + .5) * dpr,
      vy: -(Math.random() * .22 + .05) * dpr, vx: (Math.random() - .5) * .12 * dpr,
      a: Math.random() * .5 + .15, tw: Math.random() * .02 + .005, tp: Math.random() * 6.28
    });
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.x += m.vx; m.y += m.vy; m.tp += m.tw;
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
      if (m.x < -10) m.x = W + 10; if (m.x > W + 10) m.x = -10;
      const a = m.a * (.6 + .4 * Math.sin(m.tp));
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.2832);
      ctx.fillStyle = "rgba(216,171,90," + a.toFixed(3) + ")";
      ctx.shadowBlur = 6 * dpr; ctx.shadowColor = "rgba(216,171,90,.5)";
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    raf = requestAnimationFrame(draw);
  }

  resize(); make(); draw();
  if (reduce) cancelAnimationFrame(raf);
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); make(); }, 200); });
}
