/* EddieHD — What Eddie does: activities per timer mode, walking/running, turning, attention, packing up and popping out.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* --- activities -------------------------------------------------------- */
const ACTS = {
  focus: [['work', 6], ['wander', 2], ['look', 1]],                   // work = this scene's job (work.js)
  break: [['charge', 1]],
  idle: [['wander', 3], ['look', 2], ['sit', 2], ['dance', 1], ['stretch', 1]],
};
const DUR = { look: [3000, 3000], sit: [9000, 7000], dance: [6000, 5000], stretch: [4600, 0], wander: [Infinity, 0], sleep: [Infinity, 0], charge: [Infinity, 0] };
function weighted(list) { let n = Math.random() * list.reduce((a, [, w]) => a + w, 0); for (const [k, w] of list) { if ((n -= w) < 0) return k; } return list[0][0]; }
function setAct(a, now) {
  const from = R.act;
  R.act = a; R.stepT = now; R.tx = null; R.sub = ''; R.spotX = 0;
  if (a !== 'read') R.hasBook = false;                                // book goes back on the shelf
  if (isWork(a)) R.actUntil = now + clamp(S.total * 1000 * .5, 20000, 120000) + Math.random() * 15000;
  else R.actUntil = now + DUR[a][0] + Math.random() * DUR[a][1];
  if (a === 'wander') R.tx = randX(isWork(from) && P.state !== 'none' ? P.x : R.x);
  if (!talking && !curSrc) setExpr(baseMood());
}
function nextAct(now) {
  if (S.paused) return setAct('sleep', now);
  let a = weighted(ACTS[S.mode] || ACTS.idle);
  if (a === 'work') a = workAct();
  if ((isWork(a) || a === 'charge') && R.act === a) { R.actUntil = now + 30000; return; }
  if (a === R.act && a !== 'wander') a = 'wander';
  setAct(a, now);
}
function onModeChange(prev, mode, now) {
  if (mode === 'paused') return setAct('sleep', now);
  if (mode === 'focus') return setAct(workAct(), now);
  if (mode === 'break') return setAct('charge', now);
  return setAct('wander', now);
}

