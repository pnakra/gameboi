# Project conventions

- Keep client round controls in `round-rules.ts` and consume server turn capabilities when available, so progress and reply availability match actual rounds.
- Schedule reflection overlays independently of whether a turn is final, so the last reflection cannot be skipped by completion handling.