/* EddieHD — Scene furniture that Eddie uses, drawn every frame (not baked into the backdrop) because it moves
   or sits in front of him:
     café: the table, with his coffee and notebook (drawn in FRONT of Eddie, so he sits behind it)
     park: his dog, sitting by the bench (drawn BEHIND Eddie, so his hand rests on its head)
   Drawn in CSS px with Eddie's scale k; positions come from CAFE / PARK (set when the backdrop is painted).
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* --- café table -------------------------------------------------------- */
function drawCafeTable(g, W, H, F, k, t) {
  if (!CAFE.table) return;
  const x = CAFE.table.x, top = F - TABLE_H * k, rw = 66 * k;
  // pedestal and foot
  g.fillStyle = '#1b1d22';
  g.fillRect(x - 4 * k, top, 8 * k, TABLE_H * k);
  g.beginPath(); g.ellipse(x, F - 2 * k, 26 * k, 5 * k, 0, 0, 2 * PI); g.fill();
  // top: a wooden disc seen a little from above
  g.fillStyle = '#3d2a1e'; g.beginPath(); g.ellipse(x, top + 3 * k, rw, 9 * k, 0, 0, 2 * PI); g.fill();
  g.fillStyle = '#6b4a32'; g.beginPath(); g.ellipse(x, top, rw, 9 * k, 0, 0, 2 * PI); g.fill();
  g.fillStyle = 'rgba(255,220,170,.12)'; g.beginPath(); g.ellipse(x - 10 * k, top - 3 * k, rw * .6, 3 * k, 0, 0, 2 * PI); g.fill();
  // notebook, open, with lines that fill up as he writes
  const nx = x + 2 * k, ny = top - 2 * k, nw = 40 * k, nh = 9 * k;
  g.fillStyle = '#e8e2d2';
  g.beginPath(); g.moveTo(nx, ny - nh / 2); g.lineTo(nx + nw, ny - nh / 2); g.lineTo(nx + nw + 4 * k, ny + nh / 2); g.lineTo(nx - 4 * k, ny + nh / 2); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(nx + nw / 2 - .5 * k, ny - nh / 2, 1 * k, nh);
  g.strokeStyle = 'rgba(40,50,80,.55)'; g.lineWidth = Math.max(1, .8 * k);
  const lines = Math.floor(CAFE.ink * 8);
  for (let i = 0; i < lines; i++) {
    const page = i < 4 ? 0 : 1, row = i % 4, yy = ny - nh / 2 + (row + 1) * nh / 5;
    const x0 = nx + page * (nw / 2 + 2 * k) + 2 * k, len = (nw / 2 - 6 * k) * (i === lines - 1 ? (CAFE.ink * 8 % 1) : 1);
    g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + len, yy); g.stroke();
  }
  // coffee on its saucer (unless it's in Eddie's hand)
  const cx = x + CAFE.cupDX * k;
  g.fillStyle = '#d9d2c4'; g.beginPath(); g.ellipse(cx, top - 1 * k, 11 * k, 3 * k, 0, 0, 2 * PI); g.fill();
  if (!R.hold.cup) {
    drawMug(g, cx, top - 1 * k, k);
    steam(g, cx, top - 16 * k, k, t);
  }
}
// a mug sitting on (x, y), in CSS px
function drawMug(g, x, y, k) {
  g.fillStyle = '#c9603f';                                             // terracotta, so it shows against Eddie's cream shell
  g.beginPath(); g.moveTo(x - 7 * k, y - 14 * k); g.lineTo(x + 7 * k, y - 14 * k); g.lineTo(x + 6 * k, y); g.lineTo(x - 6 * k, y); g.closePath(); g.fill();
  g.strokeStyle = '#c9603f'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(x + 8 * k, y - 8 * k, 4 * k, -PI / 2, PI / 2); g.stroke();
  g.fillStyle = '#3a2418'; g.beginPath(); g.ellipse(x, y - 14 * k, 7 * k, 1.8 * k, 0, 0, 2 * PI); g.fill();
}
function steam(g, x, y, k, t) {
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.6 * k; g.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const ph = (t * .45 + i * .5) % 1;
    g.globalAlpha = Math.sin(ph * PI);
    g.beginPath();
    for (let s = 0; s <= 1; s += .1) { const yy = y - s * 24 * k - ph * 8 * k, xx = x + (i ? 3 : -3) * k + Math.sin(s * 6 + t * 2 + i) * 3 * k; s ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
  }
  g.globalAlpha = 1;
}

