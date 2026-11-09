/* EddieHD — Eddie's eye: webcam + COCO-SSD phone/person detection and how he reacts.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   6. WEBCAM WATCHER — COCO-SSD detects "person" and "cell phone"
   ============================================================ */
let model = null,
  stream = null,
  modelState = "off";
const video = $("video"),
  boxes = $("boxes"),
  bctx = boxes.getContext("2d");
function loadScript(src) {
  return new Promise((ok, err) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = ok;
    s.onerror = err;
    document.head.appendChild(s);
  });
}
async function setCam(on) {
  if (!on) {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
    $("camEmpty").hidden = false;
    $("camBtn").textContent = "Turn on camera";
    bctx.clearRect(0, 0, boxes.width, boxes.height);
    indicators();
    return;
  }
  if (stream) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
  } catch (e) {
    addMsg("sys", "camera blocked (" + e.name + ")");
    $("modelNote").textContent = "Camera blocked. Allow it in the browser.";
    indicators();
    return;
  }
  video.srcObject = stream;
  await video.play();
  $("camEmpty").hidden = true;
  $("camBtn").textContent = "Turn off camera";
  if (!model) {
    modelState = "loading";
    indicators();
    $("modelNote").textContent = "Loading detector…";
    try {
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js",
      );
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
      );
      model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      modelState = "ready";
      $("modelNote").textContent = "";
    } catch (e) {
      modelState = "failed";
      $("modelNote").textContent = "Detector failed to load.";
    }
  }
  indicators();
}
const O = {
  phoneStreak: 0,
  phoneSince: 0,
  lastNag: 0,
  phoneEpisode: false,
  lastSeen: Date.now(),
  awayEpisode: false,
  phone: false,
  person: true,
};
async function watch() {
  let phone = false,
    person = true,
    bbox = null;
  if (model && stream && video.readyState >= 2) {
    const preds = await model.detect(video, 8, 0.4);
    boxes.width = video.videoWidth;
    boxes.height = video.videoHeight;
    bctx.clearRect(0, 0, boxes.width, boxes.height);
    bctx.lineWidth = 3;
    bctx.font = "600 16px IBM Plex Mono, monospace";
    for (const p of preds) {
      if (p.class !== "person" && p.class !== "cell phone") continue;
      const [x, y, w, h] = p.bbox,
        c = p.class === "cell phone" ? "#ff5d5d" : "#5ef2e0";
      bctx.strokeStyle = c;
      bctx.strokeRect(x, y, w, h);
      bctx.save();
      bctx.scale(-1, 1);
      bctx.fillStyle = c;
      bctx.fillText(
        `${p.class} ${Math.round(p.score * 100)}%`,
        -x - w + 4,
        y + 18,
      );
      bctx.restore();
    }
    phone = preds.some((p) => p.class === "cell phone" && p.score > 0.5);
    const pp = preds.find((p) => p.class === "person" && p.score > 0.5);
    person = !!pp;
    bbox = pp && pp.bbox;
  }
  if ($("simPhone").getAttribute("aria-pressed") === "true") phone = true;
  if ($("simAway").getAttribute("aria-pressed") === "true") {
    person = false;
    phone = false;
    bbox = null;
  }
  trackX = bbox
    ? -((bbox[0] + bbox[2] / 2) / video.videoWidth - 0.5) * 1.6
    : trackX * 0.8;
  O.phone = phone;
  O.person = person;
  indicators();
  react(phone, person);
  setTimeout(watch, 700);
}
function react(phone, person) {
  const now = Date.now(),
    active = S.mode === "focus" && !S.paused;
  if (person) O.lastSeen = now;
  O.phoneStreak = phone ? O.phoneStreak + 1 : 0;
  if (!active) {
    O.phoneEpisode = false;
    O.awayEpisode = false;
    return;
  }
  if (O.phoneStreak === 2) {
    O.phoneSince = now;
    say(pick(LINES.phoneSeen), "suspicious");
  }
  if (
    O.phoneStreak > 2 &&
    now - O.phoneSince > 3500 &&
    now - O.lastNag > 15000
  ) {
    O.lastNag = now;
    if (!O.phoneEpisode) {
      S.dist++;
      O.phoneEpisode = true;
    }
    say(pick(LINES.phoneNag), "angry");
  }
  if (!phone && O.phoneEpisode) {
    O.phoneEpisode = false;
    O.lastNag = 0;
    say(pick(LINES.phoneGone), "happy");
  }
  if (!person && !O.awayEpisode && now - O.lastSeen > 8000) {
    O.awayEpisode = true;
    S.away++;
    say(pick(LINES.away), "sad");
  }
  if (person && O.awayEpisode) {
    O.awayEpisode = false;
    say(pick(LINES.back), "love");
    R.wave = 1.6;
  }
}
