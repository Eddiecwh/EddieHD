/* EddieHD — Things Eddie holds, drawn at his hands in his own coordinates (units, floor = 0, up = negative):
   coffee cup (left hand), pen (right hand), a book (carried closed, or open in both hands), and his umbrella.
   drawHeld() is called from drawRobot() right after the arms, so items sit in front of his body.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

function drawHeld(by, t) {
  const [Lh, Rh] = R.hl;
  if (R.umb > .01) drawUmbrella(Lh.x, Lh.y, t);
  if (R.hold.cup) {                                       // mug in the left hand, steaming
    ctx.save(); ctx.translate(Lh.x + 10, Lh.y + 7);                    // hand wraps the left side of the mug
    drawMug(ctx, 0, 0, 1);
    if (R.sub === 'sip') steam(ctx, 0, -16, 1, t / 1000);
    ctx.restore();
    handOver(Lh);
  }
  if (R.hold.pen) {                                       // pen, tip down on the page
    ctx.strokeStyle = '#2b3550'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(Rh.x + 5, Rh.y - 9); ctx.lineTo(Rh.x - 5, Rh.y + 7); ctx.stroke();
    handOver(Rh);
  }
  if (R.hold.open) drawOpenBook(Lh, Rh, t);
  else if (R.hasBook) {                                   // carrying it shut
    ctx.fillStyle = '#c9952e'; rr(Rh.x - 8, Rh.y - 4, 16, 22, 2); ctx.fill();
    ctx.fillStyle = 'rgba(225,190,120,.6)'; ctx.fillRect(Rh.x - 8, Rh.y + 2, 16, 2);
    handOver(Rh);
  }
}
// redraw a hand on top of what it's holding
function handOver(h) { ctx.fillStyle = C.shell; ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, 2 * PI); ctx.fill(); }

function drawOpenBook(Lh, Rh, t) {
  const cx = (Lh.x + Rh.x) / 2, cy = (Lh.y + Rh.y) / 2 - 2, w = Math.max(40, Rh.x - Lh.x + 6), h = 30;
  ctx.fillStyle = '#c9952e'; rr(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 6, 3); ctx.fill();      // cover
  for (const side of [-1, 1]) {                                                                    // two pages, dipping to the spine
    ctx.fillStyle = side < 0 ? '#ebe4d2' : '#f3eddd';
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2 + 3); ctx.quadraticCurveTo(cx + side * w * .25, cy - h / 2 - 2, cx + side * w / 2, cy - h / 2);
    ctx.lineTo(cx + side * w / 2, cy + h / 2); ctx.quadraticCurveTo(cx + side * w * .25, cy + h / 2 - 3, cx, cy + h / 2 + 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,60,70,.35)'; ctx.lineWidth = 1.2;
    for (let r = 0; r < 5; r++) { const y = cy - h / 2 + 6 + r * 4.6; ctx.beginPath(); ctx.moveTo(cx + side * 4, y); ctx.lineTo(cx + side * (w / 2 - 4), y); ctx.stroke(); }
  }
  const fk = (t - R.flipT) / 450;                                                                  // a page turning over
  if (fk > 0 && fk < 1) {
    const px = cx + Math.cos(fk * PI) * w / 2;
    ctx.fillStyle = '#fbf6e8';
    ctx.beginPath(); ctx.moveTo(cx, cy - h / 2 + 2); ctx.lineTo(px, cy - h / 2 - 5 * Math.sin(fk * PI)); ctx.lineTo(px, cy + h / 2 - 5 * Math.sin(fk * PI)); ctx.lineTo(cx, cy + h / 2 + 2); ctx.closePath(); ctx.fill();
  }
  handOver(Lh); handOver(Rh);
}

// umbrella: grip at (x, y); R.umb 0→.4 brings it up shut, .4→1 opens the canopy. Tilts with R.umbTilt.
function drawUmbrella(x, y, t) {
  const open = clamp((R.umb - .4) / .6, 0, 1), shaft = 146;
  ctx.save(); ctx.translate(x, y); ctx.rotate(R.umbTilt);
  ctx.strokeStyle = '#3a404b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.arc(-5, 8, 5, 0, PI * .9); ctx.stroke();                // J handle under the fist
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -shaft); ctx.stroke();
  const cw = lerp(10, 84, open), ch = lerp(48, 40, open), base = -shaft + ch;                     // half width, height
  const cols = ['#f0b73a', '#d9952a'];
  if (open < .05) {                                                                               // furled
    ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(0, -shaft - 6); ctx.lineTo(cw, base); ctx.lineTo(-cw, base); ctx.closePath(); ctx.fill();
  } else {
    const n = 6;
    for (let s = 0; s < n; s++) {                                                                 // panels between the ribs
      const a0 = -cw + (2 * cw) * s / n, a1 = -cw + (2 * cw) * (s + 1) / n;
      ctx.fillStyle = cols[s % 2];
      ctx.beginPath(); ctx.moveTo(0, -shaft - 4);
      ctx.quadraticCurveTo(a0 * .75, -shaft - 2, a0, base);
      ctx.quadraticCurveTo((a0 + a1) / 2, base - 7 * open, a1, base);
      ctx.quadraticCurveTo(a1 * .75, -shaft - 2, 0, -shaft - 4);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(-cw * .3, -shaft + ch * .35, cw * .35, ch * .18, -.3, 0, 2 * PI); ctx.fill();
  }
  ctx.fillStyle = '#3a404b'; ctx.beginPath(); ctx.arc(0, -shaft - 6, 3, 0, 2 * PI); ctx.fill();   // tip
  ctx.restore();
  handOver({ x, y });
}
