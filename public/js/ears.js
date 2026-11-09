/* EddieHD — Voice in: "Hey Eddie" wake word, speech recognition and matching what you say to a reply.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   7. EARS — "Hey Eddie" wake word + intent matching
      With wake word on, Chrome's speech recognition runs
      continuously; we scan the text for "hey eddie". Eddie then
      faces you and waits ~8 s (his attention span) for a question.
   ============================================================ */
function addMsg(who, text) {
  const d = document.createElement("div");
  d.className = "msg " + who;
  d.textContent = text;
  const l = $("log");
  l.appendChild(d);
  l.scrollTop = l.scrollHeight;
}

function hear(text) {
  addMsg("you", text);
  awaiting = false;
  indicators();
  const t = text.toLowerCase();
  if (/\b(start|begin|focus|let'?s go|work)\b/.test(t))
    return S.mode === "focus" && !S.paused
      ? say("Already focus, friend. Keep go.", "happy")
      : startFocus();
  if (/\b(resume|continue|unpause)\b/.test(t))
    return S.paused ? pause() : say("Not pause. Already go go go.", "happy");
  if (/\b(pause|hold on|wait)\b/.test(t))
    return S.paused
      ? say("Timer already sleep. Say resume.", "sleepy")
      : pause();
  if (/\b(skip)\b/.test(t))
    return S.mode === "idle"
      ? say("No timer. Start, question?", "neutral")
      : skip();
  if (/\b(stop|cancel|quit|end)\b/.test(t)) return stop();
  if (/(how (long|much)|time left|remain)/.test(t)) {
    if (S.mode === "idle") return say("No timer. Start, question?", "neutral");
    const m = Math.ceil(S.remaining / 60);
    return say(
      `Understand. ${m} minute remain. ${S.mode === "focus" ? "You strong. Can do." : "Rest more, friend."}`,
      "happy",
    );
  }
  if (/\b(hi|hello|hey)\b/.test(t)) return say(pick(LINES.hello), "happy");
  if (/how are you/.test(t)) return say(pick(LINES.how), "happy");
  if (/(tired|sleepy|exhausted|bored)/.test(t))
    return say(pick(LINES.tired), "sad");
  if (/(yeah right|oh great|whatever|sure sure|thanks a lot)/.test(t))
    return say(pick(LINES.sarcasm), "suspicious");
  if (/(thank|thanks)/.test(t)) return say(pick(LINES.thanks), "love");
  if (/(who are you|your name|what are you)/.test(t))
    return say(pick(LINES.who), "proud");
  if (/joke|funny/.test(t)) return say(pick(LINES.joke), "happy");
  if (/love you|like you|good bot/.test(t))
    return say(pick(LINES.love), "love");
  say(pick(LINES.unknown), "surprised");
}

// speech recognisers spell "Eddie" several ways — accept the usual ones, but only after a greeting ("hey", "hi", "okay")
const WAKE =
  /\b(?:hey|hi|okay|ok|yo)[\s,]+(?:eddie|eddy|edie|eddi|eddies|eddy's|eddie's|ed|teddy|heddy)\b/i; // greeting required: "Eddie" alone doesn't wake him
const ATTENTION_MS = 8000;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null,
  recOn = false,
  awaiting = false,
  awaitUntil = 0,
  oneShot = false;

function wake() {
  awaiting = true;
  awaitUntil = Date.now() + ATTENTION_MS;
  attend(ATTENTION_MS);
  R.wave = 0.9;
  clearTimeout(revertTimer);
  setExpr("listening");
  chirp(2);
  indicators();
}

function ear() {
  // start or stop continuous listening to match prefs + session
  const want = SR && prefs.wake && S.mode !== "idle";
  if (want && !recOn) startRec(true);
  if (!want && recOn && !oneShot) {
    try {
      rec.stop();
    } catch (e) {}
  }
  indicators();
}

function startRec(continuous) {
  if (!SR || recOn) return;
  rec = new SR();
  rec.lang = "en-US";
  rec.continuous = continuous;
  rec.interimResults = true;
  oneShot = !continuous;
  rec.onresult = onSpeech;
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      savePref("wake", false);
      syncControls();
      addMsg("sys", "microphone blocked");
    }
  };
  rec.onend = () => {
    recOn = false;
    oneShot = false;
    if (prefs.wake && S.mode !== "idle") setTimeout(() => startRec(true), 250); // Chrome stops every minute or so; restart
    indicators();
  };
  try {
    rec.start();
    recOn = true;
  } catch (e) {}
  indicators();
}

function onSpeech(e) {
  if (talking) return; // don't hear our own voice
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const r = e.results[i],
      txt = r[0].transcript.trim();
    const m = txt.match(WAKE);
    if (m) {
      if (!awaiting) wake();
      const rest = txt.slice(m.index + m[0].length).replace(/^[\s,.!?]+/, "");
      if (r.isFinal && rest) hear(rest);
      else awaitUntil = Date.now() + ATTENTION_MS;
    } else if (awaiting && r.isFinal && txt) {
      hear(txt);
    } else if (awaiting && txt) {
      awaitUntil = Date.now() + ATTENTION_MS; // still talking: keep paying attention
      attend(2000);
    }
  }
}

function talkNow() {
  // mic button / M key
  if (!SR) {
    addMsg("sys", "voice input needs Chrome or Edge");
    return;
  }
  wake();
  if (!recOn) startRec(false);
}
