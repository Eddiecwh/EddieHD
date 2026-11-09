/* EddieHD — Things Eddie holds, drawn at his hands in his own coordinates (units, floor = 0, up = negative):
   coffee cup (left hand), pen (right hand), a book (carried closed, or open in both hands), and his umbrella.
   drawHeld() is called from drawRobot() right after the arms, so items sit in front of his body.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

function drawHeld(by, t) {
  const [Lh, Rh] = R.hl;
  if (R.umb > 0.01) drawUmbrella(Lh.x, Lh.y, t);
  if (R.hold.cup) {
    // mug in the left hand, steaming
    ctx.save();
    ctx.translate(Lh.x + 10, Lh.y + 7); // hand wraps the left side of the mug
    drawMug(ctx, 0, 0, 1);
    if (R.sub === "sip") steam(ctx, 0, -16, 1, t / 1000);
    ctx.restore();
    handOver(Lh);
  }
  if (R.hold.pen) {
    // pen, tip down on the page
    ctx.strokeStyle = "#2b3550";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(Rh.x + 5, Rh.y - 9);
    ctx.lineTo(Rh.x - 5, Rh.y + 7);
    ctx.stroke();
    handOver(Rh);
  }
  if (R.hold.spoon) {
    // teaspoon, bowl down in the cup
    ctx.strokeStyle = "#c9ccd3";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(Rh.x - 2, Rh.y - 6);
    ctx.lineTo(Rh.x - 6, Rh.y + 14);
    ctx.stroke();
    handOver(Rh);
  }
  if (R.hold.treat) {
    // a little dog biscuit
    ctx.fillStyle = "#c8955a";
    rr(Rh.x - 6, Rh.y - 13, 12, 5, 2);
    ctx.fill();
    for (const [dx, dy] of [
      [-6, -13],
      [-6, -8],
      [6, -13],
      [6, -8],
    ]) {
      ctx.beginPath();
      ctx.arc(Rh.x + dx, Rh.y + dy, 3, 0, 2 * PI);
      ctx.fill();
    }
    handOver(Rh);
  }
  if (R.hold.open) drawOpenBook(Lh, Rh, t);
  else if (R.hasBook && !LIB.bookDown) {
    // carrying it shut (not while it lies open on the desk) (bigger than a paperback, so it reads at a glance)
    ctx.fillStyle = R.bookCol;
    rr(Rh.x - 14, Rh.y - 10, 28, 39, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.fillRect(Rh.x - 14, Rh.y - 10, 5, 39); // spine
    ctx.fillStyle = "rgba(225,190,120,.6)";
    ctx.fillRect(Rh.x - 9, Rh.y + 1, 21, 2.5);
    ctx.fillRect(Rh.x - 9, Rh.y + 19, 21, 2);
    handOver(Rh);
  }
}
// redraw a hand on top of what it's holding
function handOver(h) {
  ctx.fillStyle = C.shell;
  ctx.beginPath();
  ctx.arc(h.x, h.y, 7, 0, 2 * PI);
  ctx.fill();
}

function drawOpenBook(Lh, Rh, t) {
  const cx = (Lh.x + Rh.x) / 2,
    cy = (Lh.y + Rh.y) / 2 - 6,
    w = Math.max(68, Rh.x - Lh.x + 8),
    h = 52;
  ctx.fillStyle = R.bookCol;
  rr(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 6, 3);
  ctx.fill(); // cover
  for (const side of [-1, 1]) {
    // two pages, dipping to the spine
    ctx.fillStyle = side < 0 ? "#ebe4d2" : "#f3eddd";
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2 + 3);
    ctx.quadraticCurveTo(
      cx + side * w * 0.25,
      cy - h / 2 - 2,
      cx + (side * w) / 2,
      cy - h / 2,
    );
    ctx.lineTo(cx + (side * w) / 2, cy + h / 2);
    ctx.quadraticCurveTo(
      cx + side * w * 0.25,
      cy + h / 2 - 3,
      cx,
      cy + h / 2 + 2,
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(60,60,70,.35)";
    ctx.lineWidth = 1.2;
    for (let r = 0; r < 8; r++) {
      const y = cy - h / 2 + 8 + r * 5.2;
      ctx.beginPath();
      ctx.moveTo(cx + side * 4, y);
      ctx.lineTo(cx + side * (w / 2 - 4), y);
      ctx.stroke();
    }
  }
  const fk = (t - R.flipT) / 450; // a page turning over
  if (fk > 0 && fk < 1) {
    const px = cx + (Math.cos(fk * PI) * w) / 2;
    ctx.fillStyle = "#fbf6e8";
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2 + 2);
    ctx.lineTo(px, cy - h / 2 - 5 * Math.sin(fk * PI));
    ctx.lineTo(px, cy + h / 2 - 5 * Math.sin(fk * PI));
    ctx.lineTo(cx, cy + h / 2 + 2);
    ctx.closePath();
    ctx.fill();
  }
  handOver(Lh);
  handOver(Rh);
}

// umbrella: grip at (x, y); R.umb 0→.4 brings it up shut, .4→1 opens the canopy. Tilts with R.umbTilt.
function drawUmbrella(x, y, t) {
  const open = clamp((R.umb - 0.4) / 0.6, 0, 1),
    shaft = 146;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(R.umbTilt);
  ctx.strokeStyle = "#3a404b";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.arc(-5, 8, 5, 0, PI * 0.9);
  ctx.stroke(); // J handle under the fist
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, -shaft);
  ctx.stroke();
  const cw = lerp(10, 84, open),
    ch = lerp(48, 40, open),
    base = -shaft + ch; // half width, height
  const cols = ["#f0b73a", "#d9952a"];
  if (open < 0.05) {
    // furled
    ctx.fillStyle = cols[1];
    ctx.beginPath();
    ctx.moveTo(0, -shaft - 6);
    ctx.lineTo(cw, base);
    ctx.lineTo(-cw, base);
    ctx.closePath();
    ctx.fill();
  } else {
    const n = 6;
    for (let s = 0; s < n; s++) {
      // panels between the ribs
      const a0 = -cw + (2 * cw * s) / n,
        a1 = -cw + (2 * cw * (s + 1)) / n;
      ctx.fillStyle = cols[s % 2];
      ctx.beginPath();
      ctx.moveTo(0, -shaft - 4);
      ctx.quadraticCurveTo(a0 * 0.75, -shaft - 2, a0, base);
      ctx.quadraticCurveTo((a0 + a1) / 2, base - 7 * open, a1, base);
      ctx.quadraticCurveTo(a1 * 0.75, -shaft - 2, 0, -shaft - 4);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.beginPath();
    ctx.ellipse(
      -cw * 0.3,
      -shaft + ch * 0.35,
      cw * 0.35,
      ch * 0.18,
      -0.3,
      0,
      2 * PI,
    );
    ctx.fill();
  }
  ctx.fillStyle = "#3a404b";
  ctx.beginPath();
  ctx.arc(0, -shaft - 6, 3, 0, 2 * PI);
  ctx.fill(); // tip
  ctx.restore();
  handOver({ x, y });
}

// things held up in front of his face, drawn after the head: binoculars, barrels angled up at the moon
function drawHeldOver() {
  if (!R.hold.bino) return;
  const [Lh, Rh] = R.hl,
    dir = Math.sign(Math.sin(R.yaw)) || 1;
  const mx = (Lh.x + Rh.x) / 2,
    my = Math.min(Lh.y, Rh.y) + 4;
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(dir * 0.7);
  for (const side of [-1, 1]) {
    // two barrels, eyepieces at his screen, pointing up at the moon
    const bx = side * 8.5;
    ctx.fillStyle = "#2b2f36";
    rr(bx - 7.5, -46, 15, 42, 5);
    ctx.fill();
    ctx.fillStyle = "#3d434d";
    rr(bx - 9, -54, 18, 12, 4);
    ctx.fill(); // wider objective end
    ctx.fillStyle = "#7d93b3";
    ctx.beginPath();
    ctx.ellipse(bx, -54, 6.5, 2.5, 0, 0, 2 * PI);
    ctx.fill(); // lens glint
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(bx - 5, -40, 3, 30); // highlight down the barrel
  }
  ctx.fillStyle = "#1e2127";
  ctx.fillRect(-2.5, -34, 5, 16); // hinge between the barrels
  ctx.restore();
  for (const h of [Lh, Rh]) {
    // hands, outlined so they read against his cream head
    handOver(h);
    ctx.strokeStyle = C.joint;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, 7, 0, 2 * PI);
    ctx.stroke();
  }
}
