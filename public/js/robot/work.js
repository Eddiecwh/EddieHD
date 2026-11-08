/* EddieHD — What Eddie does during focus time, depending on the scene:
     default → works at the computer (behavior.js, the claw brings the desk)
     café    → sits at a table, writes in his notebook, sips coffee now and then
     park    → sits on the bench and pets his dog
     library → climbs the ladder, picks a book, climbs down, sits and reads
   Each one is a small step machine (R.sub) that sets a pose: where to stand, which way to face, sit, lift, and hand targets.
   Positions come from the painted scene (CAFE / PARK / LIB, filled in by backdrops.js and furniture.js).
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

const WORK = { default: 'computer', cafe: 'cafe', park: 'bench', library: 'read' };
const workAct = () => WORK[ST.cur] || 'computer';
const isWork = a => a === 'computer' || a === 'cafe' || a === 'bench' || a === 'read';

// put a hand somewhere this frame. i: -1 left, +1 right. (x, y) in Eddie's units; rel = move with his torso (sitting etc.)
function grip(i, x, y, bend = 1, rel = false) {
  const h = R.hand[i > 0 ? 1 : 0];
  h.on = 1; h.x = x; h.y = y; h.bend = bend; h.rel = rel;
}
// walk to x; true once he's standing there
function walkTo(x) {
  if (Math.abs(R.x - x) > 2) { if (R.tx == null) R.tx = x; return false; }
  return R.tx == null;
}
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };

/* --- café: table, notebook, coffee ------------------------------------- */
const TABLE_H = 64;                                     // table top, units above the floor
const STOOL_LIFT = 20;                                  // tall stool: sitting this much higher keeps his chest above the table
function workCafe(ps, now, dt) {
  ensureProp(null);
  if (!CAFE.table) return;
  if (!walkTo(CAFE.table.x)) { R.sub = ''; return; }
  ps.yawT = 0; ps.sitT = 1; ps.liftT = STOOL_LIFT;
  if (R.sit < .8) return;
  if (!R.sub) { R.sub = 'write'; R.subT = now + 5000 + Math.random() * 5000; }
  const top = -TABLE_H + R.lift;                                       // table top in his own coordinates (he's lifted)
  if (R.sub === 'write') {
    R.hold.pen = 1;
    grip(1, 14 + Math.sin(now / 520) * 7, top - 9 + Math.sin(now / 85) * 1.2, -1);   // pen scratching across the page
    grip(-1, -20, top - 8, 1);                                                     // other hand resting by the cup
    ps.headOff = Math.sin(now / 1900) * .08;
    CAFE.ink = (CAFE.ink + dt * .025) % 1;
    if (now > R.subT) { R.sub = 'sip'; R.subT = now + 3200; setExpr('happy'); }
  } else {                                                                          // sip: reach for the cup, lift, hold, put it back
    const k = 1 - (R.subT - now) / 3200;
    const up = smooth((k - .12) / .18) * (1 - smooth((k - .72) / .16));
    R.hold.cup = k > .12 && k < .9 ? 1 : 0;
    grip(-1, lerp(CAFE.cupDX, -4, up), lerp(top - 8, -88 - 30 * (1 - R.sit), up), 1);
    grip(1, 18, top - 8, -1);
    if (k >= 1) { R.sub = 'write'; R.subT = now + 6000 + Math.random() * 6000; setExpr('focused'); }
  }
}

/* --- park: bench and dog ----------------------------------------------- */
function workBench(ps, now) {
  ensureProp(null);
  if (!PARK.seatX) return;
  if (!walkTo(PARK.seatX)) { R.sub = ''; return; }
  ps.yawT = .5; ps.sitT = 1; ps.liftT = PARK.seat;                       // turned a little toward the dog, so his bent legs show
  if (R.sit < .8) return;
  if (!R.sub || now > R.subT) {
    R.sub = R.sub === 'pet' ? 'rest' : 'pet';
    R.subT = now + (R.sub === 'pet' ? 5000 + Math.random() * 4000 : 3000 + Math.random() * 3000);
    if (R.sub === 'pet' && !talking && !curSrc) setExpr('love');
    else if (!talking && !curSrc) setExpr('focused');
  }
  const dx = (PARK.dogX - R.x) / L.k;                                  // dog's head, in Eddie's units
  if (R.sub === 'pet') {
    const s = Math.sin(now / 320);
    grip(1, dx - 4 + s * 7, -DOG_HEAD + R.lift - 3 + Math.abs(s) * 2, 1);
    DOG.pet = 1;
    ps.headOff = .2;
  } else {
    if (now > R.nextGlance) { R.headOff = pick([-.5, -.5, 0, .1]); R.nextGlance = now + 1500 + Math.random() * 2000; }
    ps.headOff = R.headOff;
  }
}

/* --- library: ladder, book, read ---------------------------------------- */
const ladderX = lift => {
  const Ld = LIB.ladder, f = clamp(lift * L.k / (Ld.by - Ld.ty), 0, 1);
  return lerp(Ld.bx, Ld.tx, f);
};
function workRead(ps, now) {
  ensureProp(null);
  const Ld = LIB.ladder; if (!Ld) return;
  if (R.hasBook && (R.sub === '' || R.sub === 'climb')) R.sub = 'toSpot';
  switch (R.sub || 'climb') {
    case 'climb':                                                       // to the foot of the ladder, then up
      if (!R.ladder) { if (!walkTo(Ld.bx)) return; R.ladder = true; }
      R.sub = 'climb'; ps.yawT = PI; ps.liftT = Ld.h;
      if (R.lift >= Ld.h - .5) { R.sub = 'pick'; R.subT = now + 1600; }
      break;
    case 'pick': {                                                      // reach up to the shelf, pull one out
      ps.yawT = PI; ps.liftT = Ld.h;
      const k = 1 - (R.subT - now) / 1600;
      grip(1, 64 - 14 * Math.sin(Math.min(1, k * 1.4) * PI), -116, -1);   // out to the side (his arms are too short to reach over his head), tug, back
      if (k > .55) R.hasBook = true;
      if (k >= 1) R.sub = 'down';
      break;
    }
    case 'down':                                                        // climb down (ladder handled in behavior.js)
      ps.yawT = PI;
      if (!R.ladder) { R.sub = 'toSpot'; R.spotX = clamp(Ld.bx - L.size * (1.6 + Math.random()), L.minX, L.maxX); }
      break;
    case 'toSpot':
      if (!R.spotX) R.spotX = clamp(Ld.bx - L.size * 2, L.minX, L.maxX);
      if (walkTo(R.spotX)) R.sub = 'read';
      break;
    case 'read':                                                        // sit on the floor, book open in both hands
      ps.yawT = -.4; ps.sitT = 1;                                     // angled a little so his folded legs show
      if (R.sit > .7) {
        R.hold.open = 1;
        grip(-1, -24, -86, 1, true); grip(1, 24, -86, -1, true);
        if (now > R.flipT + 7000 + Math.random() * 400) R.flipT = now;   // turn a page every so often
        ps.headOff = Math.sin(now / 2300) * .06;
      }
      break;
  }
}

const WORK_FN = { cafe: workCafe, bench: workBench, read: workRead };
