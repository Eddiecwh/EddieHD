/* EddieHD — Pomodoro state machine (idle → focus → break → focus …) and the timer display.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   5. POMODORO STATE MACHINE  idle → focus → break → focus …
   ============================================================ */
const S = { mode: 'idle', paused: false, endAt: 0, remaining: 0, total: 1, done: 0, dist: 0, away: 0 };
function lens() { const [f, b] = prefs.preset.split(',').map(Number); return { focus: f * 60, brk: b * 60 }; }
function baseMood() { if (S.paused) return 'sleepy'; if (R.inPod) return 'charging'; if (isWork(R.act)) return 'focused'; if (S.mode === 'break') return 'happy'; return 'neutral'; }
function begin(mode) {
  const L2 = lens(); S.mode = mode; S.paused = false;
  S.total = S.remaining = mode === 'focus' ? L2.focus : L2.brk; S.endAt = Date.now() + S.total * 1000;
  render();
}
function startFocus() { begin('focus'); say(pick(LINES.start), 'happy'); addMsg('sys', 'focus block started'); ear(); }
function pause() {
  if (S.mode === 'idle') return;
  if (!S.paused) { S.paused = true; S.remaining = Math.max(0, (S.endAt - Date.now()) / 1000); say(pick(LINES.pause), 'sleepy'); }
  else { S.paused = false; S.endAt = Date.now() + S.remaining * 1000; say(pick(LINES.resume), 'happy'); }
  render();
}
function skip() {
  if (S.mode === 'focus') { begin('break'); say(pick(LINES.skipBreak), 'happy'); }
  else if (S.mode === 'break') { begin('focus'); say(pick(LINES.skipFocus), 'neutral'); }
}
function stop() {
  if (S.mode === 'idle') return;
  S.mode = 'idle'; S.paused = false; say(pick(LINES.stop), 'sad'); render(); ear();
  closeMenu(); setTimeout(() => { if (S.mode === 'idle') showSetup(); }, 2400);
}
function tick() {
  if (S.mode !== 'idle' && !S.paused) {
    S.remaining = Math.max(0, (S.endAt - Date.now()) / 1000);
    if (S.remaining <= 0) {
      if (S.mode === 'focus') { S.done++; begin('break'); say(pick(LINES.focusDone), 'proud'); addMsg('sys', 'break started'); }
      else { begin('focus'); say(pick(LINES.breakDone), 'happy'); addMsg('sys', 'focus block started'); }
    }
  }
  if (awaiting && Date.now() > awaitUntil) { awaiting = false; if (exprName === 'listening') setExpr(baseMood()); indicators(); }
  render();
}
const fmt = s => { s = Math.ceil(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function render() {
  const idle = S.mode === 'idle', key = S.paused ? 'paused' : S.mode;
  $('mode').className = 'mode ' + key;
  $('modeText').textContent = ({ idle: 'Ready', focus: 'Focus', break: 'Break', paused: 'Paused' })[key];
  $('time').textContent = fmt(idle ? lens().focus : S.remaining);
  $('sub').textContent = `${S.done} block${S.done === 1 ? '' : 's'} · ${S.dist} phone catch${S.dist === 1 ? '' : 'es'}`;
  const b = $('bar'), c = S.paused ? 'var(--warn)' : S.mode === 'break' ? 'var(--ok)' : 'var(--glow)';
  b.style.width = idle ? '0%' : (100 * (1 - S.remaining / S.total)) + '%';
  b.style.background = c; b.style.boxShadow = `0 0 10px ${c}`;
  $('startBtn').textContent = idle ? 'Start focus' : 'Restart focus';
  $('pauseBtn').disabled = $('skipBtn').disabled = $('stopBtn').disabled = idle;
  $('pauseBtn').textContent = S.paused ? 'Resume' : 'Pause';
  $('skipBtn').textContent = S.mode === 'break' ? 'Skip break' : 'Skip to break';
  $('sDone').textContent = S.done; $('sDist').textContent = S.dist; $('sAway').textContent = S.away;
}
