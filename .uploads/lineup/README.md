# Zaylin’s World — Lineup Lab

Standalone playable haircut / hairline minigame for the bathroom mirror or clipper station.

## Kid-facing gameplay

- Player clicks **Start Clippers**.
- The green dot is the exact cutting point.
- Player holds/clicks while moving the clippers to cut hair.
- The goal is to make the hairline clean and even.
- Finish shows a friendly result like Crispy Lineup, Clean Lineup, Needs a Touch-Up, Pushed Back, or Bald Rescue.

## Integration hook

The game still keeps the developer payload hidden from players.

It sets:

```js
window.ZW_LAST_HAIRCUT_RESULT
```

and dispatches:

```js
window.dispatchEvent(new CustomEvent('zaylin:haircut-complete', { detail: result }))
```

## Integration notes

Use this version as the approved gameplay reference. The in-game UI should not show version numbers, JSON, payloads, debug notes, or development thought process.
