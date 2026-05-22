/**
 * Woodcutting tree data for the Beaver pet calculator.
 *
 * Base drop chance values sourced from the OSRS Wiki Module:Skill pet calc.
 * Formula: chance per log = 1 / (base - woodcuttingLevel * 25)
 *
 * XP values from the OSRS Woodcutting wiki page.
 */
export const TREES = [
  {
    id:       "normal",
    name:     "Logs",
    levelReq: 1,
    xpPerLog: 25,
    base:     317647,
    color:    "#a09060",
    members:  false,
  },
  {
    id:       "oak",
    name:     "Oak",
    levelReq: 15,
    xpPerLog: 37.5,
    base:     361146,
    color:    "#c4a840",
    members:  false,
  },
  {
    id:       "willow",
    name:     "Willow",
    levelReq: 30,
    xpPerLog: 67.5,
    base:     289286,
    color:    "#70a858",
    members:  false,
  },
  {
    id:       "teak",
    name:     "Teak",
    levelReq: 35,
    xpPerLog: 85,
    base:     264336,
    color:    "#c09040",
    members:  true,
  },
  {
    id:       "jatoba",
    name:     "Jatoba",
    levelReq: 40,
    xpPerLog: 92,
    base:     264336,
    color:    "#e08028",
    members:  false,
  },
  {
    id:       "maple",
    name:     "Maple",
    levelReq: 45,
    xpPerLog: 100,
    base:     221918,
    color:    "#e08028",
    members:  false,
  },
  {
    id:       "mahogany",
    name:     "Mahogany",
    levelReq: 50,
    xpPerLog: 125,
    base:     220623,
    color:    "#904830",
    members:  true,
  },
  {
    id:       "arctic pine",
    name:     "Arctic Pine",
    levelReq: 54,
    xpPerLog: 40,
    base:     145758,
    color:    "#808080",
    members:  true,
  },
  {
    id:       "yew",
    name:     "Yew",
    levelReq: 60,
    xpPerLog: 175,
    base:     145013,
    color:    "#4a7840",
    members:  false,
  },
  {
    id:       "sulliuscep",
    name:     "Sulliuscep",
    levelReq: 65,
    xpPerLog: 127,
    base:     343000,
    color:    "#7848b0",
    members:  true,
  },
  {
    id:       "camphor",
    name:     "Camphor",
    levelReq: 66,
    xpPerLog: 143,
    base:     145013,
    color:    "#4070a0",
    members:  true,
  },
  {
    id:       "magic",
    name:     "Magic",
    levelReq: 75,
    xpPerLog: 250,
    base:     72321,
    color:    "#6040c0",
    members:  true,
  },
  {
    id:       "ironwood",
    name:     "Ironwood",
    levelReq: 80,
    xpPerLog: 175,
    base:     72321,
    color:    "#5878a0",
    members:  true,
  },
  {
    id:       "redwood",
    name:     "Redwood",
    levelReq: 90,
    xpPerLog: 380,
    base:     72321,
    color:    "#b02828",
    members:  true,
  },
  {
    id:       "rosewood",
    name:     "Rosewood",
    levelReq: 92,
    xpPerLog: 212.5,
    base:     72321,
    color:    "#c04870",
    members:  true,
  },
];

export const TREE_BY_ID = Object.fromEntries(TREES.map(t => [t.id, t]));

export const DEFAULT_SEGMENTS = [
  { id: "s1", treeId: "normal", toLevel: 15 },
  { id: "s2", treeId: "oak",    toLevel: 30 },
  { id: "s3", treeId: "willow", toLevel: 60 },
  { id: "s4", treeId: "yew",    toLevel: 99 },
];
