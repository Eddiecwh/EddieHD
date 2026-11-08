/* EddieHD — Backdrops: the painted scenery behind Eddie (default, café, park, library).
   Each scene is painted once into its own offscreen canvas and reused every frame (repainted when the window resizes).
   A few small things move on top of the painting (steam, fireflies, dust): that's the scene's `ambient`.
   Painters work in CSS pixels: W × H window, F = floor line, k = Eddie's scale (1 unit = k px), r = seeded random.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

const SCENES = {
  default: { paint: paintDefault },
  cafe: { paint: paintCafe, ambient: cafeAmbient },
  park: { paint: paintPark, ambient: parkAmbient },
  library: { paint: paintLibrary, ambient: libraryAmbient },
};

// same "random" layout every time (books, stars, bokeh don't jump around on resize)
function seeded(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const sceneCache = {};
function sceneCanvas(name) {
  const key = cv.width + 'x' + cv.height + '@' + L.floorY;
  const hit = sceneCache[name];
  if (hit && hit.key === key) return hit.c;
  const c = hit ? hit.c : document.createElement('canvas');
  c.width = cv.width; c.height = cv.height;
  const g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const W = innerWidth, H = innerHeight;
  SCENES[name].paint(g, W, H, L.floorY, L.k, seeded(name.length * 7919 + name.charCodeAt(0)));
  if (name !== 'default') calm(g, W, H, L.floorY);
  sceneCache[name] = { key, c };
  return c;
}

// draw a scene; clip = [x0, x1] in CSS px to draw only that strip (used while a new set slides in)
function drawScene(name, t, clip) {
  if (!cv.width || !cv.height) return;                                  // window not laid out yet
  ctx.save();
  if (clip) { ctx.beginPath(); ctx.rect(clip[0] * DPR, 0, (clip[1] - clip[0]) * DPR, cv.height); ctx.clip(); }
  ctx.drawImage(sceneCanvas(name), 0, 0);
  const sc = SCENES[name], args = [ctx, innerWidth, innerHeight, L.floorY, L.k, t / 1000];
  ctx.scale(DPR, DPR);
  if (sc.ambient) sc.ambient(...args);                                 // small moving bits (steam, fireflies, dust)
  if (sc.back) sc.back(...args);                                       // furniture behind Eddie (the dog)
  drawRain(name, ...args);                                             // rain.js
  ctx.restore();
}

// keep the timer readable: soft dark pool behind it, darker corners
function calm(g, W, H, F) {
  const top = 56, bot = F - L.size * 1.25, cy = (top + bot) / 2;
  g.save(); g.translate(W / 2, cy); g.scale(1, .6);
  const rad = Math.max(W * .45, 280), rg = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  rg.addColorStop(0, 'rgba(8,11,16,.62)'); rg.addColorStop(.6, 'rgba(8,11,16,.35)'); rg.addColorStop(1, 'rgba(8,11,16,0)');
  g.fillStyle = rg; g.fillRect(-rad, -rad, rad * 2, rad * 2); g.restore();
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .62);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}

const glow = (g, x, y, r, col, a) => {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
};
const box = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

/* ---------- default: the dark studio with a glowing floor line ---------- */
function paintDefault(g, W, H, F) {
  box(g, 0, 0, W, H, '#0b0f15');
  const fg = g.createLinearGradient(0, F, 0, H);
  fg.addColorStop(0, 'rgba(94,242,224,.06)'); fg.addColorStop(1, 'rgba(94,242,224,0)');
  box(g, 0, F, W, H - F, fg);
  const lg = g.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'rgba(94,242,224,0)'); lg.addColorStop(.5, 'rgba(94,242,224,.35)'); lg.addColorStop(1, 'rgba(94,242,224,0)');
  box(g, 0, F, W, 1, lg);
}

