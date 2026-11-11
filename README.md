# LIMINAL — Milestone 1 + 2 prototype

First-person co-op horror prototype: flashlight + dark-adaptation vision pipeline, health/insanity bar,
seeded procedural maze, and 1–4 player WebRTC multiplayer. Static files only. No Node and no build step.

## Run it
ES modules need http, not file://. Pick one:
- VS Code: right-click `index.html` -> Open with Live Server
- Terminal: `python3 -m http.server 8000` in this folder, then open http://localhost:8000

Needs internet at load (Three.js from jsDelivr, PeerJS from unpkg, PeerJS cloud for signaling).

## Deploy (GitHub Pages)
Push this folder to a repo, then Settings -> Pages -> Deploy from branch -> `/ (root)`. `.nojekyll` is included.

## Play
- Host a room: share the 5-letter code. Friends enter it and Join. Host presses "Enter the maze".
- Test alone with two browser tabs (one hosts, one joins).
- W A S D move, Shift sprint, F flashlight, E interact, click the screen to capture the mouse.
- Reach the green EXIT to escape. Batteries sit in dead ends (E).
- Dev keys: `[` / `]` insanity -/+10, `-` take 10 damage (to test the bar and permadeath).

## Files
| File | Job |
|---|---|
| `js/config.js` | Every tuning number (speeds, battery, adaptation rate, net rate) |
| `js/maze.js` | Pure seeded generator. The host shares only the seed; every client builds the identical maze |
| `js/vision.js` | Scene -> HDR target -> eye model (exposure/adaptation, Purkinje desaturation, rod grain, subtle periphery, bright-light dazzle) |
| `js/game.js` | World, player controller, flashlight/battery, insanity, pickups, HUD |
| `js/net.js` | PeerJS star topology: clients -> host, host relays. Room codes, lobby, join/leave |
| `js/remote.js` | Remote players, interpolated ~110 ms in the past |

## How the systems work
- Dark adaptation: `adapt` eases toward 1 in the dark (fast start, long tail) and collapses when lit. Exposure = `EXPOSURE_MAX ^ adapt`. Turning the flashlight on while adapted triggers a dazzle proportional to adaptation; turning it off leaves you nearly blind until you readapt.
- Insanity cannot kill: it caps usable health at 100 - insanity (never below 10%). Only damage reduces `hp` to 0.
- Item sync: clients ask the host to pick up an item, and the host decides (first wins) and broadcasts.

## Not built yet
Creatures/Mimic and spawn director (M4), inventory and equipment (M5), hallucinations and audio (M6), anomalies,
host-disconnect recovery, voice chat. Free PeerJS cloud signaling has no TURN, so some strict networks will fail to connect.

## Untested
This was written and syntax-checked without a browser. Expect to tune light intensities in `game.js`
and `EXPOSURE_MAX` in `config.js` once you see it running.
