/* EddieHD — Pomodoro state machine (idle → focus → break → focus …) and the timer display.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   5. POMODORO STATE MACHINE  idle → focus → break → focus …
   ============================================================ */
const S = {
  mode: "idle",
  paused: false,
  endAt: 0,
  remaining: 0,
  total: 1,
  done: 0,
  dist: 0,
  away: 0,
  pre: 0,
  lastCount: 0,
  refined: false,
};
const COUNT = 3; // seconds of 3-2-1 before focus starts and at the end of each block
function lens() {
  const [f, b] = prefs.preset.split(",").map(Number);
  return { focus: f * 60, brk: b * 60 };
}
function baseMood() {
  if (S.paused) return "sleepy";
  if (R.inPod) return "charging";
  if (isWork(R.act)) return "focused";
  if (S.mode === "break") return "happy";
  return "neutral";
}
// from: when the block starts (ms). A block that follows another starts exactly when the last one ended, even if this
// code runs late (a hidden tab's timers can be held back), so the schedule and its beeps never drift.
function begin(mode, from = Date.now()) {
  const L2 = lens();
  S.mode = mode;
  S.paused = false;
  S.total = mode === "focus" ? L2.focus : L2.brk;
  S.endAt = from + S.total * 1000;
  S.remaining = Math.max(0, (S.endAt - Date.now()) / 1000);
  S.pre = 0;
  S.lastCount = 0;
  S.refined = false;
  scheduleBeeps(S.endAt);
  render();
}
// starting focus (setup card, menu, voice): a 3-2-1 "get ready" first, then the block begins
function startFocus() {
  if (S.pre) return; // already counting in
  S.mode = "idle";
  S.paused = false;
  S.pre = Date.now() + COUNT * 1000;
  S.lastCount = 0;
  scheduleBeeps(S.pre);
  render();
  countdown();
}
function launchFocus() {
  begin("focus", S.pre);
  say(pick(LINES.start), "happy");
  addMsg("sys", "focus block started");
  ear();
}

/* --- countdown: 3-2-1 before focus starts and in the last 3 s of every focus block and break ---
   SOUND is booked ahead on the Web Audio clock (scheduleBeeps), which keeps exact time even when the tab is in the
   background and the browser holds back timers and animation frames. Booked when a block begins, re-booked
   15 s before the end (to correct any drift between the audio clock and the wall clock), cancelled on pause / skip / stop.
   The DIGITS and pulse come from countdown(), checked every animation frame (scene.js) and from tick(). */
