/* EddieHD — Music: background lo-fi for focus sessions, and the mini player in the top-left column.
   Tracks: "Lofi Study Beats" by Alex Morgan, from the Free Music Archive, licensed CC BY 4.0 (credited in the player and the menu).
   Each track streams through its own <audio> element into a Web Audio gain, separate from the rain, so pausing music leaves rain alone.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

const MUSIC_CREDIT = {
  artist: "Alex Morgan",
  album: "Lofi Study Beats",
  source: "https://freemusicarchive.org/music/alex-morgan/lofi-study-beats",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};
// files are public/audio/music/NN Alex Morgan - <title>.mp3
const TRACKS = [
  "Lofi Corporate Business Background Loop",
  "Muted Trumpet Jazz Study Session in Free Time",
  "Study Lofi Restaurant Slow Service Beat",
  "Lofi Explainer Video Music With Clear Space",
  "Modal Jazz Study Session With Open Harmony",
  "Study Lofi Focus Beat With Gentle Swells",
  "Nu Jazz Study Session With Electronic Texture",
  "Organ Jazz Study Session With Bright Tone",
  "Lofi Cinematic Beat for Film Style Edits",
  "Lofi Startup Promo With Upbeat Pulse",
  "Lofi Corporate Presentation Underscore",
  "Lofi Jazz Coffee Shop With Dynamic Swells",
  "Lofi Jazz Rainy Night Mood",
  "Lofi Jazz Restaurant Dinner Set",
  "Lofi Jazz Sunny Cafe Daytime Beat",
  "Ragtime Jazz Study Session With Vintage Feel",
  "Piano Bar Jazz Study Session at Late Hours",
  "Samba Jazz Study Session With Light Percussion",
  "Smooth Jazz Study Session for Long Sessions",
  "Soul Jazz Study Session Extended Take",
  "Study Lofi Cocktail Bar Low Volume Set",
  "Study Lofi Coffee Shop at Slow Tempo",
  "Study Lofi Midnight Club Quiet Groove",
  "Study Lofi Sunny Cafe Afternoon Loop",
  "Swing Jazz Study Session With Light Touch",
  "Vibraphone Jazz Study Session Without a Beat",
  "Lofi Corporate Advertising Bed",
  "Lofi Jazz Cocktail Bar Evening Set",
  "Lofi Jazz Midnight Club After Hours",
  "Lofi Jazz Study Session in a Minor Key",
  "Lounge Jazz Study Session With Minimal Drums",
  "Saxophone Jazz Study Session With Warm Lead",
  "Stride Piano Study Session Without Drums",
  "Study Lofi Rainy Night at Low Level",
];
const trackFile = (i) =>
  `audio/music/${String(i + 1).padStart(2, "0")} ${MUSIC_CREDIT.artist} - ${TRACKS[i]}.mp3`;

const MUSIC = {
  el: null,
  out: null,
  idx: clamp(prefs.musicTrack, 0, TRACKS.length - 1),
  playing: false,
};

function musicGraph() {
  actx = actx || new AudioContext();
  if (actx.state === "suspended") actx.resume();
  if (MUSIC.el) return;
  const el = new Audio();
  el.preload = "auto";
  el.onended = () => musicSkip(1); // play straight through the album, then wrap round
  el.onerror = () => {
    if (MUSIC.playing) musicSkip(1);
  };
  MUSIC.out = actx.createGain();
  MUSIC.out.gain.value = prefs.musicVol;
  actx
    .createMediaElementSource(el)
    .connect(MUSIC.out)
    .connect(actx.destination);
  MUSIC.el = el;
  loadTrack(MUSIC.idx);
}
function loadTrack(i) {
  MUSIC.idx = (i + TRACKS.length) % TRACKS.length;
  savePref("musicTrack", MUSIC.idx);
  MUSIC.el.src = trackFile(MUSIC.idx);
  renderPlayer();
}
function musicPlay() {
  musicGraph();
  MUSIC.playing = true;
  savePref("music", true);
  MUSIC.el.play().catch(() => {
    MUSIC.playing = false;
    renderPlayer();
  });
  renderPlayer();
}
function musicPause() {
  MUSIC.playing = false;
  savePref("music", false);
  if (MUSIC.el) MUSIC.el.pause(); // only the music: rain has its own element and gain
  renderPlayer();
}
const musicToggle = () => (MUSIC.playing ? musicPause() : musicPlay());
function musicSkip(d) {
  musicGraph();
  loadTrack(MUSIC.idx + d);
  if (MUSIC.playing) MUSIC.el.play().catch(() => {});
}
function setMusicVol(v) {
  savePref("musicVol", v);
  if (MUSIC.out) MUSIC.out.gain.setTargetAtTime(v, actx.currentTime, 0.05);
  renderPlayer();
}

function renderPlayer() {
  $("mpTitle").textContent = TRACKS[MUSIC.idx];
  $("mpTitle").title = TRACKS[MUSIC.idx];
  $("mpNum").textContent = `${MUSIC.idx + 1} / ${TRACKS.length}`;
  for (const b of [$("mpPlay"), $("mpPlayMini")]) {
    // the folded player has its own play button
    b.setAttribute("aria-label", MUSIC.playing ? "Pause music" : "Play music");
    b.classList.toggle("on", MUSIC.playing);
  }
  $("player").classList.toggle("playing", MUSIC.playing);
  $("mpVol").value = prefs.musicVol;
}

$("mpPlay").onclick = $("mpPlayMini").onclick = musicToggle;
$("mpPrev").onclick = () => musicSkip(-1);
$("mpNext").onclick = () => musicSkip(1);
$("mpVol").oninput = (e) => setMusicVol(+e.target.value);
renderPlayer();
