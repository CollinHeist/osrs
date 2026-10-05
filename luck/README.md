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

### TempleOSRS mapping

Activities can define a `temple` block so their progress can be imported from
TempleOSRS:

```json
"temple": { "category": "abyssal_sire", "kc": "Abyssal Sire" }
```

- `category` is the TempleOSRS collection log category key.
- `kc` is the optional key in the TempleOSRS player stats response that holds the
  activity's kill count. Omit it when TempleOSRS has no count for the activity or
  counts a different unit, such as Tempoross games instead of reward permits.

Drops are matched to collection log items in that category by case-insensitive
name. Add `templeItemIds` when the names differ or when one drop combines several
items (the counts are summed). Use `"templeItemIds": []` for drops the
collection log does not track.

## Import from TempleOSRS

TempleOSRS does not send CORS headers, so the site cannot request it directly.
**Import from TempleOSRS** in the header builds the two API links for a username:

- the collection log (`player_collection_log.php?...&categories=all&includenames=1`);
- player stats (`player_stats.php?...&bosses=1`), which is optional and supplies
  kill counts.

Open each link, paste the JSON response into the dialog, and review the changes
for each activity before applying. Imports only add data:

- A kill count update sets the activity's total. Counts in non-default modes are
  kept, and the default mode absorbs the difference.
- Drop updates add the missing entries with `at: null`. Existing entries are never
  removed, so when the tracker has more than TempleOSRS the row is shown but
  cannot be applied.
- Items that appear in several collection log categories, such as the Dragon
  pickaxe, are unselected by default because their count includes every source.

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
