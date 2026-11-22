# Night Audit

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/luanma-ai/night-audit/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/luanma-ai/night-audit/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist played in a desktop browser. You are a thief crossing the
Lockwood Museum after hours with one alarm meter and three pieces to lift: an
emerald mask in the west hall, a gold reliquary in the east hall, and the Blue Star
in the vault corridor. Guards sweep vision cones across the floor, cameras pan over
the aisles, and standing in any of that light drives the alarm up. Get all three and
reach the exit before it hits 100.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Or play it: `node serve.ts` and open http://localhost:8080.

## Controls

| key | action |
| --- | --- |
| WASD / arrows | move |
| Shift | sprint, fast and loud |
| Ctrl | sneak, slower and harder to spot |
| E | take the loot you are standing on |
| Space | throw a noisemaker, which pulls a guard's cone away |
| Q | blackout, which blinds every camera for seven seconds |
| F | torch |
| R | restart the night |

Click a light switch while standing next to it to kill the power on that side.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
