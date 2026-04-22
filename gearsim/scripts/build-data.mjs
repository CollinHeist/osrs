/**
 * Optional demo seed for `public/data/`. WARNING: overwrites JSON files.
 * Default `npm run build` does NOT run this — keep large wiki exports in git.
 *
 * Run: node scripts/build-data.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "data");

const meta = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  notes:
    "Curated subset for demo; replace with wiki/cache pipeline for full coverage. Prices are illustrative snapshots.",
};

const monsters = [
  {
    id: "moss_giant",
    name: "Moss Giant",
    hp: 120,
    defLevel: 60,
    defStab: 0,
    defSlash: 3,
    defCrush: 0,
  },
  {
    id: "general_graardor",
    name: "General Graardor",
    hp: 255,
    defLevel: 25,
    defStab: 3,
    defSlash: 3,
    defCrush: 0,
  },
  {
    id: "blue_dragon",
    name: "Blue dragon",
    hp: 105,
    defLevel: 90,
    defStab: 0,
    defSlash: 40,
    defCrush: 0,
  },
  {
    id: "goblin",
    name: "Goblin",
    hp: 5,
    defLevel: 1,
    defStab: 0,
    defSlash: 0,
    defCrush: 0,
  },
];

const items = [
  {
    id: "bronze_sword",
    name: "Bronze sword",
    slot: "weapon",
    stabAtt: 4,
    slashAtt: 3,
    crushAtt: -2,
    str: 3,
    attSpeedTicks: 4,
  },
  {
    id: "rune_scimitar",
    name: "Rune scimitar",
    slot: "weapon",
    stabAtt: 7,
    slashAtt: 45,
    crushAtt: -2,
    str: 44,
    attSpeedTicks: 4,
  },
  {
    id: "abyssal_whip",
    name: "Abyssal whip",
    slot: "weapon",
    stabAtt: 0,
    slashAtt: 82,
    crushAtt: 0,
    str: 82,
    attSpeedTicks: 4,
  },
  {
    id: "dragon_scimitar",
    name: "Dragon scimitar",
    slot: "weapon",
    stabAtt: 8,
    slashAtt: 67,
    crushAtt: -2,
    str: 66,
    attSpeedTicks: 4,
  },
  {
    id: "berserker_helm",
    name: "Berserker helm",
    slot: "head",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 3,
  },
  {
    id: "neitiznot_faceguard",
    name: "Neitiznot faceguard",
    slot: "head",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 6,
  },
  {
    id: "amulet_of_fury",
    name: "Amulet of fury",
    slot: "neck",
    stabAtt: 10,
    slashAtt: 10,
    crushAtt: 10,
    str: 8,
  },
  {
    id: "amulet_of_glory",
    name: "Amulet of glory",
    slot: "neck",
    stabAtt: 10,
    slashAtt: 10,
    crushAtt: 10,
    str: 6,
  },
  {
    id: "fighter_torso",
    name: "Fighter torso",
    slot: "body",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 4,
  },
  {
    id: "bandos_chestplate",
    name: "Bandos chestplate",
    slot: "body",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 4,
  },
  {
    id: "rune_platebody",
    name: "Rune platebody",
    slot: "body",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 0,
  },
  {
    id: "barrows_gloves",
    name: "Barrows gloves",
    slot: "hands",
    stabAtt: 12,
    slashAtt: 12,
    crushAtt: 12,
    str: 12,
  },
  {
    id: "dragon_boots",
    name: "Dragon boots",
    slot: "feet",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 4,
  },
  {
    id: "primordial_boots",
    name: "Primordial boots",
    slot: "feet",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 5,
  },
  {
    id: "obsidian_platelegs",
    name: "Obsidian platelegs",
    slot: "legs",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 1,
  },
  {
    id: "bandos_tassets",
    name: "Bandos tassets",
    slot: "legs",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 2,
  },
  {
    id: "fire_cape",
    name: "Fire cape",
    slot: "cape",
    stabAtt: 1,
    slashAtt: 1,
    crushAtt: 1,
    str: 4,
  },
  {
    id: "infernal_cape",
    name: "Infernal cape",
    slot: "cape",
    stabAtt: 4,
    slashAtt: 4,
    crushAtt: 4,
    str: 8,
  },
  {
    id: "berserker_ring_i",
    name: "Berserker ring (i)",
    slot: "ring",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 8,
  },
  {
    id: "berserker_ring",
    name: "Berserker ring",
    slot: "ring",
    stabAtt: 0,
    slashAtt: 0,
    crushAtt: 0,
    str: 4,
  },
  {
    id: "dragon_defender",
    name: "Dragon defender",
    slot: "shield",
    stabAtt: 25,
    slashAtt: 24,
    crushAtt: 23,
    str: 6,
  },
  {
    id: "unholy_book",
    name: "Unholy book",
    slot: "shield",
    stabAtt: 8,
    slashAtt: 10,
    crushAtt: 12,
    str: 2,
  },
];

const prices = {
  bronze_sword: 50,
  rune_scimitar: 25000,
  abyssal_whip: 1_800_000,
  dragon_scimitar: 60_000,
  berserker_helm: 60_000,
  neitiznot_faceguard: 250_000,
  amulet_of_fury: 1_200_000,
  amulet_of_glory: 12_000,
  fighter_torso: 0,
  bandos_chestplate: 15_000_000,
  rune_platebody: 38_000,
  barrows_gloves: 130_000,
  dragon_boots: 200_000,
  primordial_boots: 25_000_000,
  obsidian_platelegs: 100_000,
  bandos_tassets: 22_000_000,
  fire_cape: 0,
  infernal_cape: 0,
  berserker_ring_i: 3_500_000,
  berserker_ring: 3_000_000,
  dragon_defender: 0,
  unholy_book: 5000,
};

/** Expected GP per kill from selected common drops (illustrative EV, not live GE). */
const loot = {
  moss_giant: [
    { id: "big_bones", name: "Big bones", evGp: 250 },
    { id: "mossy_key", name: "Mossy key", evGp: 5000 },
  ],
  general_graardor: [
    { id: "bandos_hilt", name: "Bandos hilt", evGp: 8_000_000 },
    { id: "bandos_tassets", name: "Bandos tassets", evGp: 400_000 },
    { id: "bandos_chestplate", name: "Bandos chestplate", evGp: 280_000 },
    { id: "coins", name: "Coins (average)", evGp: 20_000 },
  ],
  blue_dragon: [
    { id: "dragon_bones", name: "Dragon bones", evGp: 2200 },
    { id: "blue_dragonhide", name: "Blue dragonhide", evGp: 900 },
  ],
  goblin: [{ id: "bones", name: "Bones", evGp: 50 }],
};

async function main() {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "meta.json"), JSON.stringify(meta, null, 2));
  await writeFile(join(outDir, "monsters.json"), JSON.stringify(monsters, null, 2));
  await writeFile(join(outDir, "items.json"), JSON.stringify(items, null, 2));
  await writeFile(join(outDir, "prices.json"), JSON.stringify(prices, null, 2));
  await writeFile(join(outDir, "loot.json"), JSON.stringify(loot, null, 2));
  console.log("Wrote data to", outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
