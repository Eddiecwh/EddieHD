/* EddieHD — Puts the scene together each frame: floor, props, Eddie, speech bubble. Also: click Eddie to poke him.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

function drawFloor() {
  const y = L.floorY * DPR;
  const g = ctx.createLinearGradient(0, y, 0, cv.height);
  g.addColorStop(0, 'rgba(94,242,224,.06)'); g.addColorStop(1, 'rgba(94,242,224,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y, cv.width, cv.height - y);
  const lg = ctx.createLinearGradient(0, 0, cv.width, 0);
  lg.addColorStop(0, 'rgba(94,242,224,0)'); lg.addColorStop(.5, 'rgba(94,242,224,.35)'); lg.addColorStop(1, 'rgba(94,242,224,0)');
  ctx.fillStyle = lg; ctx.fillRect(0, y, cv.width, Math.max(1, DPR));
}

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
  updateRobot(dt, t); updateProp(dt);
  ctx.fillStyle = '#0b0f15'; ctx.fillRect(0, 0, cv.width, cv.height);
  drawFloor();
  const prop = P.state !== 'none' ? P.kind : null;
  if (prop === 'desk') { drawDesk(); drawClaw(); }
  if (prop === 'pod') drawPodBack(t);
  drawRobot(t);
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
