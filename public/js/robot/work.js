/* EddieHD — What Eddie does during focus time, depending on the scene. Each scene's job mixes a few small "bits"
   so he isn't doing one thing on repeat:
     default → at the computer (the claw brings the desk): type · think, hand on chin · stretch · pace and come back
     café    → at a table: write in his notebook · sip coffee · stir it · get up and look out of the window
     park    → on the bench: pet the dog · rest and look around · give the dog a treat · walk out and look at the moon through binoculars
     library → climbs the ladder for a book, reads it lying open on the desk under the lamp: read · take notes · stretch ·
               now and then puts it back and fetches another
   Each job is a small step machine (R.sub) that sets a pose: where to stand, which way to face, sit, lift, hand targets,
   typing, arms up, head tilt. Positions come from the painted scene (CAFE / PARK / LIB, filled in by backdrops.js).
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

const WORK = {
  default: "computer",
  cafe: "cafe",
  park: "bench",
  library: "read",
};
const workAct = () => WORK[ST.cur] || "computer";
const isWork = (a) =>
  a === "computer" || a === "cafe" || a === "bench" || a === "read";

// put a hand somewhere this frame. i: -1 left, +1 right. (x, y) in Eddie's units; rel = move with his torso (sitting etc.)
function grip(i, x, y, bend = 1, rel = false) {
  const h = R.hand[i > 0 ? 1 : 0];
  h.on = 1;
  h.x = x;
  h.y = y;
  h.bend = bend;
  h.rel = rel;
}
// walk to x; true once he's standing there
function walkTo(x) {
  x = clamp(x, L.minX, L.maxX); // never somewhere he can't get to (narrow screens)
  if (Math.abs(R.x - x) > 2) {
    if (R.tx == null) R.tx = x;
    return false;
  }
  return R.tx == null;
}
const smooth = (k) => {
  k = clamp(k, 0, 1);
  return k * k * (3 - 2 * k);
};
const bitK = (now, len) => clamp(1 - (R.subT - now) / len, 0, 1); // 0 → 1 through the current bit
// pick the next bit: table = { name: [weight, minMs, extraMs] }; never the same one twice in a row unless it's the only one
function nextBit(table, now, avoid = R.sub) {
  const names = Object.keys(table).filter((n) => n !== avoid);
  const list = names.length ? names : Object.keys(table);
  let n = Math.random() * list.reduce((a, k) => a + table[k][0], 0),
    name = list[0];
  for (const k of list) {
    if ((n -= table[k][0]) < 0) {
      name = k;
      break;
    }
  }
  const [, min, extra] = table[name];
  R.sub = name;
  R.subLen = min + Math.random() * extra;
  R.subT = now + R.subLen;
  R.outPh = "";
  return name;
}
// a little trip away from his seat: walk to target, stay there for stayMs, walk back home.
// Returns 'go' | 'stay' | 'back' | 'done'. Standing up / sitting down is automatic (walking clears sit).
function outing(now, target, stayMs, home) {
  if (!R.outPh) R.outPh = "go";
  if (R.outPh === "go") {
    if (walkTo(target)) {
      R.outPh = "stay";
      R.subT = now + stayMs;
    }
    return "go";
  }
  if (R.outPh === "stay") {
    if (now < R.subT) return "stay";
    R.outPh = "back";
  }
  if (walkTo(home)) {
    R.outPh = "";
    return "done";
  }
  return "back";
}

/* --- default: the computer ---------------------------------------------- */
// typing is the main thing; between stretches of typing he thinks, stretches or paces
const COMPUTER_BITS = {
  think: [3, 3200, 1500],
  stretch: [2, 2800, 600],
  pace: [2, 0, 0],
};
function workComputer(ps, now) {
  if (!ensureProp("desk")) {
    if (P.kind === "desk" && (P.state === "arrive" || P.state === "release"))
      ps.headOff = clamp((P.x - R.x) / L.size, -1, 1) * 1.1; // watch the delivery
    R.sub = "";
    return;
  }
  const standX = P.x - 32 * L.k;
  if (R.sub === "pace") {
    // a few steps away, a look back, then back to the desk
    if (!R.spotX)
      R.spotX = clamp(
        standX +
          (standX > innerWidth / 2 ? -1 : 1) *
            L.size *
            (1.1 + Math.random() * 0.6),
        L.minX,
        L.maxX,
      );
    if (R.spotX !== -1) {
      if (walkTo(R.spotX)) {
        R.spotX = -1;
        R.subT = now + 1600;
      }
      return;
    }
    ps.headOff = clamp((P.x - R.x) / L.size, -1, 1) * 0.9;
    if (now < R.subT) return;
    R.spotX = 0;
    R.sub = "type";
    R.subT = now + 9000 + Math.random() * 7000;
  }
  if (!walkTo(standX)) return;
  ps.yawT = PI;
  if (Math.abs(near(R.yaw, PI) - PI) > 0.25) return;
  if (!R.sub) {
    R.sub = "type";
    R.subT = now + 8000 + Math.random() * 7000;
  }
  if (now > R.subT) {
    if (R.sub === "type") {
      nextBit(COMPUTER_BITS, now);
      if (R.sub === "think" && !talking) setExpr("suspicious");
    } else {
      R.sub = "type";
      R.subT = now + 9000 + Math.random() * 7000;
      if (!talking) setExpr("focused");
    }
  }
  if (R.sub === "type") ps.typeT = 1;
  else if (R.sub === "think") {
    // turns his head to the side, hand to his chin
    ps.headOff = -1.1;
    ps.tiltT = 0.12;
    grip(1, 8, -120, -1, true);
  } else if (R.sub === "stretch") ps.upT = bitK(now, R.subLen) < 0.85 ? 1 : 0;
}

