# Missing Icons Report — Focus Space

Last updated: after the sounds-player + icon-registry pass.

## What the rail buttons use

Each rail button now has ONE icon from the project's own assets:

| Rail slot | Asset | Type |
|---|---|---|
| sounds | headset.svg | SVG (headset outline) |
| notes | clip.png | PNG (paper clip — no note SVG in the folder) |
| tasks | to-do-list.png | PNG (checklist glyph) |
| smart | star.svg | SVG (star outline) |
| aya | moon-stars.svg | SVG (moon + stars) |
| notifications | bell.svg | SVG (bell outline) |
| settings | settings-sliders.svg | SVG (sliders) |

All SVG assets use `currentColor`, so CSS controls their color (the blue
#0f8ee2 when active, white/gray otherwise). PNG assets keep their own
colors and are used where only a filled/colored glyph exists.

## Missing Icons

Icons that do NOT exist in the assets folder yet; they're listed as
candidates to be replaced by real asset files later:

- play/pause/stop/loop — inline SVG (playback controls for the sounds
  player); no equivalent in the folder, so they render as React components
  in focusGlyphs.jsx. No emoji.
- close/cross-small — small cross used in tab close; cross-small.png
  EXISTS in the folder but is PNG-only, so tabs use it as <img>.
- retry — small retry arrow used in error fallback; no equivalent.
- clock — small clock used in aya timing; no equivalent (SVG-only).
- mute/volume — small volume icons for the sounds player; no equivalent
  in the folder (SVG-only).

Until they're replaced by real asset files, they render as inline SVG
React components (crisp at 14–16 px, inherit color, no emoji).

## Replacement candidates

When new asset files are added to the folder, replace the inline
components in focusGlyphs.jsx with real imports — the registry is the
single source of truth.
