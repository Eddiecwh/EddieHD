/* EddieHD — Scene changes, theatre style. Eddie walks off into the nearer wing, ties a rope to the new set,
   then hauls it across the stage so it slides in over the old one, and walks back on once it's in place.
   requestScene(name) asks for a change; stageUpdate() runs it each frame and takes over Eddie while it does.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

const ST = {
  cur: SCENES[prefs.scene] ? prefs.scene : "default",
  next: null,
  queued: null,
  phase: "", // '' · 'prep' (step out of the pod) · 'exit' (walk off) · 'grab' (tie the rope) · 'pull' · 'return'
  dir: 1, // +1: the new set comes in from the left and is pulled to the right; -1: the other way
  t: 0,
  edge: 0,
  backX: 0,
};
const ropeLen = () => L.size * 0.8;
const wingX = () => L.size * 0.9; // how far past the window edge Eddie goes to be out of sight

function requestScene(name) {
  if (!SCENES[name]) return;
  ST.queued = name; // starts as soon as Eddie is free (after the current change, or after a pause)
  if (S.paused && !ST.phase && name !== ST.cur)
    say(pick(LINES.sceneLater), "sleepy");
}

// returns true while the scene change is in charge of Eddie
function stageUpdate(dt, now) {
  R.haul = lerp(
    R.haul,
    ST.phase === "grab" || ST.phase === "pull" ? 1 : 0,
    Math.min(1, dt * 6),
  );
  R.haulDir = ST.dir;
  if (!ST.phase) {
    if (!ST.queued || ST.queued === ST.cur) {
      ST.queued = null;
      return false;
    }
    if (S.paused || R.ball > 0.05 || R.popStart) return false;
    ST.next = ST.queued;
    ST.queued = null;
    ST.phase = "prep";
    ST.t = 0;
    ST.dir = R.x < innerWidth / 2 ? 1 : -1;
    say(pick(LINES.sceneStart), "focused");
  }
  ST.t += dt;
  const W = innerWidth,
    rope = ropeLen(),
    wing = wingX();
  switch (ST.phase) {
    case "prep": // off the ladder and out of the pod before walking out
      R.tx = null;
      if (R.ladder || R.sit > 0.15) break;
      if (
        P.kind === "pod" &&
        Math.abs(R.x - P.x) < L.size * 0.55 &&
        P.door > 0.15
      ) {
        P.doorT = 0;
        break;
      }
      ST.phase = "exit";
      break;
    case "exit": {
      const tx = ST.dir > 0 ? -wing : W + wing;
      if (R.tx == null && Math.abs(R.x - tx) < 3) {
        ST.phase = "grab";
        ST.t = 0;
        R.tx = null;
      } else R.tx = tx;
      break;
    }
    case "grab": // offstage: tie on, brace
      R.tx = null;
      ST.edge = R.x - ST.dir * rope;
      if (ST.t > 0.7) {
        ST.phase = "pull";
        ST.t = 0;
        setExpr("focused");
      }
      break;
    case "pull":
      R.tx = ST.dir > 0 ? W + rope + wing : -rope - wing;
      ST.edge = R.x - ST.dir * rope;
      if (ST.dir > 0 ? ST.edge >= W : ST.edge <= 0) {
        ST.cur = ST.next;
        ST.next = null;
        ST.phase = "return";
        ST.t = 0;
        ST.backX = clamp(
          ST.dir > 0
            ? W - L.size * (1 + Math.random() * 2)
            : L.size * (1 + Math.random() * 2),
          L.minX,
          L.maxX,
        );
      }
      break;
    case "return":
      if (R.tx == null && Math.abs(R.x - ST.backX) < 3) {
        ST.phase = "";
        say(LINES.sceneDone[ST.cur] || LINES.sceneDone.default, "proud");
        onModeChange(null, S.paused ? "paused" : S.mode, now); // back to whatever the timer wants
        return false;
      }
      R.tx = ST.backX;
      break;
  }
  return true;
}
function stageSpeed() {
  if (ST.phase === "pull")
    return clamp((innerWidth + L.size * 3) / 4.6, 143 * L.k, 325 * L.k); // ~4.6 s to cross
  return 208 * L.k; // sprint to and from the wings
}

/* --- drawing ---------------------------------------------------------- */
function drawStage(t) {
  drawScene(ST.cur, t);
  if (ST.phase !== "grab" && ST.phase !== "pull") return;
  const e = ST.edge,
    d = ST.dir,
    W = innerWidth,
    F = L.floorY,
    k = L.k;
  if (d > 0 ? e <= 0 : e >= W) return;
  drawScene(ST.next, t, d > 0 ? [0, e] : [e, W]);
  ctx.save();
  ctx.scale(DPR, DPR);
  // shadow the new set casts on the old one
  const sh = ctx.createLinearGradient(e, 0, e + d * 46, 0);
  sh.addColorStop(0, "rgba(0,0,0,.5)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(Math.min(e, e + d * 46), 0, 46, innerHeight);
  // the flat's wooden frame on its leading edge, a caster wheel and the rope ring
  const fw = 10,
    fx = d > 0 ? e - fw : e;
  const wood = ctx.createLinearGradient(fx, 0, fx + fw, 0);
  wood.addColorStop(0, "#6b4a2f");
  wood.addColorStop(0.5, "#8a6440");
  wood.addColorStop(1, "#5a3d26");
  ctx.fillStyle = wood;
  ctx.fillRect(fx, 0, fw, F);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  for (let y = 40; y < F; y += 120) ctx.fillRect(fx, y, fw, 2);
  const wy = F - 7 * k,
    wx = e - d * 14 * k;
  ctx.fillStyle = "#1d2026";
  ctx.beginPath();
  ctx.arc(wx, wy, 7 * k, 0, 2 * PI);
  ctx.fill();
  ctx.fillStyle = "#8b9099";
  ctx.beginPath();
  ctx.arc(wx, wy, 2.5 * k, 0, 2 * PI);
  ctx.fill();
  ctx.strokeStyle = "#b8b2a4";
  ctx.lineWidth = 2.5 * k;
  ctx.beginPath();
  ctx.arc(e + d * 3 * k, F - 70 * k, 5 * k, 0, 2 * PI);
  ctx.stroke();
  ctx.restore();
}
// furniture in front of Eddie (the café table), sliding in with its set like the backdrop does
function drawFront(t) {
  const layer = (name, clip) => {
    const f = SCENES[name].front;
    if (!f) return;
    ctx.save();
    ctx.scale(DPR, DPR);
    if (clip) {
      ctx.beginPath();
      ctx.rect(clip[0], 0, clip[1] - clip[0], innerHeight);
      ctx.clip();
    }
    f(ctx, innerWidth, innerHeight, L.floorY, L.k, t / 1000);
    ctx.restore();
  };
  const sliding = ST.phase === "grab" || ST.phase === "pull",
    e = ST.edge,
    W = innerWidth;
  if (!sliding) return layer(ST.cur);
  layer(ST.cur, ST.dir > 0 ? [e, W] : [0, e]);
  layer(ST.next, ST.dir > 0 ? [0, e] : [e, W]);
}
// the rope's back end, from the flat up across Eddie's back to the top of his shoulder (drawn over him; the bit down to his hand is drawn with his arm)
function drawRope() {
  if (R.haul < 0.05 || (ST.phase !== "grab" && ST.phase !== "pull")) return;
  const k = L.k,
    ax = ST.edge + ST.dir * 3 * k,
    ay = L.floorY - 70 * k,
    hx = R.shX,
    hy = R.shY;
  const sag = ST.phase === "pull" ? 6 * k : 26 * k;
  ctx.save();
  ctx.scale(DPR, DPR);
  ctx.strokeStyle = "#c9a86a";
  ctx.lineWidth = 3 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + hx) / 2, Math.max(ay, hy) + sag, hx, hy);
  ctx.stroke();
  ctx.restore();
}
