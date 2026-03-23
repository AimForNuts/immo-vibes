# XP Levels & Ascension

---

## Level Cap & Ascension

- **Level cap**: 100 for all skills and stats.
- **Ascension**: Once a skill reaches level 100, every **1,000,000 XP** earned beyond the cap grants **1 ascension point**, up to a maximum of **500 ascension points** per skill.
- **Total XP to level 100**: 16,310,118
- **Ascension is not exposed by the API** — the `/v1/character/{id}/information` endpoint only returns `level` (capped at 100) and `experience`. Ascension points must be inferred client-side: `ascensionPoints = floor((experience - 16_310_118) / 1_000_000)`, clamped to [0, 500].

---

## XP Progress Bar Formula

To compute a skill's progress within its current level:

```ts
const XP_TABLE = [/* totalXpForLevel[1..100] — see table below */];

function getLevelProgress(experience: number): { level: number; pct: number } {
  // Find current level from the cumulative XP table
  let level = 1;
  for (let i = 1; i <= 99; i++) {
    if (experience >= XP_TABLE[i + 1]) level = i + 1;
    else break;
  }
  if (level >= 100) return { level: 100, pct: 100 };

  const xpStart = XP_TABLE[level];
  const xpEnd   = XP_TABLE[level + 1];
  const pct = Math.min(100, Math.round(((experience - xpStart) / (xpEnd - xpStart)) * 100));
  return { level, pct };
}
```

---

## XP Table (levels 1–100)

`Total Experience` is the cumulative XP needed to **reach** that level.
`Experience Needed For Next Level` is the XP gap to advance to the next level.

| Level | Total XP to reach | XP needed for next |
|---|---|---|
| 1 | 0 | 139 |
| 2 | 139 | 154 |
| 3 | 293 | 168 |
| 4 | 461 | 185 |
| 5 | 646 | 202 |
| 6 | 848 | 223 |
| 7 | 1,071 | 244 |
| 8 | 1,315 | 268 |
| 9 | 1,583 | 294 |
| 10 | 1,877 | 323 |
| 11 | 2,200 | 354 |
| 12 | 2,554 | 389 |
| 13 | 2,943 | 427 |
| 14 | 3,370 | 469 |
| 15 | 3,839 | 514 |
| 16 | 4,353 | 565 |
| 17 | 4,918 | 621 |
| 18 | 5,539 | 681 |
| 19 | 6,220 | 747 |
| 20 | 6,967 | 822 |
| 21 | 7,789 | 901 |
| 22 | 8,690 | 991 |
| 23 | 9,681 | 1,087 |
| 24 | 10,768 | 1,194 |
| 25 | 11,962 | 1,312 |
| 26 | 13,274 | 1,440 |
| 27 | 14,714 | 1,583 |
| 28 | 16,297 | 1,737 |
| 29 | 18,034 | 1,909 |
| 30 | 19,943 | 2,097 |
| 31 | 22,040 | 2,304 |
| 32 | 24,344 | 2,530 |
| 33 | 26,874 | 2,780 |
| 34 | 29,654 | 3,055 |
| 35 | 32,709 | 3,355 |
| 36 | 36,064 | 3,687 |
| 37 | 39,751 | 4,052 |
| 38 | 43,803 | 4,451 |
| 39 | 48,254 | 4,892 |
| 40 | 53,146 | 5,376 |
| 41 | 58,522 | 5,907 |
| 42 | 64,429 | 6,492 |
| 43 | 70,921 | 7,136 |
| 44 | 78,057 | 7,842 |
| 45 | 85,899 | 8,619 |
| 46 | 94,518 | 9,474 |
| 47 | 103,992 | 10,414 |
| 48 | 114,406 | 11,447 |
| 49 | 125,853 | 12,583 |
| 50 | 138,436 | 13,833 |
| 51 | 152,269 | 15,208 |
| 52 | 167,477 | 16,719 |
| 53 | 184,196 | 18,382 |
| 54 | 202,578 | 20,210 |
| 55 | 222,788 | 22,222 |
| 56 | 245,010 | 24,434 |
| 57 | 269,444 | 26,868 |
| 58 | 296,312 | 29,544 |
| 59 | 325,856 | 32,489 |
| 60 | 358,345 | 35,729 |
| 61 | 394,074 | 39,293 |
| 62 | 433,367 | 43,214 |
| 63 | 476,581 | 47,527 |
| 64 | 524,108 | 52,275 |
| 65 | 576,383 | 57,496 |
| 66 | 633,879 | 63,243 |
| 67 | 697,122 | 69,566 |
| 68 | 766,688 | 76,523 |
| 69 | 843,211 | 84,180 |
| 70 | 927,391 | 92,606 |
| 71 | 1,019,997 | 101,877 |
| 72 | 1,121,874 | 112,083 |
| 73 | 1,233,957 | 123,312 |
| 74 | 1,357,269 | 135,674 |
| 75 | 1,492,943 | 149,277 |
| 76 | 1,642,220 | 164,251 |
| 77 | 1,806,471 | 180,732 |
| 78 | 1,987,203 | 198,874 |
| 79 | 2,186,077 | 218,843 |
| 80 | 2,404,920 | 240,826 |
| 81 | 2,645,746 | 265,024 |
| 82 | 2,910,770 | 291,663 |
| 83 | 3,202,433 | 320,991 |
| 84 | 3,523,424 | 353,277 |
| 85 | 3,876,701 | 388,824 |
| 86 | 4,265,525 | 427,959 |
| 87 | 4,693,484 | 471,048 |
| 88 | 5,164,532 | 518,491 |
| 89 | 5,683,023 | 570,730 |
| 90 | 6,253,753 | 628,250 |
| 91 | 6,882,003 | 691,588 |
| 92 | 7,573,591 | 761,333 |
| 93 | 8,334,924 | 838,136 |
| 94 | 9,173,060 | 922,714 |
| 95 | 10,095,774 | 1,015,856 |
| 96 | 11,111,630 | 1,118,431 |
| 97 | 12,230,061 | 1,231,399 |
| 98 | 13,461,460 | 1,355,815 |
| 99 | 14,817,275 | 1,492,843 |
| 100 | 16,310,118 | — (max level) |
