# EddieHD

A pomodoro timer with Eddie, a small robot who works at his desk while you focus, charges in a pod on breaks, and watches for your phone.

## Run it

```bash
python3 server.py
```

Then open http://localhost:8765 in Chrome (camera, mic and speech recognition need Chrome or Edge).

## Layout

```
server.py              serves public/ and forwards text-to-speech to ElevenLabs (key in .env, never sent to the browser)
public/
  index.html           markup only: timer, status bar, setup card, menu
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
      model.js         Eddie's body: colours and how each part is drawn
      props.js         desk, charging pod and the claw machine that moves them
      behavior.js      activities per timer mode, walking/running, attention, pack up / pop out
      scene.js         draws each frame (floor → props → Eddie → bubble), poke handler
    persona.js         Eddie's lines and their style rules
    voice.js           chirps, bubble timing, optional ElevenLabs voice (VOICE_ENABLED, off for now)
    timer.js           pomodoro state machine and timer display
    camera.js          webcam + phone/person detection and Eddie's reactions
    ears.js            "Hey Eddie" wake word and replies
    ui/hud.js          status chips and mic button
    ui/screens.js      setup card + menu wiring
    main.js            starts everything
```

The scripts share their top-level names (no imports), so order matters: a file can only use something at load time if an earlier file defines it.
