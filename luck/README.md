# OSRS Luck Tracker

A static React app for tracking OSRS unique drops, dry streaks, and collection-log
completion estimates. Activity definitions ship with the site; personal progress
stays in the browser under `osrs.luckTracker.v1`.

Drop history entries use an integer `at` value when the acquisition count is known
and `null` when the user knows they obtained the item but not its exact KC or roll.

## Commands

```sh
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Activity catalog

Edit `public/data/activities.json` to add or update activities. Stable activity and
drop IDs are required because saved progress uses those IDs.

Each activity defines:

- display metadata, Wiki links, and a tracking unit such as a kill or reward roll;
- drops with an exact `[numerator, denominator]` rate per eligible roll;
- optional `duplicateProtected: true` on drops that cannot be obtained again;
- one or more drop groups;
- an optional `rateNote` explaining assumptions or exclusions.

An `independent` group allows every listed item to roll on the same eligible roll.
An `exclusive` group allows at most one listed item on a roll. Set `rollsPerUnit`
when one tracked kill or chest contains multiple rolls, such as Zulrah's two loot
rolls or a six-brother Barrows chest's seven reward rolls.

### Kill types (modes)

Activities with alternate ways to complete a unit can define a `modes` array. The
player enters a separate count for each mode. The first mode must use the id
`default`, which is also where counts saved before modes existed are placed.
Activities without `modes` behave as a single `default` mode.

```json
"modes": [
  { "id": "default", "name": "Looted" },
  {
    "id": "destroyed",
    "name": "Destroyed",
    "note": "Corpse destroyed: no loot rolls, doubled Nid chance.",
    "groupRolls": { "unique": 0, "other": 0 },
    "rates": { "nid": [1, 1500] }
  }
]
```

- `groupRolls` overrides a group's `rollsPerUnit` in that mode. Use `0` for groups
  that never roll, including drops that only exist in some modes.
- `rates` overrides individual drop rates in that mode.

Drop history keeps a single total count. Dry streaks assume the player's overall
mix of modes applied evenly across the grind, and future estimates use the
player's selected planned mode.

When `duplicateProtected` is enabled, the tracker accepts only the first copy and
stops calculating a post-drop dry streak. Existing imported history is preserved
so changing catalog configuration never silently deletes user data.

Rates must describe normal main-game conditions. Add the relevant OSRS Wiki page
to every activity and drop, and update the catalog's `updatedAt` date whenever
rates change.

### Wiki loot parser

Install `scripts/osrs-wiki-loot-parser.user.js` in Tampermonkey, then open an OSRS
Wiki page containing loot tables. Use the **Export loot JSON** button to:

1. select the tables and individual drops to track;
2. set each group's type and rolls per tracked unit;
3. generate, copy, or download an activity object for `activities.json`.

The script reads the Wiki's exact fraction metadata instead of rounded displayed
rates. It also shows the selected loot's effective GE value per tracked unit when
Price columns are present, averaging the endpoints of displayed price ranges.
Alternative level or condition subtables are grouped so only one is enabled at a
time. Group mechanics cannot be inferred reliably from HTML, so review the
generated group types and roll counts before adding the object to the catalog.