let beeps = []; // [{ osc, at }] booked but not yet finished
function cancelBeeps() {
  const soon = actx ? actx.currentTime + 0.15 : 0;
  beeps = beeps.filter((b) => {
    if (b.at <= soon) return true; // already sounding (or about to): let it finish
    try {
      b.osc.onended = null;
      b.osc.stop();
      b.osc.disconnect();
    } catch (e) {}
    return false;
  });
}
function scheduleBeeps(endMs) {
  cancelBeeps();
  try {
    actx = actx || new AudioContext();
    if (actx.state === "suspended") actx.resume();
    const now = Date.now(),
      base = actx.currentTime;
    for (let k = COUNT; k >= 0; k--) {
      const at = base + (endMs - k * 1000 - now) / 1000;
      if (at < base - 0.05) continue; // that count has already gone by
      if (beeps.some((b) => Math.abs(b.at - at) < 0.3)) continue; // still sounding from the last booking
      beepAt(Math.max(at, base + 0.005), k === 0);
    }
  } catch (e) {}
}
// a soft sine blip: three low ones (E5), then a brighter one (B5) when the new block begins
function beepAt(at, go) {
  const len = go ? 0.5 : 0.22,
    o = actx.createOscillator(),
    g = actx.createGain();
  o.type = "sine";
  o.frequency.value = go ? 988 : 659;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(go ? 0.09 : 0.07, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(actx.destination);
  o.start(at);
  o.stop(at + len + 0.02);
  const b = { osc: o, at };
  beeps.push(b);
  o.onended = () => {
    beeps = beeps.filter((x) => x !== b);
    g.disconnect();
  };
}
function countdown() {
  let left;
  if (S.pre) left = (S.pre - Date.now()) / 1000;
  else if (S.mode !== "idle" && !S.paused) left = (S.endAt - Date.now()) / 1000;
  else return;
  const n = Math.ceil(left);
  if (n >= 1 && n <= COUNT && n !== S.lastCount) {
    S.lastCount = n;
    if (!S.pre) S.remaining = Math.max(0, left);
    render(); // so the digit changes with the beep
    $("time").animate(
      [
        { transform: "scale(1.05)", color: "var(--glow)" },
        { transform: "none" },
      ],
      { duration: 450, easing: "cubic-bezier(.2, .8, .2, 1)" },
    );
  }
  if (left <= 0) S.pre ? launchFocus() : tick(); // tick() switches focus <-> break
}
function pause() {
  if (S.mode === "idle") return;
  if (!S.paused) {
    S.paused = true;
    S.remaining = Math.max(0, (S.endAt - Date.now()) / 1000);
    cancelBeeps();
    say(pick(LINES.pause), "sleepy");
  } else {
    S.paused = false;
    S.endAt = Date.now() + S.remaining * 1000;
    S.lastCount = 0;
    S.refined = false;
    scheduleBeeps(S.endAt);
    say(pick(LINES.resume), "happy");
  }
  render();
}
function skip() {
  if (S.mode === "focus") {
    begin("break");
    say(pick(LINES.skipBreak), "happy");
  } else if (S.mode === "break") {
    begin("focus");
    say(pick(LINES.skipFocus), "neutral");
  }
}
function stop() {
  if (S.pre) {
    S.pre = 0;
    cancelBeeps();
    render();
    return;
  } // cancel the 3-2-1
  if (S.mode === "idle") return;
  S.mode = "idle";
  S.paused = false;
  cancelBeeps();
  say(pick(LINES.stop), "sad");
  render();
  ear();
  closeMenu();
  setTimeout(() => {
    if (S.mode === "idle") showSetup();
  }, 2400);
}
function tick() {
  if (S.pre) countdown(); // finish the 3-2-1 even if frames stop (hidden tab)
  if (S.mode !== "idle" && !S.paused) {
    S.remaining = Math.max(0, (S.endAt - Date.now()) / 1000);
    if (!S.refined && S.remaining < 15 && S.remaining > COUNT + 0.5) {
      S.refined = true;
      scheduleBeeps(S.endAt);
    }
    if (S.remaining <= 0) {
      const from = S.endAt; // the next block starts when this one ended
      if (S.mode === "focus") {
        S.done++;
        begin("break", from);
        say(pick(LINES.focusDone), "proud");
        addMsg("sys", "break started");
      } else {
        begin("focus", from);
        say(pick(LINES.breakDone), "happy");
        addMsg("sys", "focus block started");
      }
    }
  }
  if (awaiting && Date.now() > awaitUntil) {
    awaiting = false;
    if (exprName === "listening") setExpr(baseMood());
    indicators();
  }
  render();
}
const fmt = (s) => {
  s = Math.ceil(s);
  return (
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
};
function render() {
  const idle = S.mode === "idle",
    key = S.pre ? "ready" : S.paused ? "paused" : S.mode;
  $("mode").className = "mode " + key;
  $("modeText").textContent = {
    idle: "Ready",
    ready: "Get ready",
    focus: "Focus",
    break: "Break",
    paused: "Paused",
  }[key];
  $("time").textContent = fmt(
    S.pre
      ? Math.max(0, (S.pre - Date.now()) / 1000)
      : idle
        ? lens().focus
        : S.remaining,
  );
  $("sub").textContent =
    `${S.done} block${S.done === 1 ? "" : "s"} · ${S.dist} phone catch${S.dist === 1 ? "" : "es"}`;
  const b = $("bar"),
    c = S.paused
      ? "var(--warn)"
      : S.mode === "break"
        ? "var(--ok)"
        : "var(--glow)";
  b.style.width = idle ? "0%" : 100 * (1 - S.remaining / S.total) + "%";
  b.style.background = c;
  b.style.boxShadow = `0 0 10px ${c}`;
  $("startBtn").textContent = idle ? "Start focus" : "Restart focus";
  $("pauseBtn").disabled = $("skipBtn").disabled = idle;
  $("stopBtn").disabled = idle && !S.pre; // End session also cancels the 3-2-1
  $("pauseBtn").textContent = S.paused ? "Resume" : "Pause";
  $("skipBtn").textContent =
    S.mode === "break" ? "Skip break" : "Skip to break";
  $("sDone").textContent = S.done;
  $("sDist").textContent = S.dist;
  $("sAway").textContent = S.away;
}
