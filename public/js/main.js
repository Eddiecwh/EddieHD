/* EddieHD — Starts everything: keyboard shortcuts, voice status check, first layout, animation and timer loops.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || !$('setup').hidden) return;
  if (e.key === 'Escape') return $('drawer').classList.contains('open') ? closeMenu() : toggleMenu();
  if (e.code === 'Space') { e.preventDefault(); pause(); }
  if (e.key === 'm' || e.key === 'M') talkNow();
});

fetch('/api/tts/status').then(r => r.json()).then(s => { neural.provider = s.provider; neural.ready = !!s.provider; })
  .catch(() => { }).finally(syncControls);

layout(); setExpr('neutral'); syncControls();
requestAnimationFrame(frame); setInterval(tick, 250); watch();
