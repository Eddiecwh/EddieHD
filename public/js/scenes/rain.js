/* EddieHD — Rain: background rain sound, rain in the scenes, and Eddie's umbrella.
   Sound: a looping recorded rain track (public/audio/rain.mp3), faded in and out with Web Audio.
   Indoors (default, café, library) rain only shows through the windows (the default studio gets a faint drizzle);
   in the park it rains on everything and Eddie puts his umbrella up.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

// rain always starts off: browsers block sound until you click, so a remembered "on" would show rain with no sound
const RAIN = { on: false, amt: 0, el: null, out: null, gain: -1, stopTimer: 0 };

function setRain(on) {
  RAIN.on = on;
  if (on) startRainAudio(); // called from a click, so the browser lets it play
  const where =
    ST.cur === "park" ? "park" : ST.cur === "default" ? "default" : "inside";
  say(
    on ? LINES.rainOn[where] : pick(LINES.rainOff),
    on && where === "park" ? "proud" : "happy",
  );
  syncControls();
}

/* --- sound ------------------------------------------------------------- */
// a recorded rain loop (public/audio/rain.mp3), streamed through an <audio> element so the whole file
// isn't decoded into memory, then routed through Web Audio for smooth fades
const RAIN_SRC = "audio/rain.mp3";
function startRainAudio() {
  try {
    actx = actx || new AudioContext();
    if (actx.state === "suspended") actx.resume();
  } catch (e) {
    return;
  }
  if (!RAIN.out) {
    const el = new Audio(RAIN_SRC);
    el.loop = true;
    el.preload = "auto";
    const out = actx.createGain();
    out.gain.value = 0;
    actx.createMediaElementSource(el).connect(out).connect(actx.destination);
    RAIN.el = el;
    RAIN.out = out;
    RAIN.gain = -1;
  }
  clearTimeout(RAIN.stopTimer);
  RAIN.el.play().catch(() => {});
}
function updateRain(dt, now) {
  RAIN.amt = clamp(RAIN.amt + (RAIN.on ? dt : -dt) / 2.5, 0, 1); // rain fades in / out over 2.5 s
  if (!RAIN.out) return;
  const g = RAIN.on ? prefs.rainVol : 0;
  if (g !== RAIN.gain) {
    RAIN.out.gain.setTargetAtTime(g, actx.currentTime, 0.9);
    RAIN.gain = g;
    clearTimeout(RAIN.stopTimer);
    if (!RAIN.on)
      RAIN.stopTimer = setTimeout(() => {
        if (!RAIN.on) RAIN.el.pause();
      }, 5000); // pause once faded out
  }
}

/* --- visuals ------------------------------------------------------------ */
// falling streaks inside the current clip; same pattern every frame, moved along by time t (seconds)
function streaks(g, x0, y0, w, h, t, n, alpha, len, speed) {
  g.strokeStyle = `rgba(190,210,255,${alpha})`;
  g.lineWidth = 1.2;
  g.lineCap = "round";
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const r1 = (i * 0.6180339) % 1,
      r2 = (i * 0.7548776) % 1,
      sp = speed * (0.8 + r2 * 0.5);
    const y = y0 + ((r2 + (t * sp) / h) % 1) * (h + len) - len,
      x = x0 + ((r1 + ((y - y0) * 0.12) / w) % 1) * w;
    g.moveTo(x, y);
    g.lineTo(x - len * 0.12, y + len);
  }
  g.stroke();
}

function drawRain(name, g, W, H, F, k, t) {
  const a = RAIN.amt;
  if (a <= 0) return;
  if (name === "park") {
    // outdoors: darker sky, rain everywhere, splashes
    g.fillStyle = `rgba(6,10,24,${0.32 * a})`;
    g.fillRect(0, 0, W, H);
    streaks(g, 0, 0, W, F, t, Math.round(W / 6), 0.28 * a, 22, 900);
    g.strokeStyle = `rgba(200,220,255,${0.35 * a})`;
    g.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const cyc = t * 3 + i * 0.37,
        n = Math.floor(cyc),
        ph = cyc - n;
      const x = (((n * 97 + i * 211) % 1000) / 1000) * W;
      g.globalAlpha = 1 - ph;
      g.beginPath();
      g.ellipse(x, F + 2, 2 + ph * 7, 1 + ph * 2, 0, PI, 2 * PI);
      g.stroke();
    }
    g.globalAlpha = 1;
  } else if (name === "cafe" && CAFE.win) {
    const { x, y, w, h } = CAFE.win;
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    streaks(g, x, y, w, h, t, Math.round(w / 5), 0.35 * a, 16, 600);
    beads(g, x, y, w, h, t, a);
    g.restore();
  } else if (name === "library" && LIB.win) {
    const { wx, wt, ww, wb } = LIB.win;
    g.save();
    g.beginPath();
    g.moveTo(wx, wb);
    g.lineTo(wx, wt + ww / 2);
    g.arc(wx + ww / 2, wt + ww / 2, ww / 2, PI, 0);
    g.lineTo(wx + ww, wb);
    g.closePath();
    g.clip();
    streaks(g, wx, wt, ww, wb - wt, t, Math.round(ww / 5), 0.3 * a, 16, 600);
    beads(g, wx, wt, ww, wb - wt, t, a);
    g.restore();
  } else if (name === "default") {
    streaks(g, 0, 0, W, F, t, Math.round(W / 12), 0.07 * a, 26, 800);
  }
}

// drops trickling down the glass
function beads(g, x, y, w, h, t, a) {
  g.fillStyle = `rgba(210,225,255,${0.45 * a})`;
  for (let i = 0; i < 14; i++) {
    const r1 = (i * 0.6180339) % 1,
      sp = 0.04 + ((i * 0.414) % 1) * 0.08;
    const yy = y + ((r1 * 3 + t * sp) % 1) * h,
      xx = x + ((i * 0.7548776) % 1) * w + Math.sin(t + i) * 1.5;
    g.beginPath();
    g.ellipse(xx, yy, 1.6, 2.4, 0, 0, 2 * PI);
    g.fill();
  }
}

/* --- umbrella ------------------------------------------------------------ */
// up whenever it's raining in the park, except while hauling a set, packed up, or tucked in the charging pod
function updateUmbrella(dt, staging) {
  const hauling = ST.phase === "grab" || ST.phase === "pull";
  const nearPod = P.kind === "pod" && Math.abs(R.x - P.x) < L.size * 0.8;
  const want =
    RAIN.on && ST.cur === "park" && !hauling && R.ball < 0.05 && !nearPod;
  R.umb = clamp(R.umb + (want ? dt : -dt * 1.4) / 1.1, 0, 1);
  const benchTilt = R.act === "bench" && R.sit > 0.5 ? 0.32 : 0; // on the bench: tip it over the dog too
  R.umbTilt = lerp(
    R.umbTilt,
    benchTilt - (R.vx / (160 * L.k)) * 0.15,
    Math.min(1, dt * 4),
  );
  if (R.umb > 0.01)
    grip(-1, -36, -136 + 30 * (1 - Math.min(1, R.umb / 0.4)), 1, true); // raise it, then hold it up
}
