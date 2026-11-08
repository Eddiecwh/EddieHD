/* EddieHD — Status chips in the top bar (eye, ear, voice) and the mic button state.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

function ind(id, cls, text) { const el = $(id); el.className = 'ind ' + cls; el.querySelector('span').textContent = text; el.title = text; }
function indicators() {
  const sim = $('simPhone').getAttribute('aria-pressed') === 'true' || $('simAway').getAttribute('aria-pressed') === 'true';
  if (!stream && !sim) ind('indEye', '', 'eye off');
  else if (modelState === 'loading') ind('indEye', 'warn', 'eye loading');
  else if (O.phone) ind('indEye', 'bad', 'phone seen');
  else if (!O.person) ind('indEye', 'warn', 'no one');
  else ind('indEye', 'ok', sim && !stream ? 'eye (pretend)' : 'eye on');
  if (awaiting) ind('indEar', 'bad', 'listening');
  else if (recOn && prefs.wake) ind('indEar', 'ok', 'hey eddie');
  else ind('indEar', '', 'ear off');
  if (voiceOn()) ind('indVoice', 'ok', 'voice on');
  else ind('indVoice', '', 'voice off');
  $('micBtn').classList.toggle('live', awaiting);
}
