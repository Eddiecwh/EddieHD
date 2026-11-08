/* EddieHD — Setup card and menu: syncing controls with saved preferences and wiring up buttons.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   8. SCREENS — setup card and menu drawer
   ============================================================ */
function showSetup() { $('setup').hidden = false; syncControls(); }
function closeMenu() { $('drawer').classList.remove('open'); $('menuBtn').setAttribute('aria-expanded', 'false'); }
function toggleMenu() { const o = $('drawer').classList.toggle('open'); $('menuBtn').setAttribute('aria-expanded', String(o)); if (o) $('closeBtn').focus(); }
function syncControls() {
  for (const r of document.querySelectorAll('input[name=preset]')) r.checked = r.value === prefs.preset;
  $('presetSel').value = prefs.preset;
  for (const r of document.querySelectorAll('input[name=scene], input[name=sceneMenu]')) r.checked = r.value === prefs.scene;
  $('setupCam').checked = prefs.cam;
  $('setupRain').checked = $('menuRain').checked = RAIN.on;
  $('rainVol').value = prefs.rainVol;
  $('setupWake').checked = $('menuWake').checked = prefs.wake;
  $('setupWake').disabled = $('menuWake').disabled = !SR;
  const canVoice = VOICE_ENABLED && neural.ready;
  for (const s of document.querySelectorAll('.voiceMode')) {
    s.querySelector('option[value=neural]').disabled = !canVoice;
    s.disabled = !canVoice;                                          // greyed out while the voice is switched off
    s.value = voiceOn() ? 'neural' : 'off';
  }
  $('fxOn').checked = prefs.fx; $('fxOn').disabled = $('testVoice').disabled = !voiceOn();
  const note = !VOICE_ENABLED ? 'ElevenLabs voice is switched off for now. Eddie talks in speech bubbles.'
    : !neural.ready ? 'ElevenLabs voice needs a key in .env and server.py running.'
      : 'ElevenLabs voice uses credits for each new line.';
  $('setupVoiceNote').textContent = $('menuVoiceNote').textContent = note;
  indicators();
  if (S.mode === 'idle') render();
}

$('setupForm').onsubmit = e => {
  e.preventDefault();
  savePref('preset', document.querySelector('input[name=preset]:checked')?.value || '25,5');
  savePref('cam', $('setupCam').checked);
  if ($('setupRain').checked !== RAIN.on) setRain($('setupRain').checked);
  savePref('wake', $('setupWake').checked);
  savePref('voice', $('setupVoice').value);
  $('setup').hidden = true; syncControls();
  actx = actx || new AudioContext();
  if (prefs.cam) setCam(true);
  startFocus();
};
for (const r of document.querySelectorAll('input[name=preset]')) r.onchange = () => { savePref('preset', r.value); syncControls(); };
// picking a scene: Eddie drags it on (from the menu, close the menu so the show is visible)
for (const r of document.querySelectorAll('input[name=scene], input[name=sceneMenu]')) r.onchange = () => {
  savePref('scene', r.value); syncControls();
  if (r.name === 'sceneMenu') closeMenu();
  requestScene(r.value);
};
$('menuRain').onchange = e => setRain(e.target.checked);
$('rainVol').oninput = e => savePref('rainVol', +e.target.value);
$('presetSel').onchange = e => { savePref('preset', e.target.value); syncControls(); };
for (const s of document.querySelectorAll('.voiceMode')) s.onchange = () => { stopVoice(); savePref('voice', s.value); syncControls(); };
$('menuWake').onchange = e => { savePref('wake', e.target.checked); syncControls(); ear(); };
$('fxOn').onchange = e => savePref('fx', e.target.checked);
$('testVoice').onclick = () => say("Hello, friend. I am Eddie. You work. Eddie guard. Good deal, question?", 'happy');

$('menuBtn').onclick = toggleMenu; $('closeBtn').onclick = closeMenu;
$('startBtn').onclick = () => { $('setup').hidden = true; startFocus(); };
$('pauseBtn').onclick = pause; $('skipBtn').onclick = skip; $('stopBtn').onclick = stop;
$('camBtn').onclick = () => { savePref('cam', !stream); setCam(!stream); };
$('micBtn').onclick = () => awaiting ? (awaiting = false, indicators()) : talkNow();
$('compose').onsubmit = e => { e.preventDefault(); const v = $('text').value.trim(); if (v) { attend(3000); hear(v); $('text').value = ''; } };
for (const id of ['simPhone', 'simAway']) $(id).onclick = e => { const b = e.currentTarget; b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); indicators(); };
$('simWake').onclick = () => { closeMenu(); wake(); };
for (const n of Object.keys(EXPR)) { const b = document.createElement('button'); b.textContent = n; b.onclick = () => { clearTimeout(revertTimer); setExpr(n); attend(2500); revertTimer = setTimeout(() => setExpr(baseMood()), 2500); }; $('faces').appendChild(b); }
