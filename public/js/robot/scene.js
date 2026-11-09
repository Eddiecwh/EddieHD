/* EddieHD — Puts the scene together each frame: backdrop, props, Eddie, speech bubble. Also: click Eddie to poke him.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* speech bubble that follows Eddie */
const bubble = { text: "", until: 0, side: false, right: null }; // side/right: where it sits when there's no room above his head
function updateBubble(now) {
  const b = $("bubble");
  let text = "",
    cls = "bubble";
  if (now < bubble.until) text = bubble.text;
  else if (awaiting) {
    text = "?";
    cls += " mark ask";
  } else if (R.alert) {
    text = "!";
    cls += " mark alert";
  }
  if (!text) {
    b.hidden = true;
    return;
  }
  if (b.textContent !== text) b.textContent = text;
  if (b.className !== cls) b.className = cls;
  b.hidden = false;
  const w = b.offsetWidth,
    h = b.offsetHeight;
  // during a scene change he runs off into the wings: the bubble goes with him instead of waiting at the screen edge
  const keepIn = (v) =>
    ST.phase ? v : clamp(v, 16 + w / 2, innerWidth - 16 - w / 2);
  let x = keepIn(R.x);
  let top =
    R.inPod && P.door > 0.3
      ? Math.min(R.headTop, L.floorY - 305 * L.k)
      : R.headTop; // clear the pod's cap
  // no room between the timer and his head (short screens): put the bubble beside his head instead.
  // With some slack either way, so his head bobbing while he runs can't flip it back and forth every few frames.
  const clockBottom = document
    .querySelector(".clock")
    .getBoundingClientRect().bottom;
  const room = top - 6 - h - (clockBottom + 8);
  bubble.side = bubble.side ? room < 24 : room < 0;
  if (bubble.side) {
    const off = (R.inPod ? 95 : 62) * L.k + w / 2 + 10;
    if (!ST.phase || bubble.right == null)
      bubble.right = R.x + off + w / 2 < innerWidth - 16; // keep its side while he runs
    x = keepIn(R.x + (bubble.right ? off : -off));
    top = R.headTop + 120 * L.k;
    cls += " side";
    if (b.className !== cls) b.className = cls;
  }
  b.style.left = x + "px";
  b.style.top = top - 6 + "px";
  b.style.setProperty("--tail", clamp(w / 2 + (R.x - x), 14, w - 14) + "px");
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  for (const k of [
    "open",
    "w",
    "h",
    "smile",
    "drop",
    "tilt",
    "mouth",
    "mouthOpen",
    "mouthW",
    "lookX",
    "lookY",
    "hearts",
  ])
    cur[k] = lerp(cur[k], target[k], 0.14);
  const tc = hex(target.color);
  curRGB = curRGB.map((c, i) => lerp(c, tc[i], 0.1));
  if (t > nextBlink) {
    blink = 0.08;
    setTimeout(() => (blink = 1), 110);
    nextBlink = t + 2500 + Math.random() * 3500;
  }
  countdown(); // timer.js: 3-2-1 beeps, on the second
  updateRobot(dt, t);
  updateProp(dt);
  updateRain(dt, t);
  drawStage(t); // backdrop (and the new one sliding in)
  const prop = P.state !== "none" ? P.kind : null;
  if (prop === "desk") {
    drawDesk();
    drawClaw();
  }
  if (prop === "pod") drawPodBack(t);
  drawRobot(t);
  drawFront(t); // café table etc.
  drawRope(); // over his back and shoulder
  if (prop === "pod") {
    drawPodFront(t);
    drawClaw();
  }
  updateBubble(t);
  requestAnimationFrame(frame);
}

// poke Eddie
cv.addEventListener("click", (e) => {
  const x = e.clientX,
    y = e.clientY;
  if (
    Math.abs(x - R.x) < L.size * 0.35 &&
    y > L.floorY - L.size * 1.1 &&
    y < L.floorY + 10
  ) {
    attend(3500);
    R.wave = 1.4;
    clearTimeout(revertTimer);
    setExpr("surprised");
    revertTimer = setTimeout(() => setExpr("happy"), 500);
    setTimeout(() => {
      if (exprName === "happy") setExpr(baseMood());
    }, 3500);
    chirp(4);
  }
});
