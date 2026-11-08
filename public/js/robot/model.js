/* EddieHD — Eddie's body: colours and how his legs, arms, torso, head and antenna are drawn for any pose.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* --- drawing ------------------------------------------------------------ */
const C = { shell: '#ece6d8', shade: '#c8c0ae', panel: '#d9d2c2', dark: '#2a2f38', joint: '#3a404b' };
const legAmp = () => .55 + R.run * .3;                                   // thigh swing (radians)

// cr: crouch (packing up), up: how far the legs have retracted into the body, R.spread: star-jump pose
function drawLeg(i, ph, s, as, hipY, col, cr, up) {
  const sp = R.spread;
  const hipX = i * 12 * (1 - as * .8) + i * sp * 5;
  // th = sin(ph) rises while cos(ph) > 0: that half is the swing (foot in the air, moving forward), so bend the knee then.
  // The other half is the stance: foot on the ground, straight leg sliding back under the body.
  let th = Math.sin(ph) * legAmp() * R.walkAmt, kn = Math.max(0, Math.cos(ph)) * (1.1 + R.run * .7) * R.walkAmt;
  th += R.sit * 1.45 + cr * 1.2; kn += R.sit * 1.45 + cr * 2.4;      // sitting / crouching: thigh forward, shin folds back
  const hy0 = hipY - up, lat = i * sp * .6;                     // lat: legs kick out sideways in the star jump
  const kx = hipX + Math.sin(th) * 23 * s + Math.sin(lat) * 23, ky = hy0 + Math.cos(th) * 23 * Math.cos(lat);
  const sa = th - kn;
  const fx = kx + Math.sin(sa) * 23 * s + Math.sin(lat) * 23, fy = ky + Math.cos(sa) * 23 * Math.cos(lat);
  ctx.strokeStyle = col; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(hipX, hy0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.fillStyle = C.joint; ctx.beginPath(); ctx.arc(kx, ky, 4.5, 0, 2 * PI); ctx.fill();
  ctx.fillStyle = C.dark; rr(fx - 10 - as * 4 + s * 5, fy - 1, 20 + as * 8, 10, 5); ctx.fill();
}

// aF: arms folding against the body, aIn: arms sliding in behind the torso
function drawArm(i, s, as, by, t, col, aF, aIn) {
  const sx = i * 31 * (1 - as * .6) * (1 - aIn * .45), sy = -104 + by;
  const ph = R.phase + (i > 0 ? PI : 0);                              // opposite to the same-side leg
  const amp = (.55 + R.run * .75) * R.walkAmt;                            // running: big pumping swing
  let u = i * (.28 + R.run * .1) * (1 - as) + Math.sin(ph) * amp * s;           // upper arm, radians from straight down
  let v = u + i * .12 * (1 - as) + (.35 + R.run * 1.25) * s * R.walkAmt;       // forearm: bent up to ~90° when running
  u = lerp(u, i * .55, R.typing); v = lerp(v, -i * 1.25, R.typing);    // typing: forearms in toward the keys
  u = lerp(u, i * 2.85, R.armsUp); v = lerp(v, i * 3.05, R.armsUp);     // stretch: straight up
  if (R.dance > .01) { const d = i * (1.5 + Math.sin(t / 230 + (i > 0 ? 0 : PI)) * 1.0); u = lerp(u, d, R.dance); v = lerp(v, d + i * .6, R.dance); }
  if (i === 1 && R.wave > 0) { const w = Math.min(1, R.wave * 3); u = lerp(u, 2.45 + Math.sin(t / 90) * .3, w); v = lerp(v, u + .5, w); }
  if (aF > 0) { u = lerp(u, i * .08, aF); v = lerp(v, i * (PI - .25), aF); }   // pack: arm flat to the side, forearm folded up
  if (R.spread > 0) { u = lerp(u, i * 2.15, R.spread); v = lerp(v, i * 2.35, R.spread); }  // pop: arms flung up and out
  const ex = sx + Math.sin(u) * 19, ey = sy + Math.cos(u) * 19;
  const hx = ex + Math.sin(v) * 17, hy = ey + Math.cos(v) * 17 + Math.sin(t / 70 + (i > 0 ? 0 : 1.9)) * 2.5 * R.typing;
  ctx.strokeStyle = C.joint; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 2 * PI); ctx.fill();
}