/* --- café: table, notebook, coffee ------------------------------------- */
const TABLE_H = 64; // table top, units above the floor
const STOOL_LIFT = 20; // tall stool: sitting this much higher keeps his chest above the table
const CAFE_BITS = {
  sip: [3, 3200, 0],
  stir: [2, 3000, 800],
  gaze: [2, 5000, 3000],
}; // gaze: how long he stays at the window
function workCafe(ps, now, dt) {
  ensureProp(null);
  if (!CAFE.table) return;
  if (R.sub === "gaze") {
    // gets up, goes to the window, looks out, comes back
    const wx = clamp(
      CAFE.win ? CAFE.win.x + CAFE.win.w / 2 : R.x,
      L.minX,
      L.maxX,
    );
    const ph = outing(now, wx, R.subLen, CAFE.table.x);
    if (ph === "stay") {
      ps.yawT = PI;
      ps.headOff = Math.sin(now / 1700) * 0.35;
    } // back to us, watching the street
    if (ph !== "done") return;
    R.sub = "write";
    R.subT = now + 6000 + Math.random() * 6000;
    if (!talking) setExpr("focused");
  }
  if (!walkTo(CAFE.table.x)) {
    R.sub = "";
    return;
  }
  ps.yawT = 0;
  ps.sitT = 1;
  ps.liftT = STOOL_LIFT;
  if (R.sit < 0.8) return;
  if (!R.sub) {
    R.sub = "write";
    R.subT = now + 5000 + Math.random() * 5000;
  }
  if (now > R.subT) {
    if (R.sub === "write") {
      nextBit(CAFE_BITS, now);
      if (!talking) setExpr("happy");
    } else {
      R.sub = "write";
      R.subT = now + 6000 + Math.random() * 6000;
      if (!talking) setExpr("focused");
    }
  }
  const top = -TABLE_H + R.lift; // table top in his own coordinates (he's lifted)
  if (R.sub === "write") {
    R.hold.pen = 1;
    grip(
      1,
      14 + Math.sin(now / 520) * 7,
      top - 9 + Math.sin(now / 85) * 1.2,
      -1,
    ); // pen scratching across the page
    grip(-1, -20, top - 8, 1); // other hand resting by the cup
    ps.headOff = Math.sin(now / 1900) * 0.08;
    CAFE.ink = (CAFE.ink + dt * 0.025) % 1;
  } else if (R.sub === "sip") {
    // reach for the cup, lift, hold, put it back
    const k = bitK(now, R.subLen);
    const up = smooth((k - 0.12) / 0.18) * (1 - smooth((k - 0.72) / 0.16));
    R.hold.cup = k > 0.12 && k < 0.9 ? 1 : 0;
    grip(
      -1,
      lerp(CAFE.cupDX, -4, up),
      lerp(top - 8, -88 - 30 * (1 - R.sit), up),
      1,
    );
    grip(1, 18, top - 8, -1);
  } else if (R.sub === "stir") {
    // spoon going round in the cup
    const a = now / 140;
    R.hold.spoon = 1;
    grip(
      1,
      CAFE.cupDX + 6 + Math.cos(a) * 3.5,
      top - 20 + Math.sin(a) * 1.2,
      -1,
    );
    grip(-1, CAFE.cupDX - 12, top - 8, 1);
    ps.headOff = -0.15;
  }
}

