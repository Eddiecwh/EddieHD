/* EddieHD — Stage props moved by the claw machine: the desk (focus) and charging pod (break) — logic and drawing.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* --- props + claw machine ---------------------------------------------- */
const offTop = () => L.floorY / L.k + 320;           // units from floor to well above the window
function summonProp(kind) {
  const w = kind === 'pod' ? 80 : 0;
  const lo = L.minX + (kind === 'desk' ? 36 : w) * L.k, hi = Math.min(L.maxX, innerWidth - (kind === 'desk' ? 100 : w) * L.k);
  P.kind = kind; P.x = lo + Math.random() * Math.max(0, hi - lo);
  P.state = 'arrive'; P.t = 0; P.lift = -offTop(); P.clawY = P.lift; P.closed = 1; P.packPending = false;
  P.door = P.doorT = 0;
}
function packProp() {
  if (P.state === 'placed') { P.state = 'clawDown'; P.t = 0; }
  else if (P.state === 'arrive' || P.state === 'release' || P.state === 'clawUp') P.packPending = true;
}
// make sure the prop this activity needs is on stage; returns true once it's placed
function ensureProp(kind) {
  if (P.state === 'none') { if (kind) summonProp(kind); return false; }
  if (P.kind === kind) return P.state === 'placed';
  if (P.kind === 'pod' && Math.abs(R.x - P.x) < L.size * .55) {       // step out of the pod before it leaves
    P.doorT = 0;
    if (P.door < .15 && R.tx == null) R.tx = clamp(P.x + (P.x > innerWidth / 2 ? -1 : 1) * L.size * 1.2, L.minX, L.maxX);
    return false;
  }
  packProp(); return false;
}
function updateProp(dt) {
  P.door = lerp(P.door, P.doorT, Math.min(1, dt * 2.5));
  if (P.state === 'none') return;
  P.t += dt; const top = offTop();
  if (R.typing > .3) P.scroll += dt;
  switch (P.state) {
    case 'arrive': {
      const k = Math.min(1, P.t / 2.6); P.lift = -top * (1 - ease.out(k)); P.clawY = P.lift; P.closed = 1;
      if (k >= 1) { P.state = 'release'; P.t = 0; } break;
    }
    case 'release': P.closed = 1 - Math.min(1, P.t / .35); if (P.t > .5) { P.state = 'clawUp'; P.t = 0; } break;
    case 'clawUp': {
      const k = Math.min(1, P.t / 1.3); P.clawY = -top * ease.in(k);
      if (k >= 1) { P.state = 'placed'; P.t = 0; if (P.packPending) packProp(); } break;
    }
    case 'clawDown': {
      const k = Math.min(1, P.t / 1.4); P.closed = 0; P.clawY = -top * (1 - ease.out(k));
      if (k >= 1) { P.state = 'grab'; P.t = 0; } break;
    }
    case 'grab': P.closed = Math.min(1, P.t / .35); if (P.t > .55) { P.state = 'lift'; P.t = 0; } break;
    case 'lift': {
      const k = Math.min(1, P.t / 2.2); P.lift = -top * ease.in(k); P.clawY = P.lift;
      if (k >= 1) { P.state = 'none'; P.kind = null; P.packPending = false; } break;
    }
  }
}


