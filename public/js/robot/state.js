/* EddieHD — Eddie's state (R), the stage prop (P), layout/sizing and small helpers used by the other robot files.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   2. EDDIE THE ROBOT — body, movement and activities.
      Units: 200 = his full height. Yaw: 0 faces you, ±π/2 side-on, π faces away.
      Activities: computer (focus: a claw drops in a desk) · charge (break: a claw
      drops in a charging pod) · wander · look · sit · stretch · dance · sleep.
      Attention ("Hey Eddie", alerts, talking) interrupts any of them; he turns
      to face you, then goes back to what he was doing.
   ============================================================ */
const PI = Math.PI;
const R = {
  x: innerWidth * .3, vx: 0, tx: null, yaw: 0, headYaw: 0, headOff: 0, nextGlance: 0,
  act: 'look', actUntil: 0, stepT: 0, lastMode: 'idle', inPod: false,
  phase: 0, walkAmt: 0, run: 0, dip: 0, dipV: 0, sit: 0, typing: 0, armsUp: 0, dance: 0, tilt: 0, ball: 0, spread: 0, popY: 0, popStart: 0,
  ant: 0, antV: 0, wave: 0, attendUntil: 0, alert: '', hop: 0, headTop: 0,
  haul: 0, haulDir: 1, handX: 0, handY: 0, shX: 0, shY: 0,  // hauling a new scene on (see stagehand.js); hand / shoulder on screen, CSS px
  lift: 0, ladder: false, climb: 0, climbPh: 0,              // lift: units off the floor (bench seat, ladder); climb: climbing pose blend
  sub: '', subT: 0, spotX: 0, hasBook: false, flipT: 0,      // steps inside a work activity (see work.js)
  // hand targets [left (i = -1), right (i = +1)]: when on, the arm bends to put the hand at (x, y) — see grip() and reach()
  hand: [{ x: 0, y: 0, bend: 1, rel: false, on: 0, w: 0 }, { x: 0, y: 0, bend: 1, rel: false, on: 0, w: 0 }],
  hl: [{ x: 0, y: 0 }, { x: 0, y: 0 }],                      // where each hand ended up this frame (Eddie's own coordinates)
  hold: { cup: 0, pen: 0, open: 0 },                         // what's in his hands this frame (items.js draws them)
  umb: 0, umbTilt: 0,                                        // umbrella: 0 put away … 1 open overhead
};
// the one prop on stage at a time (desk or pod), moved by the claw
const P = { kind: null, state: 'none', t: 0, x: 0, lift: 0, clawY: 0, closed: 1, scroll: 0, packPending: false, door: 0, doorT: 0 };
const PROPS = {
  desk: { grabX: 30, grabY: -205 },     // claw grips the monitor's handle
  pod: { grabX: 0, grabY: -292 },     // claw grips the pod's top ring
};
let L = {};
function layout() {
  DPR = devicePixelRatio || 1;
  cv.width = innerWidth * DPR; cv.height = innerHeight * DPR;
  const size = clamp(Math.min(innerWidth, innerHeight) * .24, 120, 210);    // Eddie's height in px
  const floorY = innerHeight - Math.max(48, innerHeight * .08);
  L = { size, floorY, k: size / 200, minX: Math.max(60, size * .45), maxX: innerWidth - Math.max(60, size * .45) };
  document.documentElement.style.setProperty('--floor-space', (innerHeight - floorY + size * 1.25) + 'px');   // Eddie's full height incl. antenna
  R.x = clamp(R.x, L.minX, L.maxX);
}
addEventListener('resize', layout);

const ease = { out: k => 1 - Math.pow(1 - k, 3), in: k => k * k * k };
const near = (a, ref) => { while (a - ref > PI) a -= 2 * PI; while (a - ref < -PI) a += 2 * PI; return a; };
function statusColor() {
  if (R.alert) return '#ff5d5d';
  if (S.paused) return '#ffb547';
  return S.mode === 'break' ? '#7be495' : '#5ef2e0';
}
function attend(ms) { R.attendUntil = Math.max(R.attendUntil, performance.now() + ms); }
// heading somewhere with purpose (desk, pod, getting out of the way) = run
const maxSpeed = () => ST.phase ? stageSpeed() : ((isWork(R.act) || R.act === 'charge') ? 160 : 70) * L.k;
function randX(avoid) {
  let x, n = 0;
  do { x = L.minX + Math.random() * (L.maxX - L.minX); } while (avoid != null && Math.abs(x - avoid) < L.size * 1.1 && ++n < 25);
  return x;
}