/* ---------- café: evening, warm lamps, rainy street through the window, counter on the right ---------- */
const CAFE = { ink: 0 };                                      // where things are in the café (filled in when painted)
function paintCafe(g, W, H, F, k, r) {
  const wall = g.createLinearGradient(0, 0, 0, F);
  wall.addColorStop(0, '#2c201b'); wall.addColorStop(1, '#1e1613');
  box(g, 0, 0, W, F, wall);
  for (let x = 0; x < W; x += 36) box(g, x, 0, 14, F, 'rgba(255,220,180,.02)');        // wallpaper stripes

  // wainscot (wood panelling along the bottom of the wall)
  const y0 = F - clamp(H * .2, 90, 160);
  box(g, 0, y0, W, F - y0, '#221712');
  for (let x = 10; x < W; x += 64) { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; g.strokeRect(x, y0 + 16, 50, F - y0 - 28); }
  box(g, 0, y0 - 4, W, 10, '#3b2a20'); box(g, 0, y0 - 4, W, 2, 'rgba(255,210,160,.12)');

  // window onto a wet night street (left)
  const ww = clamp(W * .24, 150, 380), wx = W * .05, wy = H * .15, wh = Math.max(80, y0 - wy - 26);
  const sky = g.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#0c1626'); sky.addColorStop(1, '#1a2133');
  box(g, wx, wy, ww, wh, sky);
  g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
  for (let i = 0; i < 5; i++) { const bw = 30 + r() * 60, bh = wh * (.3 + r() * .5); box(g, wx + r() * ww, wy + wh - bh, bw, bh, '#0a101b'); }   // buildings
  for (let i = 0; i < 34; i++) {                                                        // blurry street lights
    const col = ['255,180,90', '255,120,90', '110,210,255', '255,220,150'][Math.floor(r() * 4)];
    glow(g, wx + r() * ww, wy + wh * (.35 + r() * .65), 6 + r() * 18, col, .12 + r() * .22);
  }
  g.strokeStyle = 'rgba(180,200,255,.07)'; g.lineWidth = 1;                             // rain streaks on the glass
  for (let i = 0; i < 40; i++) { const x = wx + r() * ww, y = wy + r() * wh; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 14 + r() * 20); g.stroke(); }
  g.restore();
  g.strokeStyle = '#3b2a20'; g.lineWidth = 10; g.strokeRect(wx, wy, ww, wh);
  g.lineWidth = 6; g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.moveTo(wx, wy + wh * .45); g.lineTo(wx + ww, wy + wh * .45); g.stroke();
  box(g, wx - 12, wy + wh + 2, ww + 24, 9, '#4a3428');                                   // sill
  CAFE.win = { x: wx, y: wy, w: ww, h: wh };

  // chalkboard menu (right, up high)
  const bw = clamp(W * .17, 110, 240), bh = bw * .72, bx = W * .93 - bw, by = H * .14;
  box(g, bx - 8, by - 8, bw + 16, bh + 16, '#4a3428'); box(g, bx, by, bw, bh, '#1c2421');
  g.fillStyle = 'rgba(240,236,226,.55)'; g.font = `600 ${Math.round(bw * .13)}px Fredoka, sans-serif`; g.textAlign = 'center';
  g.fillText('today', bx + bw / 2, by + bh * .24);
  g.strokeStyle = 'rgba(240,236,226,.3)'; g.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const yy = by + bh * (.4 + i * .14), w1 = bw * (.3 + r() * .25);
    g.beginPath(); g.moveTo(bx + bw * .12, yy); g.lineTo(bx + bw * .12 + w1, yy); g.stroke();
    g.beginPath(); g.moveTo(bx + bw * .78, yy); g.lineTo(bx + bw * .88, yy); g.stroke();
  }

  // hanging lamps
  for (const fx of [.2, .5, .8]) {
    const lx = W * fx, cord = H * (.05 + r() * .03), sw = clamp(W * .045, 34, 60);
    glow(g, lx, cord + sw * .5, Math.min(W, H) * .32, '255,170,90', .16);
    g.strokeStyle = '#120c0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, cord); g.stroke();
    g.fillStyle = '#5a3b26'; g.beginPath(); g.moveTo(lx - sw * .18, cord); g.lineTo(lx + sw * .18, cord); g.lineTo(lx + sw / 2, cord + sw * .45); g.lineTo(lx - sw / 2, cord + sw * .45); g.closePath(); g.fill();
    g.fillStyle = '#ffd59a'; g.beginPath(); g.ellipse(lx, cord + sw * .45, sw * .3, sw * .08, 0, 0, 2 * PI); g.fill();
  }

  // counter behind Eddie (right), with an espresso machine and a cup
  const cx0 = W * .64, ch = 118 * k, cy0 = F - ch;
  box(g, cx0, cy0, W - cx0, ch, '#2f2018');
  for (let x = cx0 + 16; x < W; x += 54) { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; g.strokeRect(x, cy0 + 22 * k, 40, ch - 34 * k); }
  box(g, cx0 - 8, cy0 - 10 * k, W - cx0 + 8, 12 * k, '#4d3627'); box(g, cx0 - 8, cy0 - 10 * k, W - cx0 + 8, 2, 'rgba(255,210,160,.18)');
  const mx = cx0 + 40 * k, mw = 78 * k, mh = 68 * k, mt = cy0 - 10 * k - mh;
  box(g, mx, mt, mw, mh, '#6d727b'); box(g, mx, mt, mw, 10 * k, '#8b9099'); box(g, mx + 6 * k, mt + 14 * k, mw - 12 * k, 18 * k, '#3a3e45');
  box(g, mx + mw * .3, mt + mh * .55, 6 * k, 14 * k, '#2a2d33'); box(g, mx + mw * .62, mt + mh * .55, 6 * k, 14 * k, '#2a2d33');
  glow(g, mx + mw * .5, mt + 22 * k, 10 * k, '120,255,200', .5);
  const cupX = mx + mw + 34 * k, cupY = cy0 - 10 * k;
  box(g, cupX - 10 * k, cupY - 18 * k, 20 * k, 18 * k, '#e9e2d4');
  g.strokeStyle = '#e9e2d4'; g.lineWidth = 3 * k; g.beginPath(); g.arc(cupX + 12 * k, cupY - 10 * k, 5 * k, -PI / 2, PI / 2); g.stroke();
  Object.assign(CAFE, { cupX, cupY: cupY - 20 * k, k, table: { x: clamp(W * .42, L.minX, L.maxX) }, cupDX: -24 });

  // wooden floor boards
  box(g, 0, F, W, H - F, '#2a1c15');
  let y = F, row = 0;
  while (y < H) {
    const h = 8 + row * 5; row++;
    g.fillStyle = row % 2 ? 'rgba(255,200,150,.03)' : 'rgba(0,0,0,.12)'; g.fillRect(0, y, W, h);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, W, 1);
    for (let x = r() * 140; x < W; x += 120 + r() * 120) g.fillRect(x, y, 1, h);
    y += h;
  }
}
function cafeAmbient(g, W, H, F, k, t) {
  const { cupX, cupY } = CAFE; if (cupX == null) return;
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2 * k; g.lineCap = 'round';
  for (let i = 0; i < 2; i++) {                                                         // steam curling off the cup
    const ph = (t * .5 + i * .5) % 1;
    g.globalAlpha = Math.sin(ph * PI);
    g.beginPath();
    for (let s = 0; s <= 1; s += .1) { const yy = cupY - s * 34 * k - ph * 10 * k, xx = cupX + (i ? 4 : -4) * k + Math.sin(s * 6 + t * 2 + i) * 4 * k; s ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
  }
  g.globalAlpha = 1;
}

/* ---------- park: dusk, moon, hills, trees, a lamp post and a bench ---------- */
const PARK = {};                                              // bench seat and dog position (filled in when painted)
function paintPark(g, W, H, F, k, r) {
  const sky = g.createLinearGradient(0, 0, 0, F);
  sky.addColorStop(0, '#0a1230'); sky.addColorStop(.6, '#1b2552'); sky.addColorStop(1, '#3d3765');
  box(g, 0, 0, W, F, sky);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,240,${.15 + r() * .6})`; g.beginPath(); g.arc(r() * W, r() * F * .6, .5 + r() * 1.2, 0, 2 * PI); g.fill(); }
  const mx = W * .82, my = H * .17, mr = clamp(W * .028, 16, 38);
  glow(g, mx, my, mr * 6, '240,230,200', .14);
  g.fillStyle = '#efe7cf'; g.beginPath(); g.arc(mx, my, mr, 0, 2 * PI); g.fill();
  g.fillStyle = 'rgba(0,0,0,.07)'; for (const [dx, dy, rr2] of [[-.3, -.2, .22], [.25, .2, .16], [.1, -.35, .1]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, rr2 * mr, 0, 2 * PI); g.fill(); }

  // rolling hills, far to near
  const hill = (base, amp, col, seed) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, F);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, base - amp * (Math.sin(x / W * 5 + seed) * .6 + Math.sin(x / W * 11 + seed * 2) * .4));
    g.lineTo(W, F); g.closePath(); g.fill();
  };
  hill(F - H * .2, H * .06, '#28294d', 1.3); hill(F - H * .12, H * .05, '#1d2a3c', 4.1); hill(F - H * .05, H * .03, '#15231f', 2.2);

  // trees: trunk + clump of round leaves
  const tree = (x, h) => {
    box(g, x - 7 * k, F - h, 14 * k, h, '#0e1611');
    for (let i = 0; i < 7; i++) {
      const a = r() * PI * 2, d = r() * h * .22;
      g.fillStyle = i % 2 ? '#13241b' : '#172b20';
      g.beginPath(); g.arc(x + Math.cos(a) * d, F - h - h * .1 + Math.sin(a) * d * .7, h * (.17 + r() * .1), 0, 2 * PI); g.fill();
    }
  };
  tree(W * .06, 330 * k); tree(W * .15, 260 * k); tree(W * .9, 360 * k); tree(W * .99, 280 * k);

  // lamp post with a pool of light, and a bench beside it
  const lx = W * .28, lh = 300 * k;
  glow(g, lx, F - lh + 10 * k, 160 * k, '255,200,120', .22);
  g.save(); g.translate(lx, F); g.scale(1, .18); glow(g, 0, 0, 170 * k, '255,200,120', .25); g.restore();
  box(g, lx - 4 * k, F - lh, 8 * k, lh, '#161b22'); box(g, lx - 12 * k, F - 10 * k, 24 * k, 10 * k, '#161b22');
  g.fillStyle = '#161b22'; g.beginPath(); g.moveTo(lx - 16 * k, F - lh); g.lineTo(lx + 16 * k, F - lh); g.lineTo(lx + 9 * k, F - lh - 22 * k); g.lineTo(lx - 9 * k, F - lh - 22 * k); g.closePath(); g.fill();
  g.fillStyle = '#ffd99a'; g.fillRect(lx - 9 * k, F - lh - 18 * k, 18 * k, 16 * k);
  const bx = lx + 40 * k, bw = 140 * k;
  for (const yy of [-62, -50, -34]) box(g, bx, F + yy * k, bw, 7 * k, '#1a1712');
  for (const xx of [10, bw / k - 18]) box(g, bx + xx * k, F - 62 * k, 8 * k, 62 * k, '#141210');
  Object.assign(PARK, { seatX: bx + bw - 40 * k, seat: 8, dogOX: bx + bw + 30 * k, dogX: bx + bw + 20 * k });   // Eddie sits at the right end, dog beside him

  // grass, with tufts along the horizon
  const gr = g.createLinearGradient(0, F, 0, H);
  gr.addColorStop(0, '#16291d'); gr.addColorStop(1, '#0b140e');
  box(g, 0, F, W, H - F, gr);
  g.fillStyle = '#1f3a28';
  for (let x = 0; x < W; x += 5 + r() * 7) { const h = (4 + r() * 9) * Math.max(.7, k); g.beginPath(); g.moveTo(x - 2, F + 1); g.lineTo(x + r() * 4 - 2, F - h); g.lineTo(x + 2, F + 1); g.closePath(); g.fill(); }
}
function parkAmbient(g, W, H, F, k, t) {
  for (let i = 0; i < 16; i++) {                                                        // fireflies drifting about
    const x = (W * ((i * .137 + .05) % 1)) + Math.sin(t * .4 + i * 1.7) * 40;
    const y = F - 40 * k - ((i * 53) % 220) * k - Math.sin(t * .6 + i) * 18;
    const a = (.25 + .75 * Math.max(0, Math.sin(t * 1.3 + i * 2.1))) * (1 - RAIN.amt * .9);   // they hide when it rains
    glow(g, x, y, 9, '200,255,140', .5 * a);
    g.fillStyle = `rgba(230,255,180,${a})`; g.beginPath(); g.arc(x, y, 1.6, 0, 2 * PI); g.fill();
  }
}

/* ---------- library: tall shelves both sides, a moonlit arched window, carpet ---------- */
const LIB = {};                                               // where things are in the library (filled in when painted)
function paintLibrary(g, W, H, F, k, r) {
  const wall = g.createLinearGradient(0, 0, 0, F);
  wall.addColorStop(0, '#1b1512'); wall.addColorStop(1, '#130f0d');
  box(g, 0, 0, W, F, wall);

  // arched window (middle) with a shaft of moonlight
  const ww = clamp(W * .2, 140, 300), wx = W / 2 - ww / 2, wt = H * .1, wb = F - 150 * k;
  const arch = () => { g.beginPath(); g.moveTo(wx, wb); g.lineTo(wx, wt + ww / 2); g.arc(W / 2, wt + ww / 2, ww / 2, PI, 0); g.lineTo(wx + ww, wb); g.closePath(); };
  const sky = g.createLinearGradient(0, wt, 0, wb);
  sky.addColorStop(0, '#13213d'); sky.addColorStop(1, '#22365a');
  arch(); g.fillStyle = sky; g.fill();
  g.save(); arch(); g.clip();
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,255,255,${.2 + r() * .5})`; g.fillRect(wx + r() * ww, wt + r() * (wb - wt) * .7, 1.3, 1.3); }
  g.restore();
  g.strokeStyle = '#2e2018'; g.lineWidth = 9; arch(); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(W / 2, wt); g.lineTo(W / 2, wb);
  for (let yy = wt + ww / 2; yy < wb; yy += (wb - wt) / 4) { g.moveTo(wx, yy); g.lineTo(wx + ww, yy); }
  g.stroke();
  g.fillStyle = 'rgba(140,170,255,.045)';
  g.beginPath(); g.moveTo(wx, wb); g.lineTo(wx + ww, wb); g.lineTo(wx + ww * 1.7, F); g.lineTo(wx + ww * .3, F); g.closePath(); g.fill();
  Object.assign(LIB, { x0: wx + ww * .2, x1: wx + ww * 1.5, y0: wb, y1: F, win: { wx, wt, ww, wb } });

  // bookshelves, floor to ceiling
  const shelf = (x0, x1) => {
    box(g, x0, 0, x1 - x0, F, '#24180f');
    const sh = clamp(H * .13, 64, 120), side = 14;
    box(g, x0, 0, side, F, '#2f2015'); box(g, x1 - side, 0, side, F, '#2f2015');
    const cols = ['#5b2a2a', '#2f4a3a', '#2a3a5a', '#6b5233', '#4a2f4f', '#7a6a4a', '#3d2b22', '#55443a', '#3a4d4f', '#6a3b2e'];
    for (let top = H * .05; top + sh <= F + 2; top += sh) {
      const base = top + sh - 10;
      box(g, x0, base, x1 - x0, 10, '#3a281b'); box(g, x0, base, x1 - x0, 2, 'rgba(255,210,160,.08)');
      box(g, x0 + side, top, x1 - x0 - side * 2, 10, 'rgba(0,0,0,.25)');                  // shadow under the shelf above
      let x = x0 + side + 2;
      while (x < x1 - side - 8) {
        if (r() < .06) { x += 10 + r() * 20; continue; }                                  // gap
        const bw = 8 + r() * 14, bh = (sh - 20) * (.62 + r() * .32), col = cols[Math.floor(r() * cols.length)];
        if (x + bw > x1 - side) break;
        if (r() < .05 && x + bh * .5 < x1 - side) {                                        // one leaning over
          g.save(); g.translate(x, base); g.rotate(.32); box(g, 0, -bh, bw, bh, col); g.restore(); x += bh * .35 + bw; continue;
        }
        box(g, x, base - bh, bw, bh, col);
        box(g, x, base - bh, bw, bh, `rgba(0,0,0,${r() * .25})`);
        g.fillStyle = 'rgba(225,190,120,.35)'; g.fillRect(x + 1, base - bh * .82, bw - 2, 2); g.fillRect(x + 1, base - bh * .25, bw - 2, 2);
        x += bw + 1;
      }
    }
  };
  const sw = clamp(W * .28, 120, 460);
  shelf(-4, sw); shelf(W - sw, W + 4);

  // rolling ladder against the right shelves
  const lx = W - sw + 40, lt = H * .18;
  g.strokeStyle = '#4a321f'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(lx, lt); g.lineTo(lx - 50, F); g.moveTo(lx + 44, lt); g.lineTo(lx - 6, F); g.stroke();
  LIB.ladder = { bx: lx - 28, tx: lx + 22, by: F, ty: lt, h: Math.min(135, (F - lt) / k * .55) };   // centre line, bottom → top; h = how high Eddie climbs
  g.lineWidth = 4; for (let yy = lt + 30; yy < F - 10; yy += 34) { const f = (yy - lt) / (F - lt); g.beginPath(); g.moveTo(lx - f * 50, yy); g.lineTo(lx + 44 - f * 50, yy); g.stroke(); }

  // carpet
  const cp = g.createLinearGradient(0, F, 0, H);
  cp.addColorStop(0, '#2b1519'); cp.addColorStop(1, '#1a0c0f');
  box(g, 0, F, W, H - F, cp);
  box(g, 0, F + 6, W, 2, 'rgba(210,160,90,.18)'); box(g, 0, F + 12, W, 1, 'rgba(210,160,90,.1)');
  g.strokeStyle = 'rgba(210,160,90,.06)'; g.lineWidth = 1;
  for (let x = -40; x < W + 40; x += 40) { g.beginPath(); g.moveTo(x, F + 18); g.lineTo(x + 20, H); g.moveTo(x + 40, F + 18); g.lineTo(x + 20, H); g.stroke(); }
}
function libraryAmbient(g, W, H, F, k, t) {
  const { x0, x1, y0, y1 } = LIB; if (x0 == null) return;
  for (let i = 0; i < 22; i++) {                                                        // dust floating in the moonlight
    const fx = ((i * .618 + t * .012 * (1 + i % 3)) % 1), fy = ((i * .37 + t * .02) % 1);
    const y = y0 + (y1 - y0) * fy, x = lerp(x0, x1, fx) + (y - y0) * .3 + Math.sin(t + i) * 6;
    g.fillStyle = `rgba(200,215,255,${.25 * Math.sin(fy * PI)})`;
    g.beginPath(); g.arc(x, y, 1.3, 0, 2 * PI); g.fill();
  }
}
