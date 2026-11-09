/* EddieHD — Shared helpers: $(), saved preferences (localStorage), lerp / clamp / pick.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

const $ = (id) => document.getElementById(id);
const store = {
  get(k) {
    try {
      return (
        localStorage.getItem("eddie." + k) ?? localStorage.getItem("grix." + k)
      );
    } catch (e) {
      return null;
    }
  } /* grix.* = settings saved before the rename */,
  set(k, v) {
    try {
      localStorage.setItem("eddie." + k, v);
    } catch (e) {}
  },
};
const prefs = {
  preset: store.get("preset") || "25,5",
  cam: store.get("cam") === "1",
  wake: store.get("wake") === "1",
  scene: store.get("scene") || "default",
  rainVol: +(store.get("rainVol") ?? 0.5),
  music: store.get("music") === "1",
  musicVol: +(store.get("musicVol") ?? 0.4),
  musicTrack: +(store.get("musicTrack") ?? 0) || 0,
};
// DEBUG mode shows the Testing tools in the menu. Turn it on with ?debug in the URL (remembered), off with ?debug=0.
const DEBUG = (() => {
  const q = new URLSearchParams(location.search).get("debug");
  if (q != null) store.set("debug", q === "0" || q === "false" ? "0" : "1");
  return store.get("debug") === "1";
})();
function savePref(k, v) {
  prefs[k] = v;
  store.set(k, typeof v === "boolean" ? (v ? "1" : "0") : v);
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
