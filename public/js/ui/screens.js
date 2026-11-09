/* EddieHD — Setup card and menu: syncing controls with saved preferences and wiring up buttons.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   8. SCREENS — setup card and menu drawer
   ============================================================ */
function showSetup() {
  $("setup").hidden = false;
  syncControls();
}
function closeMenu() {
  $("drawer").classList.remove("open");
  $("menuBtn").setAttribute("aria-expanded", "false");
}
function toggleMenu() {
  const o = $("drawer").classList.toggle("open");
  $("menuBtn").setAttribute("aria-expanded", String(o));
  if (o) $("closeBtn").focus();
}
function syncControls() {
  for (const r of document.querySelectorAll("input[name=preset]"))
    r.checked = r.value === prefs.preset;
  $("presetSel").value = prefs.preset;
  for (const r of document.querySelectorAll(
    "input[name=scene], input[name=sceneMenu]",
  ))
    r.checked = r.value === prefs.scene;
  $("setupCam").checked = prefs.cam;
  $("setupRain").checked = $("menuRain").checked = RAIN.on;
  $("rainVol").value = prefs.rainVol;
  $("setupMusic").checked = prefs.music;
  $("setupWake").checked = $("menuWake").checked = prefs.wake;
  $("setupWake").disabled = $("menuWake").disabled = !SR;
  indicators();
  if (S.mode === "idle") render();
}

$("setupForm").onsubmit = (e) => {
  e.preventDefault();
  savePref(
    "preset",
    document.querySelector("input[name=preset]:checked")?.value || "25,5",
  );
  savePref("cam", $("setupCam").checked);
  const music = $("setupMusic").checked; // read before setRain(), whose syncControls() resets the boxes
  if ($("setupRain").checked !== RAIN.on) setRain($("setupRain").checked);
  if (music) musicPlay();
  else musicPause(); // a click, so the browser lets it play
  savePref("wake", $("setupWake").checked);
  $("setup").hidden = true;
  syncControls();
  actx = actx || new AudioContext();
  if (prefs.cam) setCam(true);
  startFocus();
};
for (const r of document.querySelectorAll("input[name=preset]"))
  r.onchange = () => {
    savePref("preset", r.value);
    syncControls();
  };
// picking a scene: Eddie drags it on (from the menu, close the menu so the show is visible)
for (const r of document.querySelectorAll(
  "input[name=scene], input[name=sceneMenu]",
))
  r.onchange = () => {
    savePref("scene", r.value);
    syncControls();
    if (r.name === "sceneMenu") closeMenu();
    requestScene(r.value);
  };
$("menuRain").onchange = (e) => setRain(e.target.checked);
$("rainVol").oninput = (e) => savePref("rainVol", +e.target.value);
$("presetSel").onchange = (e) => {
  savePref("preset", e.target.value);
  syncControls();
};
$("menuWake").onchange = (e) => {
  savePref("wake", e.target.checked);
  syncControls();
  ear();
};

$("menuBtn").onclick = toggleMenu;
$("closeBtn").onclick = closeMenu;
$("startBtn").onclick = () => {
  $("setup").hidden = true;
  startFocus();
};
$("pauseBtn").onclick = pause;
$("skipBtn").onclick = skip;
$("stopBtn").onclick = stop;
$("camBtn").onclick = () => {
  savePref("cam", !stream);
  setCam(!stream);
};
$("micBtn").onclick = () =>
  awaiting ? ((awaiting = false), indicators()) : talkNow();
$("compose").onsubmit = (e) => {
  e.preventDefault();
  const v = $("text").value.trim();
  if (v) {
    attend(3000);
    hear(v);
    $("text").value = "";
  }
};
$("testing").hidden = !DEBUG; // Testing tools: DEBUG mode only (core.js)
for (const id of ["simPhone", "simAway"])
  $(id).onclick = (e) => {
    const b = e.currentTarget;
    b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
    indicators();
  };
$("simWake").onclick = () => {
  closeMenu();
  wake();
};
for (const n of Object.keys(EXPR)) {
  const b = document.createElement("button");
  b.textContent = n;
  b.onclick = () => {
    clearTimeout(revertTimer);
    setExpr(n);
    attend(2500);
    revertTimer = setTimeout(() => setExpr(baseMood()), 2500);
  };
  $("faces").appendChild(b);
}

// fold / unfold the panels in the top-left column (shortcuts, music); remembered per panel.
// Animated: the panel's height slides from old to new size while its contents fade in.
const FOLD_NAMES = { helpPanel: "shortcuts", player: "music controls" };
const FOLD_MS = 220,
  FOLD_EASE = "cubic-bezier(.2, .8, .2, 1)";
function setFolded(id, folded, animate) {
  const panel = $(id),
    btn = panel.querySelector(".fold"),
    h0 = panel.offsetHeight;
  panel
    .getAnimations({ subtree: true })
    .forEach((a) => a instanceof CSSTransition || a.cancel()); // stop a fold mid-way; keep the chevron's turn
  panel.classList.toggle("folded", folded);
  btn.setAttribute("aria-expanded", String(!folded));
  btn.setAttribute("aria-label", (folded ? "Show " : "Hide ") + FOLD_NAMES[id]);
  if (animate) store.set("folded." + id, folded ? "1" : "0"); // only the user's own choice is remembered
  if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  const h1 = panel.offsetHeight;
  panel.style.overflow = "hidden"; // only while sliding, so focus rings aren't clipped after
  panel
    .animate([{ height: h0 + "px" }, { height: h1 + "px" }], {
      duration: FOLD_MS,
      easing: FOLD_EASE,
    })
    .finished.then(
      () => (panel.style.overflow = ""),
      () => {},
    );
  for (const el of panel.children) {
    if (el === btn || !el.offsetParent) continue; // the chevron just rotates; skip hidden parts
    el.animate(
      [
        { opacity: 0, transform: "translateY(-4px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: FOLD_MS, delay: 40, easing: FOLD_EASE, fill: "backwards" },
    );
  }
}
for (const btn of document.querySelectorAll(".fold")) {
  const id = btn.dataset.fold;
  const saved = store.get("folded." + id);
  setFolded(
    id,
    saved == null
      ? matchMedia("(max-width: 640px), (max-height: 500px)").matches
      : saved === "1",
  ); // phones start folded
  btn.onclick = () => setFolded(id, !$(id).classList.contains("folded"), true);
}