/* --- park: bench and dog ----------------------------------------------- */
const PARK_BITS = {
  pet: [4, 5000, 4000],
  rest: [3, 3000, 3000],
  treat: [2, 3600, 0],
  moon: [2, 5000, 2500],
}; // moon: time at the binoculars
function workBench(ps, now) {
  ensureProp(null);
  if (!PARK.seatX) return;
  if (R.sub === "moon") {
    // up off the bench, a few steps toward the moon, binoculars
    const dir = Math.sign(innerWidth * 0.82 - PARK.seatX) || 1; // the moon is painted at 82% across (backdrops.js)
    const spot = clamp(PARK.seatX + dir * L.size * 1.6, L.minX, L.maxX);
    const ph = outing(now, spot, R.subLen, PARK.seatX);
    if (ph === "stay") {
      ps.yawT = dir * (PI / 2 - 0.5);
      ps.tiltT = -dir * 0.08; // three-quarter toward the moon, head tipped up a touch
      R.hold.bino = 1;
      grip(-1, dir * 12 - 7, -132, 1);
      grip(1, dir * 12 + 7, -132, -1);
    }
    if (ph !== "done") return;
    R.sub = "rest";
    R.subT = now + 3000 + Math.random() * 2000;
    if (!talking) setExpr("happy");
  }
  if (!walkTo(PARK.seatX)) {
    R.sub = "";
    return;
  }
  ps.yawT = 0.5;
  ps.sitT = 1;
  ps.liftT = PARK.seat; // turned a little toward the dog, so his bent legs show
  if (R.sit < 0.8) return;
  if (!R.sub || now > R.subT) {
    nextBit(PARK_BITS, now);
    if (!talking)
      setExpr(
        { pet: "love", treat: "happy", moon: "love", rest: "focused" }[R.sub],
      );
  }
  const dx = (PARK.dogX - R.x) / L.k; // dog's head, in Eddie's units
  const mouth = [dx - 14, -DOG_HEAD + R.lift + 8];
  if (R.sub === "pet") {
    const s = Math.sin(now / 320);
    grip(1, dx - 4 + s * 7, -DOG_HEAD + R.lift - 3 + Math.abs(s) * 2, 1);
    DOG.pet = 1;
    ps.headOff = 0.2;
  } else if (R.sub === "treat") {
    // hand to his side for a treat, out to the dog, dog gobbles it
    const k = bitK(now, R.subLen),
      out = smooth((k - 0.25) / 0.3);
    R.hold.treat = k < 0.62 ? 1 : 0;
    grip(1, lerp(26, mouth[0], out), lerp(-62, mouth[1], out), 1);
    DOG.pet = k > 0.45 && k < 0.9 ? 0.7 : 0;
    DOG.excited = k > 0.2 && k < 0.62 ? 1 : 0;
    ps.headOff = 0.35;
  } else {
    if (now > R.nextGlance) {
      R.headOff = pick([-0.5, -0.5, 0, 0.1]);
      R.nextGlance = now + 1500 + Math.random() * 2000;
    }
    ps.headOff = R.headOff;
  }
}