function drawRobot(t) {
  const p = L.k * DPR, maxSp = 160 * L.k;
  const s = Math.sin(R.yaw), c = Math.cos(R.yaw), as = Math.abs(s);
  const hs = Math.sin(R.headYaw), hc = Math.cos(R.headYaw), ahs = Math.abs(hs);
  const sc = statusColor();

  ctx.save(); ctx.translate(R.x * DPR, L.floorY * DPR); ctx.scale(p, p);
  if (!R.inPod) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, 2, Math.max(16, 42 - R.hop * .8 - R.popY * .4), 7, 0, 0, 2 * PI); ctx.fill(); }
  ctx.translate(0, -R.hop - R.popY - (R.inPod ? 10 : 0) * (1 - R.walkAmt));    // hop, pop jump, pod platform

  const breath = Math.sin(t / 950) * 1.2 * (1 - R.walkAmt);
  // keep the planted foot on the floor: lower the hips by however much the straight stance leg is angled
  const stancePh = Math.cos(R.phase) < 0 ? R.phase : R.phase + PI;
  const bob = 46 * (1 - Math.cos(Math.sin(stancePh) * legAmp() * R.walkAmt)) + R.dip;   // + is down

  // packing up (paused) happens in stages as R.ball goes 0 → 1; nothing shrinks, parts tuck behind bigger parts:
  //   arms fold flat and slide in behind the torso → crouch → legs retract up into the body (body settles on the floor)
  //   → head lowers over the torso like a lid → antenna tucks in
  const B = R.ball;
  const sg = (a, b) => { const k = clamp((B - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const aF = sg(0, .3), aIn = sg(.15, .4), cr = sg(.12, .45), lIn = sg(.4, .62), hIn = sg(.58, .9), anIn = sg(.82, 1);
  const ext = 46 * Math.cos(1.2 * cr);                                    // leg height while crouched
  const packDrop = (46 - ext) + lIn * (52 - (46 - ext));                // crouch, then settle until the torso sits on the floor
  const drop = R.sit * 30 + bob + packDrop, st = R.armsUp * 6;
  const hipY = -56 + drop;
  const far = (c >= 0 ? 1 : -1) * (s >= 0 ? 1 : -1);                  // screen side of the far limbs when side-on
  const by = drop - st - breath * .6 * (1 - B);
  const armsBehind = aF > .4;                                         // folded arms go behind the torso

  if (lIn < .999) for (const i of [far, -far]) drawLeg(i, R.phase + (i > 0 ? 0 : PI), s, as, hipY, i === far && as > .3 ? C.shade : C.shell, cr, lIn * (ext + 6));

  // upper body leans into the walk, more when running
  ctx.save(); ctx.translate(0, hipY); ctx.rotate(clamp(R.vx / maxSp, -1, 1) * (.07 + R.run * .12)); ctx.translate(0, -hipY);
  for (const i of (armsBehind ? [far, -far] : as > .35 ? [far] : [])) drawArm(i, s, as, by, t, armsBehind ? C.shell : C.shade, aF, aIn);
  ctx.fillStyle = C.shell; rr(-31, -116 + by, 62, 64 + st + breath * .6 * (1 - B), 20); ctx.fill();
  if (as > .15) { ctx.fillStyle = C.shade; rr(s > 0 ? -31 : 31 - as * 12, -112 + by, as * 12, 56 + st, 8); ctx.fill(); }
  if (c > .1) {                                                       // chest panel + status light
    ctx.fillStyle = C.panel; rr(-18 * c + s * 8, -104 + by, 36 * c, 26, 9); ctx.fill();
    ctx.shadowColor = sc; ctx.shadowBlur = 10 * p; ctx.fillStyle = sc;
    ctx.beginPath(); ctx.arc(s * 8, -91 + by, 5 * Math.sqrt(c) * (R.inPod ? 1 + .25 * Math.sin(t / 300) : 1), 0, 2 * PI); ctx.fill(); ctx.shadowBlur = 0;
  } else if (c < -.1) {                                               // back hatch with vents
    const w = 36 * -c, x0 = -w / 2 - s * 6;
    ctx.fillStyle = C.panel; rr(x0, -108 + by, w, 40, 8); ctx.fill();
    ctx.strokeStyle = C.shade; ctx.lineWidth = 2.5;
    for (const y of [-99, -91, -83]) { ctx.beginPath(); ctx.moveTo(x0 + 6, y + by); ctx.lineTo(x0 + w - 6, y + by); ctx.stroke(); }
  }
  if (!armsBehind) for (const i of (as > .35 ? [-far] : [far, -far])) drawArm(i, s, as, by, t, C.shell, aF, aIn);
  ctx.fillStyle = C.joint; rr(-8, -127 + by, 16, 14, 4); ctx.fill();                     // neck

  // head: tilts while listening; when packed it has closed down over the torso, sits on the floor and rocks a little
  const head0 = -124 + by, hd = lerp(head0, 0, hIn) - head0;
  const hh = 80 + anIn * 6, hy = -204 + by + hd - anIn * 6, hx = hs * 4, hw = 100 * (1 - ahs * .1) - anIn * 4;
  ctx.save(); ctx.translate(0, -124 + by); ctx.rotate(R.tilt * (1 - B)); ctx.translate(0, 124 - by);
  ctx.translate(hx, hy + hh); ctx.rotate(Math.sin(t / 1400) * .06 * anIn); ctx.translate(-hx, -(hy + hh));
  ctx.fillStyle = C.shell; rr(hx - hw / 2, hy, hw, hh, 26 + anIn * 12); ctx.fill();
  if (ahs > .1) { ctx.fillStyle = C.shade; rr(hs > 0 ? hx - hw / 2 : hx + hw / 2 - ahs * 16, hy + 6, ahs * 16, hh - 12, 8); ctx.fill(); }
  if (hc > .06) {
    const sw = (hw - 18) * (.3 + .7 * hc), sh = hh - 20, sx = hx - sw / 2 + hs * hw * .2, sy = hy + 10;
    ctx.fillStyle = SCREEN; rr(sx, sy, sw, sh, 18); ctx.fill();
    drawFace(sx, sy, sw, sh, hs * .5, t, p);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; rr(sx + 4, sy + 3, sw * .55, sh * .28, 12); ctx.fill();
  } else if (hc < -.06) {
    const bw = (hw - 26) * (.3 + .7 * -hc), bx = hx - bw / 2 - hs * hw * .2;
    ctx.fillStyle = C.panel; rr(bx, hy + 12, bw, hh - 24, 14); ctx.fill();
    ctx.strokeStyle = C.shade; ctx.lineWidth = 3;
    for (const y of [hy + 28, hy + 40, hy + 52]) { ctx.beginPath(); ctx.moveTo(bx + 10, y); ctx.lineTo(bx + bw - 10, y); ctx.stroke(); }
  }
  const al = 1 - anIn * .75;                                            // antenna slides down into the head
  ctx.save(); ctx.translate(hx - hs * 7, hy + 2); ctx.rotate(R.ant);
  ctx.strokeStyle = C.joint; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(R.ant * -6, -14 * al, 0, -28 * al); ctx.stroke();
  ctx.shadowColor = sc; ctx.shadowBlur = 14 * p * (1 - anIn * .5); ctx.fillStyle = sc;
  ctx.beginPath(); ctx.arc(0, -31 * al, 6 - anIn * 1.5 + (R.alert ? Math.sin(t / 120) * 1.5 : 0), 0, 2 * PI); ctx.fill(); ctx.shadowBlur = 0;
  ctx.restore();
  if (R.act === 'sleep' && B > .9) {
    ctx.fillStyle = '#7aa7ff'; ctx.font = '600 22px Fredoka, sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const ph = ((t / 1400) + i / 3) % 1; ctx.globalAlpha = 1 - ph; ctx.fillText('z', hx + 42 + ph * 16, hy - 6 - ph * 40); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();   // head tilt
  ctx.restore();   // lean
  ctx.restore();
  R.headTop = L.floorY - (R.hop + R.popY + (R.inPod ? 10 : 0) * (1 - R.walkAmt) - hy + 38 * al) * L.k;   // bubble anchor: just above the antenna
}
