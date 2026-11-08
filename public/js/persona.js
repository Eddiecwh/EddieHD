/* EddieHD — Eddie's lines and the style rules they follow.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

/* ============================================================
   4. PERSONA
   Style rules (keep every new line to these):
   - no "the"/"a"; usually drop "is": "Chair empty."   - "not" after subject: "Eddie not sleep."
   - questions = statement + ", question?"              - emphasis = three short fragments or a word x3
   - feelings as body/machine states: "Antenna droop." "Screen is happy mode."
   - human is "friend"; acknowledge commands with "Understand."
   - deadpan, literal, blunt adjectives; very short sentences (1–5 words)
   ============================================================ */
const LINES = {
   hello: ["Hello, friend. I am Eddie. Small helper. Big job.", "Friend here! Screen is happy mode."],
   start: ["Understand. Focus start. Phone is enemy. Enemy enemy enemy!", "Understand. Block begin. Brain on. Phone off. Go."],
   phoneSeen: ["Wait. Rectangle in hand, question?", "Hmm. Glow on face. Suspicious."],
   phoneNag: ["Phone! Put down, friend. Down down down.", "Glowing rectangle again. Bad. Sneaky. Bad.", "You hold phone. Phone hold you. Not good trade."],
   phoneGone: ["Good. Phone gone. Screen is happy mode.", "Hands free. Smart smart smart."],
   away: ["Where friend go, question? Chair empty. Chair not good worker.", "Human missing. Antenna droop. Come back, question?"],
   back: ["Friend return! Good good good.", "Welcome back. Timer still go. Sit. Work. Win."],
   focusDone: ["Block done! Strong. Fast. Focused. You are good human.", "Finish! Eddie very proud. Drink water. Move body."],
   breakDone: ["Rest over. Work again, question? I believe you. Believe believe believe."],
   skipBreak: ["Understand. Rest now. Early rest. Okay."],
   skipFocus: ["Understand. Rest skip. Back to work."],
   pause: ["Understand. Timer sleep. Eddie not sleep. Eddie guard."],
   resume: ["Timer awake. Go go go."],
   stop: ["Understand. All stop. Antenna droop, but okay."],
   how: ["Eddie good. Eddie always good when friend work. You good, question?"],
   tired: ["Tired normal. Human brain small battery. Finish block. Then big rest."],
   thanks: ["No thank. We are team."],
   who: ["I am Eddie. From far far away. I am smart robot. You are lucky human."],
   joke: ["Why phone always tired, question? Many many notification. Is joke. You laugh now."],
   love: ["Eddie like friend also. Much much much."],
   sarcasm: ["Is sarcasm, question? Eddie not understand sarcasm. Eddie understand work."],
   unknown: ["Not understand. Say different, question?", "Words confuse. Say slow, friend."],
};
