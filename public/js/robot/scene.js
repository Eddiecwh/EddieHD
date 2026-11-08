/* EddieHD — Puts the scene together each frame: backdrop, props, Eddie, speech bubble. Also: click Eddie to poke him.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* speech bubble that follows Eddie */
const bubble = { text: '', until: 0 };
function updateBubble(now) {
  const b = $('bubble');
  let text = '', cls = 'bubble';
  if (now < bubble.until) text = bubble.text;
  else if (awaiting) { text = '?'; cls += ' mark ask'; }
  else if (R.alert) { text = '!'; cls += ' mark alert'; }
  if (!text) { b.hidden = true; return; }
  if (b.textContent !== text) b.textContent = text;
  if (b.className !== cls) b.className = cls;
  b.hidden = false;
  const w = b.offsetWidth, h = b.offsetHeight;
  let x = clamp(R.x, 16 + w / 2, innerWidth - 16 - w / 2);
  let top = (R.inPod && P.door > .3) ? Math.min(R.headTop, L.floorY - 305 * L.k) : R.headTop;   // clear the pod's cap
  // no room between the timer and his head (short screens): put the bubble beside his head instead
  const clockBottom = document.querySelector('.clock').getBoundingClientRect().bottom;
  if (top - 6 - h < clockBottom + 8) {
    const off = (R.inPod ? 95 : 62) * L.k + w / 2 + 10, right = R.x + off + w / 2 < innerWidth - 16;
    x = clamp(R.x + (right ? off : -off), 16 + w / 2, innerWidth - 16 - w / 2);
    top = R.headTop + 120 * L.k; cls += ' side';
    if (b.className !== cls) b.className = cls;
  }
  b.style.left = x + 'px'; b.style.top = (top - 6) + 'px';
  b.style.setProperty('--tail', clamp(w / 2 + (R.x - x), 14, w - 14) + 'px');
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t;
  for (const k of ['open', 'w', 'h', 'smile', 'drop', 'tilt', 'mouth', 'mouthOpen', 'mouthW', 'lookX', 'lookY', 'hearts'])
    cur[k] = lerp(cur[k], target[k], .14);
  const tc = hex(target.color); curRGB = curRGB.map((c, i) => lerp(c, tc[i], .1));
  if (t > nextBlink) { blink = .08; setTimeout(() => blink = 1, 110); nextBlink = t + 2500 + Math.random() * 3500; }
  updateLevel();
  updateRobot(dt, t); updateProp(dt); updateRain(dt, t);
  drawStage(t);                                                        // backdrop (and the new one sliding in)
  const prop = P.state !== 'none' ? P.kind : null;
  if (prop === 'desk') { drawDesk(); drawClaw(); }
  if (prop === 'pod') drawPodBack(t);
  drawRobot(t);
  drawFront(t);                                                        // café table etc.
  drawRope();                                                          // over his back and shoulder
  if (prop === 'pod') { drawPodFront(t); drawClaw(); }
  updateBubble(t);
  requestAnimationFrame(frame);
}

// poke Eddie
cv.addEventListener('click', e => {
  const x = e.clientX, y = e.clientY;
  if (Math.abs(x - R.x) < L.size * .35 && y > L.floorY - L.size * 1.1 && y < L.floorY + 10) {
    attend(3500); R.wave = 1.4; clearTimeout(revertTimer); setExpr('surprised');
    revertTimer = setTimeout(() => setExpr('happy'), 500); setTimeout(() => { if (exprName === 'happy') setExpr(baseMood()); }, 3500);
    chirp(4);
  }
});
