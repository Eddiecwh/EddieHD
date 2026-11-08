/* EddieHD — Voice out: chirps, speech-bubble timing, optional ElevenLabs voice via server.py (switched off: VOICE_ENABLED).
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   3. VOICE OUT — chirp + speech bubble; optional ElevenLabs voice
      (server.py → /api/tts). Switched off for now: see VOICE_ENABLED.
   ============================================================ */
let actx;
function chirp(words) {
  try {
    actx = actx || new AudioContext();
    const notes = [523, 587, 659, 784, 880, 1047], n = Math.min(5, 2 + Math.floor(words / 4));
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(), g = actx.createGain(), at = actx.currentTime + i * .085;
      o.type = 'triangle'; o.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.12, at + .01); g.gain.exponentialRampToValueAtTime(.001, at + .08);
      o.connect(g).connect(actx.destination); o.start(at); o.stop(at + .09);
    }
  } catch (e) { }
}
// ElevenLabs voice is switched off for now: its menu options are shown but greyed out and
// nothing is sent to /api/tts. Set to true to bring it back (needs a key in .env).
const VOICE_ENABLED = false;

const neural = { ready: false, provider: null };
let analyser = null, wet = null, humGain = null, curSrc = null, level = 0, sayId = 0;
const lvlBuf = new Float32Array(1024);
function audioGraph() {
  actx = actx || new AudioContext();
  if (analyser) return;
  analyser = actx.createAnalyser(); analyser.fftSize = 1024; analyser.connect(actx.destination);
  const delay = actx.createDelay(0.1); delay.delayTime.value = 0.018;
  const lfo = actx.createOscillator(), depth = actx.createGain();
  lfo.frequency.value = 0.9; depth.gain.value = 0.004; lfo.connect(depth).connect(delay.delayTime); lfo.start();
  wet = actx.createGain(); wet.gain.value = 0.35;
  analyser.connect(delay).connect(wet).connect(actx.destination);
  humGain = actx.createGain(); humGain.gain.value = 0;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
  for (const f of [196, 293.66, 392]) { const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(humGain); o.start(); }
  humGain.connect(lp).connect(actx.destination);
}
function updateLevel() {
  if (!analyser || !curSrc) { level *= .8; if (humGain) humGain.gain.setTargetAtTime(0, actx.currentTime, .05); return; }
  analyser.getFloatTimeDomainData(lvlBuf);
  let s = 0; for (const v of lvlBuf) s += v * v;
  level = lerp(level, Math.min(1, Math.sqrt(s / lvlBuf.length) * 5), .35);
  wet.gain.setTargetAtTime(prefs.fx ? .35 : 0, actx.currentTime, .05);
  humGain.gain.setTargetAtTime(prefs.fx ? level * .045 : 0, actx.currentTime, .03);
}
function stopVoice() {
  if (curSrc) { try { curSrc.onended = null; curSrc.stop(); } catch (e) { } curSrc = null; }
}
async function speakNeural(text, done, my) {
  audioGraph(); if (actx.state === 'suspended') await actx.resume();
  const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || ('HTTP ' + r.status));
  const buf = await actx.decodeAudioData(await r.arrayBuffer());
  if (my !== sayId) return;
  stopVoice();
  const src = actx.createBufferSource(); src.buffer = buf; src.connect(analyser);
  curSrc = src; src.onended = () => { if (curSrc === src) { curSrc = null; done(); } };
  src.start();
}
const voiceOn = () => VOICE_ENABLED && neural.ready && prefs.voice === 'neural';
let revertTimer;
function say(text, expr) {
  clearTimeout(revertTimer);
  if (expr) setExpr(expr);
  const now = performance.now();
  bubble.text = text; bubble.until = now + 3000 + text.length * 55;
  attend(2500 + text.length * 60);
  addMsg('eddie', text);
  const words = text.split(/\s+/).length, my = ++sayId;
  chirp(words);
  const done = () => { if (my !== sayId) return; talking = false; revertTimer = setTimeout(() => setExpr(baseMood()), 1800); };
  const silent = () => { talking = true; setTimeout(done, 350 + words * 260); };   // mouth moves for as long as the bubble reads
  stopVoice();
  if (voiceOn()) speakNeural(text, done, my).catch(e => { addMsg('sys', 'voice failed (' + e.message + ')'); if (my === sayId) silent(); });
  else silent();
}
