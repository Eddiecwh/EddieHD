/* EddieHD — Eddie talking: a little chirp, a speech bubble, and his mouth moving for as long as the bubble reads.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   3. VOICE OUT — chirp + speech bubble
   ============================================================ */
let actx;

function chirp(words) {
  try {
    actx = actx || new AudioContext();
    const notes = [523, 587, 659, 784, 880, 1047],
      n = Math.min(5, 2 + Math.floor(words / 4));
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(),
        g = actx.createGain(),
        at = actx.currentTime + i * 0.085;
      o.type = "triangle";
      o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.12, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.08);
      o.connect(g).connect(actx.destination);
      o.start(at);
      o.stop(at + 0.09);
    }
  } catch (e) {}
}

let revertTimer,
  sayId = 0;

function say(text, expr) {
  clearTimeout(revertTimer);
  if (expr) setExpr(expr);
  const now = performance.now();
  bubble.text = text;
  bubble.until = now + 3000 + text.length * 55;
  attend(2500 + text.length * 60);
  addMsg("eddie", text);
  const words = text.split(/\s+/).length,
    my = ++sayId;
  chirp(words);
  talking = true; // mouth moves for as long as the bubble reads
  setTimeout(
    () => {
      if (my !== sayId) return;
      talking = false;
      revertTimer = setTimeout(() => setExpr(baseMood()), 1800);
    },
    350 + words * 260,
  );
}
