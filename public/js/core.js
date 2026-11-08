/* EddieHD — Shared helpers: $(), saved preferences (localStorage), lerp / clamp / pick.
   Loaded as a plain script (see index.html for the order); top-level names are shared between files. */

const $ = id => document.getElementById(id);
const store = { get(k) { try { return localStorage.getItem('eddie.' + k) ?? localStorage.getItem('grix.' + k); } catch (e) { return null; } }   /* grix.* = settings saved before the rename */, set(k, v) { try { localStorage.setItem('eddie.' + k, v); } catch (e) { } } };
const prefs = {
  preset: store.get('preset') || '25,5',
  voice: store.get('voice') || 'off',
  cam: store.get('cam') === '1',
  wake: store.get('wake') === '1',
  fx: store.get('fx') !== '0',
};
function savePref(k, v) { prefs[k] = v; store.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : v); }
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