/* --- library: ladder, book, desk and lamp -------------------------------- */
const DESK_H = 64; // reading desk top (front edge), units above the floor
const DESK_D = 16; // how deep the desk top looks from our slightly-above view
const CHAIR_LIFT = 20; // chair seat: chest stays above the desk, like the café stool
const BOOK_COLS = ["#c9952e", "#5b2a2a", "#2f4a3a", "#2a3a5a", "#4a2f4f"];
const DESK_BITS = {
  notes: [3, 6000, 4000],
  stretch: [2, 2800, 500],
  swap: [1, 0, 0],
};
const ladderX = (lift) => {
  const Ld = LIB.ladder,
    f = clamp((lift * L.k) / (Ld.by - Ld.ty), 0, 1);
  return lerp(Ld.bx, Ld.tx, f);
};
// the open book lies flat on the desk (furniture.js draws it). Where it sits, in Eddie's units from the desk's centre:
const BOOK = { cx: -8, hw: 38 };
const FLIP_MS = 650;
// reading: hands resting on the two pages; when a page turns, the right hand carries it over to the left
function readAtDesk(now) {
  const top = -DESK_H + R.lift,
    y = top - DESK_D / 2;
  LIB.bookDown = 1;
  const fk = (now - R.flipT) / FLIP_MS;
  grip(-1, BOOK.cx - BOOK.hw + 8, y, 1);
  if (fk > 0 && fk < 1)
    grip(
      1,
      BOOK.cx + Math.cos(fk * PI) * (BOOK.hw - 6),
      y - Math.sin(fk * PI) * 9,
      -1,
    );
  else grip(1, BOOK.cx + BOOK.hw - 10, y, -1);
}
function workRead(ps, now, dt) {
  ensureProp(null);
  const Ld = LIB.ladder;
  if (!Ld || !LIB.desk) return;
  if (!R.sub) R.sub = R.hasBook ? "toDesk" : "climb";
  switch (R.sub) {
    case "climb": // to the foot of the ladder, then up
      if (!R.ladder) {
        if (!walkTo(Ld.bx)) return;
        R.ladder = true;
      }
      ps.yawT = PI;
      ps.liftT = Ld.h;
      if (R.lift >= Ld.h - 0.5) {
        R.sub = "pick";
        R.subT = now + 1800;
        R.subLen = 1800;
      }
      break;
    case "pick": {
      // (put the old one back,) reach to the shelf, pull one out
      ps.yawT = PI;
      ps.liftT = Ld.h;
      const k = bitK(now, R.subLen);
      grip(1, 64 - 14 * Math.sin(Math.min(1, k * 1.4) * PI), -116, -1); // out to the side (his arms are too short to reach over his head), tug, back
      if (k > 0.3 && R.hasBook && R.swapping) {
        R.hasBook = false;
        R.swapping = false;
      } // old book slides back in
      if (k > 0.55 && !R.hasBook) {
        R.hasBook = true;
        R.bookCol = pick(BOOK_COLS.filter((c) => c !== R.bookCol));
      }
      if (k >= 1) R.sub = "down";
      break;
    }
    case "down": // climb down (ladder handled in behavior.js)
      ps.yawT = PI;
      if (!R.ladder) R.sub = "toDesk";
      break;
    case "toDesk":
      if (walkTo(LIB.desk.x)) {
        R.sub = "read";
        R.subT = now + 12000 + Math.random() * 8000;
      }
      break;
    default: {
      // at the desk: read, with bits in between
      if (!walkTo(LIB.desk.x)) return;
      ps.yawT = 0;
      ps.sitT = 1;
      ps.liftT = CHAIR_LIFT;
      if (R.sit < 0.8) return;
      if (now > R.subT) {
        if (R.sub === "read") {
          nextBit(DESK_BITS, now);
          if (R.sub === "swap") {
            R.swapping = true;
            R.sub = "climb";
            if (!talking) setExpr("happy");
            return;
          }
        } else {
          R.sub = "read";
          R.subT = now + 12000 + Math.random() * 8000;
          if (!talking) setExpr("focused");
        }
      }
      const top = -DESK_H + R.lift;
      if (R.sub === "read") {
        readAtDesk(now);
        if (now > R.flipT + 6500 + Math.random() * 400) R.flipT = now; // turn a page every so often
        ps.headOff = Math.sin(now / 2300) * 0.06;
        ps.tiltT = 0.05;
      } else if (R.sub === "notes") {
        // book down flat, jotting in the notepad
        R.hold.pen = 1;
        LIB.bookDown = 1;
        grip(
          1,
          46 + Math.sin(now / 480) * 5,
          top - DESK_D / 2 - 2 + Math.sin(now / 85) * 1.2,
          -1,
        );
        grip(-1, BOOK.cx - BOOK.hw + 8, top - DESK_D / 2, 1); // keeping his place in the book
        ps.headOff = 0.12;
        LIB.ink = ((LIB.ink || 0) + dt * 0.03) % 1;
      } else if (R.sub === "stretch")
        ps.upT = bitK(now, R.subLen) < 0.85 ? 1 : 0;
    }
  }
}

const WORK_FN = {
  computer: workComputer,
  cafe: workCafe,
  bench: workBench,
  read: workRead,
};