/* --- per-frame update ------------------------------------------------- */
function updateRobot(dt, now) {
  const mode = S.paused ? 'paused' : S.mode;
  if (mode !== R.lastMode) { const prev = R.lastMode; R.lastMode = mode; onModeChange(prev, mode, now); }
  const staging = stageUpdate(dt, now);                                // changing scene: stagehand.js drives Eddie
  R.alert = (S.mode === 'focus' && !S.paused && (O.phoneStreak >= 2 || O.awayEpisode)) ? '!' : '';
  const attending = !staging && !!(R.alert || awaiting || talking || curSrc || now < R.attendUntil);
  const wasInPod = R.inPod;
  R.inPod = P.kind === 'pod' && P.state === 'placed' && Math.abs(R.x - P.x) < 3 && R.tx == null;

  let yawT = 0, headOff = 0, sitT = 0, typeT = 0, upT = 0, danceT = 0, liftT = 0;
  for (const h of R.hand) h.on = 0;                                    // activities re-grip every frame
  R.hold.cup = R.hold.pen = R.hold.open = 0; DOG.pet = 0;
  if (staging) { /* R.tx set by stageUpdate */ }
  else if (!attending) {
    if (now > R.actUntil) nextAct(now);
    if (S.mode === 'idle' && R.act !== 'sleep') ensureProp(null);       // no desk or pod outside a session
    switch (R.act) {
      case 'wander': if (R.tx == null) setAct('look', now); break;
      case 'look':
        if (now > R.nextGlance) { R.headOff = pick([-1.1, -.6, 0, 0, .6, 1.1]); R.nextGlance = now + 1200 + Math.random() * 1800; }
        headOff = R.headOff; break;
      case 'sit':
        sitT = 1;
        if (now > R.nextGlance) { R.headOff = pick([-.7, 0, 0, .7]); R.nextGlance = now + 2000 + Math.random() * 3000; }
        headOff = R.headOff; break;
      case 'sleep': break;                                            // paused: curls into a ball (see R.ball)
      case 'stretch': { const k = (now - R.stepT) / 4600; upT = (k > .08 && k < .78) ? 1 : 0; break; }
      case 'dance': danceT = 1; yawT = Math.sin(now / 420) * .55; break;
      case 'computer':
        if (ensureProp('desk')) {
          const standX = P.x - 32 * L.k;
          if (Math.abs(R.x - standX) > 2) { if (R.tx == null) R.tx = standX; }
          else { yawT = PI; if (Math.abs(near(R.yaw, PI) - PI) < .25) typeT = 1; }
        } else if (P.kind === 'desk' && (P.state === 'arrive' || P.state === 'release')) {
          headOff = clamp((P.x - R.x) / L.size, -1, 1) * 1.1;            // watch the delivery
        }
        break;
      case 'cafe': case 'bench': case 'read': {                         // the scene's focus job (work.js)
        const ps = { yawT, headOff, sitT, liftT };
        WORK_FN[R.act](ps, now, dt);
        ({ yawT, headOff, sitT, liftT } = ps);
        break;
      }
      case 'charge':
        if (ensureProp('pod')) {
          if (Math.abs(R.x - P.x) > 2) { P.doorT = 0; if (R.tx == null) R.tx = P.x; }
          else if (Math.abs(near(R.yaw, 0)) < .2) P.doorT = 1;        // inside and facing out: close the door
        } else if (P.kind === 'pod' && (P.state === 'arrive' || P.state === 'release')) {
          headOff = clamp((P.x - R.x) / L.size, -1, 1) * 1.1;
        }
        break;
    }
  } else {
    headOff = (R.alert && !O.person) ? Math.sin(now / 650) * .9 : 0;     // empty chair: look around for you
    if (R.act === 'sit' || (isWork(R.act) && R.act !== 'computer' && R.sit > .5)) sitT = 1;   // stay seated to listen
    if (R.act === 'bench' && R.sit > .5) liftT = PARK.seat;
    if (R.act === 'cafe' && R.sit > .5) liftT = STOOL_LIFT;
    if (R.act === 'read' && R.sit > .5) { R.hold.open = 1; grip(-1, -24, -86, 1, true); grip(1, 24, -86, -1, true); }
  }
  if (R.inPod !== wasInPod && !talking && !curSrc) setExpr(baseMood());

  // walking: turn first, then accelerate; slow down on arrival
  const maxSp = maxSpeed();
  if (!attending && R.tx != null) {
    sitT = 0;
    if (R.sit < .15 && R.ball < .1 && !R.popStart && !R.ladder) {                                  // stand up / unfold before walking
      const d = R.tx - R.x, dir = Math.sign(d) || 1;
      yawT = dir * (PI / 2 - .5);                                         // three-quarter view so his face stays visible
      const facing = Math.abs(near(R.yaw, yawT) - yawT) < .35;
      const spT = facing ? Math.min(maxSp, Math.abs(d) * 2.6 + 6 * L.k) : 0;
      R.vx = lerp(R.vx, dir * spT, Math.min(1, dt * 5));
      if (Math.abs(d) < 2.5) { R.x = R.tx; R.tx = null; R.vx = 0; R.dipV += 35 + R.run * 30; }
    }
  } else R.vx *= Math.exp(-dt * 12);

  // body turns at a capped speed; the head leads
  const yT = near(yawT, R.yaw);
  R.yaw += clamp((yT - R.yaw) * 9 * dt, -7 * dt, 7 * dt);
  const hT = near(yawT + headOff, R.headYaw);
  R.headYaw += clamp((hT - R.headYaw) * 14 * dt, -11 * dt, 11 * dt);

  const k = (rate) => Math.min(1, dt * rate);
  const spd = Math.abs(R.vx) / L.k;                                     // units per second
  R.run = lerp(R.run, clamp((spd - 85) / 50, 0, 1), k(6));              // 0 walk … 1 full run
  R.sit = lerp(R.sit, sitT, k(3));
  if (R.ladder) {                                                      // on the ladder: climb toward liftT at a steady pace
    const d = liftT - R.lift, step = 55 * dt;
    if (Math.abs(d) > .3) { R.lift += clamp(d, -step, step); R.climbPh += dt * 7; }
    if (R.lift <= .3 && liftT === 0) { R.ladder = false; R.lift = 0; }
    else { R.x = ladderX(R.lift); R.vx = 0; R.tx = null; }
    for (const i of [-1, 1]) if (!R.hand[i > 0 ? 1 : 0].on) grip(i, i * 18, -134 - 9 * Math.max(0, Math.sin(R.climbPh + (i > 0 ? PI : 0))), -i);  // hands on the rails
  } else R.lift = lerp(R.lift, liftT, k(5));
  R.climb = lerp(R.climb, R.ladder ? 1 : 0, k(8));
  updateUmbrella(dt, staging);                                          // rain in the park (rain.js)
  for (const h of R.hand) h.w = lerp(h.w, h.on, k(7));
  // paused: pack up step by step over 1.6 s. Unpaused from fully packed: pop out — a quick squash, then a jump
  // with arms and legs flung out in a star while the body unfolds in mid-air, and a bouncy landing.
  if (S.paused && !staging) { R.popStart = 0; R.spread = 0; R.popY = 0; R.ball = Math.min(1, R.ball + dt / 1.6); }
  else {
    if (R.ball > .5 && !R.popStart) { R.popStart = now; R.dipV += 30; }
    if (R.popStart) {
      const te = (now - R.popStart) / 1000, kj = clamp((te - .1) / .6, 0, 1), air = te > .1 && te < .7;
      if (te > .08) R.ball = Math.max(0, R.ball - dt / .22);
      R.popY = air ? 55 * 4 * kj * (1 - kj) : 0;
      R.spread = air ? Math.min(1, kj * 4) * Math.min(1, (1 - kj) * 3) : 0;
      if (te >= .7) { R.popStart = 0; R.popY = 0; R.spread = 0; R.dipV += 75; }
    } else R.ball = Math.max(0, R.ball - dt / 1.6);                    // only half packed: just unfold
  }
  R.typing = lerp(R.typing, typeT, k(6));
  R.armsUp = lerp(R.armsUp, upT, k(3));
  R.dance = lerp(R.dance, danceT, k(4));
  R.tilt = lerp(R.tilt, awaiting ? .14 : 0, k(6));
  const off = staging ? L.size * 4 : 0;                                  // he may walk off into the wings mid scene change
  R.x = clamp(R.x + R.vx * dt, L.minX - off, L.maxX + off);
  R.walkAmt = lerp(R.walkAmt, clamp(spd / 42, 0, 1), k(8));
  R.phase += spd * dt / (30 * (1 + R.run * .45)) * PI;                           // longer strides when running
  if (R.walkAmt < .05) R.phase = lerp(R.phase, Math.round(R.phase / PI) * PI, k(6));   // settle feet together
  R.hop = R.dance * Math.abs(Math.sin(now / 230)) * 12;
  R.dipV += (-R.dip * 160 - R.dipV * 16) * dt; R.dip += R.dipV * dt;                      // little settle on stopping
  R.wave = Math.max(0, R.wave - dt);
  // antenna: a spring that trails when walking, bops when dancing, droops when sad or sleepy
  const droop = (exprName === 'sad' || exprName === 'sleepy') ? 1.15 : 0;
  const tgt = -R.vx / (160 * L.k) * .8 + droop * (Math.sin(R.headYaw) >= 0 ? 1 : -1) + R.dance * Math.sin(now / 230) * .35;
  R.antV += (tgt - R.ant) * 70 * dt; R.antV *= Math.max(0, 1 - 7 * dt); R.ant += R.antV * dt;
}
