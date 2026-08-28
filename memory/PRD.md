# Pen Fight — Product Requirements Document

## Original Problem Statement
"virtual online penfight game"

## User Choices
- Modes: Two players on same device (local) + Play against computer (AI)
- Controls: Flick/drag with mouse or finger
- Win condition: Knock all opponent's pens off the table
- Visual style: Realistic wooden desk + real pens
- Sound effects: yes, with mute option

## Architecture
- Frontend: React 19 + Matter.js (2D physics) rendered on HTML5 canvas (logical 900x600), Tailwind + framer-motion UI shell, diegetic "desk/paper/ink" aesthetic (Caveat + Space Mono fonts).
- Backend: FastAPI + MongoDB. Stores match results and aggregate stats.
- No authentication.

## User Personas
- Casual player wanting a quick nostalgic desk game solo vs AI or with a friend on one device.

## Core Requirements (static)
- Top-down pen-fight table; flick your pens to knock opponent's pens off.
- Turn-based; auto turn switching when pens rest.
- AI opponent with easy/medium/hard difficulty.
- Scoreboard, turn indicator, power meter, mute toggle, win/lose modal.

## Implemented (2026-06)
- Main menu: mode select (vs Computer / 2 Players), difficulty select, mute.
- Gameplay: Matter.js physics, drag-back slingshot flick, power meter, spin.
- Elimination when a pen leaves the table; scoreboard updates; win detection.
- AI opponent (aims at nearest enemy pen; difficulty controls jitter/power).
- Local 2-player alternating turns (Blue vs Red).
- WebAudio SFX (flick/collision/thud/win/lose), fully mutable.
- Game-over modal with Rematch / Main Menu; match result posted to backend.
- Backend: POST/GET /api/matches, GET /api/stats. Tested 100%.

## Backlog / Remaining
- P1: Online multiplayer across devices (not built; current "online" is single-device).
- P2: Stats/leaderboard screen using /api/stats.
- P2: Configurable pens-per-side and table size.
- P2: MatchCreate enum validation (mode/winner as Literals).

## Next Tasks
- Optional: stats screen, online multiplayer, custom pen skins.