/* desk: monitor faces you, Eddie types with his back to you */
function drawDesk() {
  const p = L.k * DPR;
  ctx.save(); ctx.translate(P.x * DPR, L.floorY * DPR); ctx.scale(p, p);
  const ground = clamp(1 + P.lift / 120, 0, 1);
  if (ground > 0) { ctx.fillStyle = `rgba(0,0,0,${.4 * ground})`; ctx.beginPath(); ctx.ellipse(8, 2, 84 * (.5 + ground * .5), 7, 0, 0, 2 * PI); ctx.fill(); }
  ctx.translate(0, P.lift);
  ctx.fillStyle = '#39414e'; ctx.fillRect(-68, -92, 6, 92); ctx.fillRect(62, -92, 6, 92); ctx.fillRect(-66, -34, 130, 4);
  ctx.fillStyle = '#5a6577'; rr(-78, -100, 156, 10, 4); ctx.fill();
  ctx.fillStyle = '#262b34'; rr(-40, -105, 54, 6, 2); ctx.fill();                       // keyboard
  ctx.fillStyle = '#39414e'; ctx.fillRect(26, -132, 8, 32); rr(14, -104, 32, 5, 2); ctx.fill();
  ctx.fillStyle = '#1b2029'; rr(-25, -202, 110, 74, 9); ctx.fill();                     // monitor
  ctx.fillStyle = '#2c3340'; rr(22, -209, 16, 8, 3); ctx.fill();                        // handle for the claw
  ctx.fillStyle = '#071219'; rr(-19, -196, 98, 60, 5); ctx.fill();
  ctx.save(); rr(-19, -196, 98, 60, 5); ctx.clip();                                     // scrolling code
  const rowH = 8, sp = P.scroll * 14, base = Math.floor(sp / rowH), off = sp % rowH;
  const cols = ['rgba(94,242,224,.75)', 'rgba(123,228,149,.7)', 'rgba(255,181,71,.7)', 'rgba(231,234,240,.45)'];
  for (let i = -1; i < 9; i++) {
    const n = base + i;
    ctx.fillStyle = cols[(n * 7) % 4];
    rr(-13 + ((n * 13) % 3) * 8, -190 + i * rowH - off, 16 + ((n * 37) % 52), 3.5, 1.5); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

/* charging pod: back half drawn behind Eddie, glass door + meter drawn in front */
function podCharge() { return S.mode === 'break' ? clamp(1 - S.remaining / S.total, 0, 1) : 0; }
function drawPodBack(t) {
  const p = L.k * DPR, g = '#7be495';
  ctx.save(); ctx.translate(P.x * DPR, L.floorY * DPR); ctx.scale(p, p);
  const ground = clamp(1 + P.lift / 120, 0, 1);
  if (ground > 0) { ctx.fillStyle = `rgba(0,0,0,${.45 * ground})`; ctx.beginPath(); ctx.ellipse(0, 2, 88 * (.5 + ground * .5), 8, 0, 0, 2 * PI); ctx.fill(); }
  ctx.translate(0, P.lift);
  // back wall
  ctx.fillStyle = '#1a2029'; rr(-70, -270, 140, 262, 62); ctx.fill();
  const glow = (R.inPod && P.door > .6) ? .18 + .08 * Math.sin(t / 400) : .05;
  const grd = ctx.createLinearGradient(0, -12, 0, -260);
  grd.addColorStop(0, `rgba(123,228,149,${glow * 1.6})`); grd.addColorStop(1, 'rgba(123,228,149,0)');
  ctx.fillStyle = grd; rr(-62, -262, 124, 250, 56); ctx.fill();
  // rising sparks while charging
  if (R.inPod && P.door > .6) {
    ctx.fillStyle = g;
    for (let i = 0; i < 7; i++) {
      const ph = ((t / 1800) + i / 7) % 1; ctx.globalAlpha = (1 - ph) * .7;
      ctx.beginPath(); ctx.arc(Math.sin(i * 2.3 + t / 700) * 44, -20 - ph * 220, 2.2, 0, 2 * PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // platform
  ctx.fillStyle = '#4a5466'; rr(-80, -14, 160, 14, 6); ctx.fill();
  ctx.fillStyle = '#2b323e'; rr(-62, -18, 124, 6, 3); ctx.fill();
  ctx.restore();
}
function drawPodFront(t) {
  const p = L.k * DPR, g = '#7be495', charge = podCharge();
  ctx.save(); ctx.translate(P.x * DPR, L.floorY * DPR); ctx.scale(p, p);
  ctx.translate(0, P.lift);
  // side rails
  ctx.fillStyle = '#5a6577'; rr(-80, -276, 12, 264, 6); ctx.fill(); rr(68, -276, 12, 264, 6); ctx.fill();
  // glass door slides down from the top cap
  if (P.door > .02) {
    ctx.save(); rr(-68, -268, 136, 256, 58); ctx.clip();
    const dy = -268 + (P.door - 1) * 256;
    ctx.fillStyle = 'rgba(160,240,220,.10)'; ctx.fillRect(-68, dy, 136, 256);
    ctx.strokeStyle = 'rgba(220,255,245,.22)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-40, dy + 40); ctx.lineTo(-52, dy + 120); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-26, dy + 30); ctx.lineTo(-32, dy + 60); ctx.stroke();
    ctx.fillStyle = '#5a6577'; ctx.fillRect(-68, dy + 250, 136, 6);                    // door's bottom edge
    ctx.restore();
  }
  // top cap with lightning bolt + ring for the claw
  ctx.fillStyle = '#5a6577'; rr(-84, -290, 168, 28, 14); ctx.fill();
  ctx.strokeStyle = '#6b7687'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -296, 7, PI, 2 * PI); ctx.stroke();
  const lit = R.inPod && P.door > .6;
  ctx.shadowColor = g; ctx.shadowBlur = lit ? 12 * p : 0; ctx.fillStyle = lit ? g : '#2b323e';
  ctx.beginPath(); ctx.moveTo(3, -286); ctx.lineTo(-7, -274); ctx.lineTo(0, -274); ctx.lineTo(-3, -265); ctx.lineTo(7, -278); ctx.lineTo(0, -278); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // charge meter on the platform: 6 cells fill over the break
  for (let i = 0; i < 6; i++) {
    const on = charge * 6 > i, pulse = charge * 6 > i && charge * 6 < i + 1;
    ctx.fillStyle = on ? g : '#2b323e';
    ctx.globalAlpha = pulse ? .55 + .45 * Math.sin(t / 180) : 1;
    if (on) { ctx.shadowColor = g; ctx.shadowBlur = 6 * p; }
    rr(-51 + i * 18, -10, 12, 5, 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawClaw() {
  if (P.state === 'none' || P.state === 'placed') return;
  const p = L.k * DPR, spec = PROPS[P.kind];
  ctx.save(); ctx.translate((P.x + spec.grabX * L.k) * DPR, L.floorY * DPR); ctx.scale(p, p);
  const tip = spec.grabY + P.clawY, topY = -L.floorY / L.k - 10, o = 1 - P.closed;
  ctx.strokeStyle = '#6b7687'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, topY); ctx.lineTo(0, tip - 38); ctx.stroke();
  ctx.fillStyle = '#4b5563'; rr(-17, tip - 40, 34, 20, 7); ctx.fill();
  ctx.shadowColor = '#ffb547'; ctx.shadowBlur = 8 * p; ctx.fillStyle = '#ffb547';
  ctx.beginPath(); ctx.arc(0, tip - 30, 3, 0, 2 * PI); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const i of [-1, 1]) { ctx.beginPath(); ctx.moveTo(i * 8, tip - 20); ctx.lineTo(i * (15 + 8 * o), tip - 8); ctx.lineTo(i * (10 + 12 * o), tip + 5); ctx.stroke(); }
  ctx.restore();
}
