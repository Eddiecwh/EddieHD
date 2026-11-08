/* EddieHD — Rain: background rain sound, rain in the scenes, and Eddie's umbrella.
   Sound: made on the fly with Web Audio (no files): looping pink noise, filtered, with slow gusts, plus little drips.
   Indoors (default, café, library) rain only shows through the windows (the default studio gets a faint drizzle);
   in the park it rains on everything and Eddie puts his umbrella up.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

// rain always starts off: browsers block sound until you click, so a remembered "on" would show rain with no sound
const RAIN = { on: false, amt: 0, out: null, buf: null, nextDrip: 0, gain: -1 };

function setRain(on) {
  RAIN.on = on;
  if (on) startRainAudio();                                            // called from a click, so the browser lets it play
  const where = ST.cur === 'park' ? 'park' : ST.cur === 'default' ? 'default' : 'inside';
  say(on ? LINES.rainOn[where] : pick(LINES.rainOff), on && where === 'park' ? 'proud' : 'happy');
  syncControls();
}

/* --- sound ------------------------------------------------------------- */
function startRainAudio() {
  try { actx = actx || new AudioContext(); if (actx.state === 'suspended') actx.resume(); } catch (e) { return; }
  if (RAIN.out) return;
  const sr = actx.sampleRate, n = sr * 4, buf = actx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {                                    // pink noise (Paul Kellet's filter): softer than white, like rain
    const d = buf.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * .1848) * .11;
    }
  }
  const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
  const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.Q.value = .3;
  const swell = actx.createGain(); swell.gain.value = .85;              // gusts: a slow wobble in loudness
  const lfo = actx.createOscillator(), depth = actx.createGain(); lfo.frequency.value = .07; depth.gain.value = .15;
  lfo.connect(depth).connect(swell.gain); lfo.start();
  const out = actx.createGain(); out.gain.value = 0;
  src.connect(hp).connect(lp).connect(swell).connect(out).connect(actx.destination);
  src.start();
  RAIN.out = out; RAIN.buf = buf; RAIN.gain = -1;
}
function drip(vol) {                                                    // one drop landing nearby: a tiny filtered click
  const s = actx.createBufferSource(); s.buffer = RAIN.buf;
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200 + Math.random() * 3800; bp.Q.value = 4;
  const g = actx.createGain(), at = actx.currentTime;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol * (.15 + Math.random() * .25), at + .004); g.gain.exponentialRampToValueAtTime(.0001, at + .06);
  s.connect(bp).connect(g).connect(actx.destination);
  s.start(at, Math.random() * 3, .07);
}
function updateRain(dt, now) {
  RAIN.amt = clamp(RAIN.amt + (RAIN.on ? dt : -dt) / 2.5, 0, 1);       // rain fades in / out over 2.5 s
  if (!RAIN.out) return;
  const g = RAIN.on ? prefs.rainVol * .6 : 0;
  if (g !== RAIN.gain) { RAIN.out.gain.setTargetAtTime(g, actx.currentTime, .9); RAIN.gain = g; }
  if (RAIN.on && now > RAIN.nextDrip) { drip(prefs.rainVol); RAIN.nextDrip = now + 40 + Math.random() * 260; }
}

/* --- visuals ------------------------------------------------------------ */
// falling streaks inside the current clip; same pattern every frame, moved along by time t (seconds)
function streaks(g, x0, y0, w, h, t, n, alpha, len, speed) {
  g.strokeStyle = `rgba(190,210,255,${alpha})`; g.lineWidth = 1.2; g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const r1 = (i * 0.6180339) % 1, r2 = (i * 0.7548776) % 1, sp = speed * (.8 + r2 * .5);
    const y = y0 + ((r2 + t * sp / h) % 1) * (h + len) - len, x = x0 + ((r1 + (y - y0) * .12 / w) % 1) * w;
    g.moveTo(x, y); g.lineTo(x - len * .12, y + len);
  }
  g.stroke();
}
function drawRain(name, g, W, H, F, k, t) {
  const a = RAIN.amt; if (a <= 0) return;
  if (name === 'park') {                                                 // outdoors: darker sky, rain everywhere, splashes
    g.fillStyle = `rgba(6,10,24,${.32 * a})`; g.fillRect(0, 0, W, H);
    streaks(g, 0, 0, W, F, t, Math.round(W / 6), .28 * a, 22, 900);
    g.strokeStyle = `rgba(200,220,255,${.35 * a})`; g.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const cyc = t * 3 + i * .37, n = Math.floor(cyc), ph = cyc - n;
      const x = ((n * 97 + i * 211) % 1000) / 1000 * W;
      g.globalAlpha = 1 - ph; g.beginPath(); g.ellipse(x, F + 2, 2 + ph * 7, 1 + ph * 2, 0, PI, 2 * PI); g.stroke();
    }
    g.globalAlpha = 1;
  } else if (name === 'cafe' && CAFE.win) {
    const { x, y, w, h } = CAFE.win;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    streaks(g, x, y, w, h, t, Math.round(w / 5), .35 * a, 16, 600);
    beads(g, x, y, w, h, t, a);
    g.restore();
  } else if (name === 'library' && LIB.win) {
    const { wx, wt, ww, wb } = LIB.win;
    g.save(); g.beginPath(); g.moveTo(wx, wb); g.lineTo(wx, wt + ww / 2); g.arc(wx + ww / 2, wt + ww / 2, ww / 2, PI, 0); g.lineTo(wx + ww, wb); g.closePath(); g.clip();
    streaks(g, wx, wt, ww, wb - wt, t, Math.round(ww / 5), .3 * a, 16, 600);
    beads(g, wx, wt, ww, wb - wt, t, a);
    g.restore();
  } else if (name === 'default') {
    streaks(g, 0, 0, W, F, t, Math.round(W / 12), .07 * a, 26, 800);
  }
}
// drops trickling down the glass
function beads(g, x, y, w, h, t, a) {
  g.fillStyle = `rgba(210,225,255,${.45 * a})`;
  for (let i = 0; i < 14; i++) {
    const r1 = (i * .6180339) % 1, sp = .04 + ((i * .414) % 1) * .08;
    const yy = y + ((r1 * 3 + t * sp) % 1) * h, xx = x + ((i * .7548776) % 1) * w + Math.sin(t + i) * 1.5;
    g.beginPath(); g.ellipse(xx, yy, 1.6, 2.4, 0, 0, 2 * PI); g.fill();
  }
}

/* --- umbrella ------------------------------------------------------------ */
// up whenever it's raining in the park, except while hauling a set, packed up, or tucked in the charging pod
function updateUmbrella(dt, staging) {
  const hauling = ST.phase === 'grab' || ST.phase === 'pull';
  const nearPod = P.kind === 'pod' && Math.abs(R.x - P.x) < L.size * .8;
  const want = RAIN.on && ST.cur === 'park' && !hauling && R.ball < .05 && !nearPod;
  R.umb = clamp(R.umb + (want ? dt : -dt * 1.4) / 1.1, 0, 1);
  const benchTilt = R.act === 'bench' && R.sit > .5 ? .32 : 0;         // on the bench: tip it over the dog too
  R.umbTilt = lerp(R.umbTilt, benchTilt - R.vx / (160 * L.k) * .15, Math.min(1, dt * 4));
  if (R.umb > .01) grip(-1, -36, -136 + 30 * (1 - Math.min(1, R.umb / .4)), 1, true);   // raise it, then hold it up
}
