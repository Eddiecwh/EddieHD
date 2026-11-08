/* EddieHD — Eddie's face: expressions as numbers, blinking, drawing the face on his screen. Also owns the page canvas (cv, ctx).
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   1. FACE — expressions are numbers that ease toward a target.
      drawn inside Eddie's head screen, turned with his head.
   ============================================================ */
const SCREEN = '#070a0f';
const BASE = { open: 1, w: 1, h: 1, smile: 0, drop: 0, tilt: 0, mouth: .25, mouthOpen: 0, mouthW: 1, lookX: 0, lookY: 0, color: '#5ef2e0', hearts: 0 };
const EXPR = {
  neutral: {},
  happy: { smile: 1, mouth: .9, mouthOpen: .12 },
  focused: { open: .8, drop: .3, mouth: .05, mouthW: .7 },
  listening: { h: 1.12, mouth: .15, mouthW: .6, lookY: -.2 },
  suspicious: { drop: .52, tilt: .2, mouth: -.15, mouthW: .6, lookX: .5, color: '#ffb547' },
  angry: { drop: .32, tilt: .95, mouth: -.75, mouthW: .85, color: '#ff5d5d' },
  sad: { drop: .22, tilt: -.85, mouth: -.6, mouthW: .7, lookY: .35, color: '#7aa7ff' },
  surprised: { w: .85, h: 1.25, mouth: 0, mouthOpen: .75, mouthW: .35 },
  sleepy: { open: .12, mouth: .05, mouthW: .5, color: '#7aa7ff' },
  love: { hearts: 1, mouth: .9, mouthOpen: .1, color: '#ff7ab8' },
  proud: { smile: 1, mouth: 1, mouthOpen: .35, color: '#7be495' },
  charging: { smile: 1, open: .6, mouth: .45, mouthW: .6, color: '#7be495' },
};
const cur = { ...BASE };
let target = { ...BASE }, exprName = 'neutral', talking = false, blink = 1, nextBlink = performance.now() + 2500;
let trackX = 0;
function setExpr(name) { exprName = name; target = { ...BASE, ...EXPR[name] }; }
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
let curRGB = hex(BASE.color);

const cv = $('world'), ctx = cv.getContext('2d');
let DPR = 1;
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
function heart(cx, cy, s) {
  ctx.beginPath(); ctx.moveTo(cx, cy + s * .35);
  ctx.bezierCurveTo(cx - s * 1.1, cy - s * .35, cx - s * .45, cy - s * 1.05, cx, cy - s * .45);
  ctx.bezierCurveTo(cx + s * .45, cy - s * 1.05, cx + s * 1.1, cy - s * .35, cx, cy + s * .35); ctx.fill();
}
// x,y,W,H: screen box in robot units; turn: -1 left … 0 front … 1 right; px: device pixels per unit (for glow)
function drawFace(X, Y, W, H, turn, t, px) {
  const col = `rgb(${curRGB.map(Math.round).join(',')})`;
  const at = Math.abs(turn), ox = turn * W * .2 + (cur.lookX + trackX * (1 - at)) * W * .05, oy = cur.lookY * H * .06;
  const sq = 1 - at * .35;                                 // features squash as the head turns
  const ew = W * .085 * cur.w * sq, eh = Math.max(H * .03, H * .34 * cur.h * cur.open * (exprName === 'sleepy' ? 1 : blink));
  const gap = W * .17 * (1 - at * .3);
  ctx.save(); rr(X, Y, W, H, W * .16); ctx.clip();
  for (const [dx, inner] of [[-gap, 1], [gap, -1]]) {
    const cx = X + W / 2 + ox + dx, cy = Y + H * .43 + oy;
    ctx.shadowColor = col; ctx.shadowBlur = W * .12 * px; ctx.fillStyle = col;
    if (cur.hearts > .5) { heart(cx, cy, W * .11 * sq * (1 + .06 * Math.sin(t / 180))); continue; }
    rr(cx - ew, cy - eh / 2, ew * 2, eh, ew * .9); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = SCREEN;
    const top = cy - eh / 2;
    if (cur.drop > .01 || Math.abs(cur.tilt) > .01) {
      const yOut = top + eh * (cur.drop - cur.tilt * .35), yIn = top + eh * (cur.drop + cur.tilt * .35);
      const xOut = cx - inner * ew * 1.4, xIn = cx + inner * ew * 1.4;
      ctx.beginPath(); ctx.moveTo(xOut, top - eh); ctx.lineTo(xIn, top - eh); ctx.lineTo(xIn, yIn); ctx.lineTo(xOut, yOut); ctx.fill();
    }
    if (cur.smile > .01) { ctx.beginPath(); ctx.ellipse(cx, cy + eh * .85 + (1 - cur.smile) * eh * 1.3, ew * 1.5, eh * .72, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.shadowColor = col; ctx.shadowBlur = W * .1 * px; ctx.strokeStyle = col; ctx.fillStyle = col;
  const mx = X + W / 2 + ox * 1.1, my = Y + H * .76 + oy * .5, mw = W * .15 * cur.mouthW * sq, curve = cur.mouth * H * .1;
  const open = cur.mouthOpen + (curSrc ? level * 1.1 : talking ? (.25 + .25 * Math.sin(t / 55) * Math.sin(t / 130)) : 0);
  ctx.lineWidth = W * .035; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(mx - mw, my); ctx.quadraticCurveTo(mx, my + curve, mx + mw, my);
  if (open > .03) { ctx.quadraticCurveTo(mx, my + curve + open * H * .2, mx - mw, my); ctx.fill(); } else ctx.stroke();
  ctx.restore(); ctx.shadowBlur = 0;
}