// the stool he sits on (behind him, so his legs dangle in front of it)
function drawCafeStool(g, W, H, F, k) {
  if (!CAFE.table) return;
  const x = CAFE.table.x, seat = F - (28 + STOOL_LIFT) * k;
  g.strokeStyle = '#24262c'; g.lineWidth = 3 * k;
  for (const d of [-14, 14]) { g.beginPath(); g.moveTo(x + d * .6 * k, seat); g.lineTo(x + d * k, F); g.stroke(); }
  g.beginPath(); g.moveTo(x - 11 * k, F - 10 * k); g.lineTo(x + 11 * k, F - 10 * k); g.stroke();
  g.fillStyle = '#5a3d2a'; g.beginPath(); g.ellipse(x, seat, 18 * k, 5 * k, 0, 0, 2 * PI); g.fill();
}

/* --- the dog ------------------------------------------------------------ */
// sits facing Eddie (left). Wags; when petted: leans into the hand, eyes shut happy, tail goes wild.
const DOG_HEAD = 64;                                     // top of its head, units above the floor
const DOG = { pet: 0, petK: 0, wag: 0, lastT: 0, look: 0, nextLook: 0 };
function drawDog(g, W, H, F, k, t) {
  if (!PARK.dogOX) return;
  const dt = Math.min(.05, t - (DOG.lastT || t)); DOG.lastT = t;
  DOG.petK = lerp(DOG.petK, DOG.pet, Math.min(1, dt * 4));
  DOG.wag += dt * (5 + DOG.petK * 14);
  if (t > DOG.nextLook) { DOG.look = Math.random() < .5 ? 0 : 1; DOG.nextLook = t + 2 + Math.random() * 4; }
  const ox = PARK.dogOX, P2 = DOG.petK;
  const fur = '#b98352', dark = '#7d5131', chest = '#e6c79c';
  g.save(); g.translate(ox, F); g.scale(k, k);
  // shadow
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(2, 1, 24, 4, 0, 0, 2 * PI); g.fill();
  // tail
  const ta = -.6 + Math.sin(DOG.wag) * (.35 + P2 * .25);
  g.strokeStyle = fur; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(16, -10); g.quadraticCurveTo(26 + Math.cos(ta) * 4, -14 + Math.sin(ta) * 8, 22 + Math.cos(ta) * 14, -20 + Math.sin(ta) * 14); g.stroke();
  // haunch and body
  g.fillStyle = dark; g.beginPath(); g.ellipse(10, -12, 13, 11, 0, 0, 2 * PI); g.fill();
  g.fillStyle = fur; g.beginPath(); g.ellipse(4, -26, 15, 21, -.2, 0, 2 * PI); g.fill();
  g.fillStyle = chest; g.beginPath(); g.ellipse(-5, -28, 7, 13, -.2, 0, 2 * PI); g.fill();
  // front legs and paws
  g.fillStyle = fur; g.fillRect(-9, -26, 6, 25); g.fillRect(-2, -26, 6, 25);
  g.fillStyle = chest; g.beginPath(); g.ellipse(-7, -1, 5, 3, 0, 0, 2 * PI); g.ellipse(1, -1, 5, 3, 0, 0, 2 * PI); g.fill();
  // head: tilts up into the hand when petted, otherwise glances between Eddie and you
  g.save(); g.translate(-4, -40); g.rotate(-.18 * P2 + (DOG.look && !P2 ? .12 : 0));
  g.fillStyle = '#c0392b'; g.fillRect(-9, 0, 15, 4);                                   // collar
  g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(-3, 6, 2.2, 0, 2 * PI); g.fill();      // tag
  g.fillStyle = fur; g.beginPath(); g.arc(-4, -10, 13, 0, 2 * PI); g.fill();
  g.beginPath(); g.ellipse(-16, -6, 9, 6, 0, 0, 2 * PI); g.fill();                    // snout
  g.fillStyle = chest; g.beginPath(); g.ellipse(-17, -4, 7, 3.5, 0, 0, 2 * PI); g.fill();
  g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(-24, -8, 2.6, 0, 2 * PI); g.fill();   // nose
  if (P2 > .4) {                                                                       // happy shut eye
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 1.6; g.beginPath(); g.arc(-9, -12, 3, PI * 1.1, PI * 1.9); g.stroke();
  } else { g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(-9, -13, 2.2, 0, 2 * PI); g.fill(); }
  g.fillStyle = dark; g.beginPath(); g.ellipse(3, -8, 5, 11, .25 + Math.sin(DOG.wag * .5) * .05 * (1 + P2), 0, 2 * PI); g.fill();   // floppy ear
  if (P2 > .4) { g.fillStyle = '#e26d7a'; g.beginPath(); g.ellipse(-17, 0, 3, 4, 0, 0, PI); g.fill(); }   // tongue out
  g.restore();
  g.restore();
}

SCENES.cafe.front = drawCafeTable;
SCENES.cafe.back = drawCafeStool;
SCENES.park.back = drawDog;
