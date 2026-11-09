# EddieHD

A pomodoro timer with Eddie, a small robot who works at his desk while you focus, charges in a pod on breaks, and watches for your phone.

## What it does

- **Focus and break timer.** Pick 25 / 5, 50 / 10 or a 1-minute demo. A 3-2-1 countdown with soft beeps starts each focus block and closes out each focus and break.
- **Eddie keeps you company.** He works through your focus time and recharges during breaks, with little activities of his own in between.
- **Four scenes.** Default desk, café, park and library, each with its own things for Eddie to do: looking out the café window, using binoculars on the moon in the park, fetching a book from the library ladder. Switch scenes mid-session and Eddie hauls the new set on stage himself.
- **Phone watch (optional).** With the camera on, Eddie notices when you pick up your phone or leave your desk, and nudges you back. Detection runs in the browser; video never leaves your computer.
- **Talk to him (optional).** Say "Hey Eddie" or press the mic button and he turns to listen. Chrome's speech recognition sends what it hears to Google to turn it into text.
- **Rain and lo-fi music.** A rain loop, which Eddie reacts to (he puts up an umbrella in the park), and a mini player with lo-fi study tracks. Each has its own volume, and pausing the music leaves the rain playing.
- **Works on phones.** The layout adapts to portrait and landscape, and the shortcuts panel shows touch controls on touch screens.

## Run it

The app is plain static files in `public/`, so any static server works. Use Chrome or Edge (camera, mic and speech recognition need them).

- **VS Code:** open `public/index.html` with the Live Server extension (right-click → Open with Live Server). `.vscode/settings.json` already points Live Server at `public/`.
- **No VS Code:** run Python's built-in server, then open http://localhost:8765

  ```bash
  python -m http.server 8765 -d public
  ```

### Debug mode

Open the app with `?debug` (for example http://localhost:8765/?debug) to show the **Testing** tools in the menu:
pretend phone / away / "Hey Eddie" and a button per face. It's remembered in this browser; `?debug=0` turns it off.

## Hosting

Hosted on Cloudflare Pages: no build command, output directory `public`. Every push to `main` deploys.
`public/_headers` tells browsers to keep the audio for 30 days; if you replace a track, give it a new file name.

## Layout

```
public/
  index.html           markup only: timer, status bar, setup card, menu
  _headers             Cloudflare Pages caching rules (audio cached 30 days)
  css/
    base.css           colour + type tokens, reset, buttons, shared form controls
    hud.css            timer, status chips, shortcuts panel, speech bubble
    setup.css          setup card
    menu.css           slide-out menu
  js/                  plain scripts, loaded in the order listed in index.html
    core.js            $(), saved preferences, lerp / clamp / pick
    robot/
      face.js          expressions and drawing the face on Eddie's screen (also owns the canvas)
      state.js         Eddie's state, the current prop, layout and sizing
      model.js         Eddie's body: colours, how each part is drawn, reach() so a hand can be placed on a target
      props.js         desk, charging pod and the claw machine that moves them
      work.js          focus-time job per scene, each a mix of small bits: computer (type · think · stretch · pace) ·
                       café (write · sip · stir · gaze) · park (pet · rest · treat · moon) · library (fetch a book · read · notes · swap)
      behavior.js      activities per timer mode, walking/running, ladder, attention, pack up / pop out
      items.js         things he holds: coffee cup, pen, book, umbrella
      stagehand.js     scene changes: Eddie walks off, then hauls the new backdrop across on a rope
      scene.js         draws each frame (backdrop → props → rope → Eddie → bubble), poke handler
    scenes/
      backdrops.js     the painted backdrops: default, café, park, library (+ small moving bits)
      furniture.js     café table + stool, the dog, library reading desk + lamp + chair
      rain.js          rain sound (recorded loop in audio/rain.mp3), rain in each scene, umbrella logic
    music.js           lo-fi background music and the mini player (tracks in audio/music/)
    persona.js         Eddie's lines and their style rules
    voice.js           Eddie talking: chirps, speech bubbles, mouth timing
    timer.js           pomodoro state machine and timer display
    camera.js          webcam + phone/person detection and Eddie's reactions
    ears.js            "Hey Eddie" wake word and replies
    ui/hud.js          status chips and mic button
    ui/screens.js      setup card + menu wiring
    main.js            starts everything
```

The scripts share their top-level names (no imports), so order matters: a file can only use something at load time if an earlier file defines it.

## Credits

Music: ["Lofi Study Beats"](https://freemusicarchive.org/music/alex-morgan/lofi-study-beats) by Alex Morgan, from the Free Music Archive,
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The tracks in `public/audio/music/` are used without changes.
