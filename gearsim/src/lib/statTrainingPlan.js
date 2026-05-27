import { meleeCombatSnapshot } from "../engine/melee.js";

const XP_TABLE = [0];
let cumulativeXpPoints = 0;
for (let level = 1; level <= 99; level++) {
  cumulativeXpPoints += Math.floor(level + 300 * Math.pow(2, level / 7));
  XP_TABLE[level] = Math.floor(cumulativeXpPoints / 4);
}

function xpForLevel(level) {
  if (!Number.isFinite(level)) return XP_TABLE[1];
  const clamped = Math.max(1, Math.min(99, Math.floor(level)));
  return XP_TABLE[clamped];
}

function levelUpXpCost(level) {
  if (level >= 99) return Number.POSITIVE_INFINITY;
  return xpForLevel(level + 1) - xpForLevel(level);
}

function stepDps(params, equipment, attackLevel, strengthLevel) {
  return meleeCombatSnapshot({
    ...params,
    attackLevel,
    strengthLevel,
    equipment,
  }).dps;
}

function xpPerSecondFromDps(dps) {
  // Simplified combat XP model already used elsewhere in this tool: ~4 XP per damage.
  return Math.max(1e-9, dps * 4);
}

/**
 * @typedef {Object} TrainingPlanStep
 * @property {number} step
 * @property {"attack" | "strength"} stat
 * @property {number} attackLevelBefore
 * @property {number} strengthLevelBefore
 * @property {number} attackLevelAfter
 * @property {number} strengthLevelAfter
 * @property {number} dpsBefore
 * @property {number} dpsAfter
 * @property {number} dpsGain
 * @property {number} xpCost
 * @property {number} cumulativeXp
 * @property {number} timeSeconds
 * @property {number} cumulativeTimeSeconds
 */

/**
 * Build one candidate "training chunk" for a stat:
 * keep leveling that stat until it yields a measurable DPS increase (or cap/goal),
 * summing XP and time-to-train across the intermediate levels.
 * @param {Object} o
 * @param {"attack" | "strength"} o.stat
 * @param {number} o.currentAttack
 * @param {number} o.currentStrength
 * @param {number} o.targetLevel
 * @param {"level" | "kills"} o.goalType
 * @param {number} o.remainingXp
 * @param {any} o.combatParams
 * @param {import("../engine/types.js").EquipmentBonuses} o.equipment
 */
function buildStatCandidateChunk(o) {
  let att = o.currentAttack;
  let str = o.currentStrength;
  let xpCost = 0;
  let timeSeconds = 0;
  const dpsBefore = stepDps(o.combatParams, o.equipment, att, str);
  let dpsAfter = dpsBefore;
  const maxInnerSteps = 99;

  for (let i = 0; i < maxInnerSteps; i++) {
    const currentLevel = o.stat === "attack" ? att : str;
    const cappedByGoal =
      o.goalType === "level" ? currentLevel >= o.targetLevel : currentLevel >= 99;
    if (cappedByGoal) break;

    const oneLevelXp = levelUpXpCost(currentLevel);
    if (!Number.isFinite(oneLevelXp) || oneLevelXp > o.remainingXp - xpCost) break;

    const dpsNow = stepDps(o.combatParams, o.equipment, att, str);
    timeSeconds += oneLevelXp / xpPerSecondFromDps(dpsNow);
    xpCost += oneLevelXp;

    if (o.stat === "attack") att += 1;
    else str += 1;

    dpsAfter = stepDps(o.combatParams, o.equipment, att, str);
    if (dpsAfter > dpsBefore + 1e-9) break;
  }

  if (xpCost <= 0) return null;

  return {
    stat: o.stat,
    attackLevelAfter: att,
    strengthLevelAfter: str,
    dpsBefore,
    dpsAfter,
    dpsGain: dpsAfter - dpsBefore,
    xpCost,
    timeSeconds,
    score: dpsAfter > dpsBefore ? (dpsAfter - dpsBefore) / Math.max(timeSeconds, 1e-9) : 0,
  };
}

/**
 * @typedef {Object} GroupedTrainingPlanStep
 * @property {number} stepStart
 * @property {number} stepEnd
 * @property {"attack" | "strength"} stat
 * @property {number} attackLevelBefore
 * @property {number} strengthLevelBefore
 * @property {number} attackLevelAfter
 * @property {number} strengthLevelAfter
 * @property {number} dpsBefore
 * @property {number} dpsAfter
 * @property {number} dpsGain
 * @property {number} xpCost
 * @property {number} cumulativeXp
 * @property {number} timeSeconds
 * @property {number} cumulativeTimeSeconds
 */

/**
 * Collapse contiguous identical stat choices into a single row.
 * @param {TrainingPlanStep[]} steps
 * @returns {GroupedTrainingPlanStep[]}
 */
function groupTrainingPlanSteps(steps) {
  /** @type {GroupedTrainingPlanStep[]} */
  const grouped = [];
  for (const step of steps) {
    const prev = grouped[grouped.length - 1];
    if (!prev || prev.stat !== step.stat) {
      grouped.push({
        stepStart: step.step,
        stepEnd: step.step,
        stat: step.stat,
        attackLevelBefore: step.attackLevelBefore,
        strengthLevelBefore: step.strengthLevelBefore,
        attackLevelAfter: step.attackLevelAfter,
        strengthLevelAfter: step.strengthLevelAfter,
        dpsBefore: step.dpsBefore,
        dpsAfter: step.dpsAfter,
        dpsGain: step.dpsGain,
        xpCost: step.xpCost,
        cumulativeXp: step.cumulativeXp,
        timeSeconds: step.timeSeconds,
        cumulativeTimeSeconds: step.cumulativeTimeSeconds,
      });
      continue;
    }
    prev.stepEnd = step.step;
    prev.attackLevelAfter = step.attackLevelAfter;
    prev.strengthLevelAfter = step.strengthLevelAfter;
    prev.dpsAfter = step.dpsAfter;
    prev.dpsGain += step.dpsGain;
    prev.xpCost += step.xpCost;
    prev.cumulativeXp = step.cumulativeXp;
    prev.timeSeconds += step.timeSeconds;
    prev.cumulativeTimeSeconds = step.cumulativeTimeSeconds;
  }
  return grouped;
}

/**
 * @param {Object} input
 * @param {number} input.attackLevel
 * @param {number} input.strengthLevel
 * @param {number} input.defenceLevel
 * @param {import("../engine/types.js").MeleeStyle} input.meleeStyle
 * @param {import("../engine/types.js").HitStyle} input.hitStyle
 * @param {{ att: number, str: number, def: number }} input.prayerMults
 * @param {{ att: number, str: number, def: number }} input.potionAdds
 * @param {import("../engine/types.js").MonsterStats} input.monster
 * @param {import("../engine/types.js").EquipmentBonuses} input.equipment
 * @param {"level" | "kills"} input.goalType
 * @param {number} [input.goalLevel]
 * @param {number} [input.killCount]
 */
export function buildAttackStrengthTrainingPlan(input) {
  const baseAttack = Math.max(1, Math.min(99, Math.floor(input.attackLevel || 1)));
  const baseStrength = Math.max(
    1,
    Math.min(99, Math.floor(input.strengthLevel || 1))
  );
  const targetLevel = Math.max(
    Math.max(baseAttack, baseStrength),
    Math.min(99, Math.floor(input.goalLevel || 99))
  );
  const killCount = Math.max(0, Math.floor(input.killCount || 0));
  const xpPerKill = Math.max(0, (input.monster?.hp ?? 0) * 4);
  const xpBudget = input.goalType === "kills" ? killCount * xpPerKill : Infinity;

  const combatParams = {
    defenceLevel: input.defenceLevel,
    meleeStyle: input.meleeStyle,
    hitStyle: input.hitStyle,
    prayerMults: input.prayerMults,
    potionAdds: input.potionAdds,
    monster: input.monster,
  };

  let currentAttack = baseAttack;
  let currentStrength = baseStrength;
  let cumulativeXp = 0;
  let cumulativeTimeSeconds = 0;

  /** @type {TrainingPlanStep[]} */
  const steps = [];

  const maxSteps = 300;
  for (let i = 0; i < maxSteps; i++) {
    if (input.goalType === "level") {
      if (currentAttack >= targetLevel && currentStrength >= targetLevel) break;
    } else if (cumulativeXp >= xpBudget) {
      break;
    }

    const remainingXp = xpBudget - cumulativeXp;
    const attackCandidate = buildStatCandidateChunk({
      stat: "attack",
      currentAttack,
      currentStrength,
      targetLevel,
      goalType: input.goalType,
      remainingXp,
      combatParams,
      equipment: input.equipment,
    });
    const strengthCandidate = buildStatCandidateChunk({
      stat: "strength",
      currentAttack,
      currentStrength,
      targetLevel,
      goalType: input.goalType,
      remainingXp,
      combatParams,
      equipment: input.equipment,
    });

    if (!attackCandidate && !strengthCandidate) break;
    const pick =
      attackCandidate && strengthCandidate
        ? attackCandidate.score > strengthCandidate.score
          ? attackCandidate
          : strengthCandidate.score > attackCandidate.score
            ? strengthCandidate
            : attackCandidate.timeSeconds <= strengthCandidate.timeSeconds
              ? attackCandidate
              : strengthCandidate
        : attackCandidate ?? strengthCandidate;

    cumulativeXp += pick.xpCost;
    cumulativeTimeSeconds += pick.timeSeconds;
    steps.push({
      step: steps.length + 1,
      stat: pick.stat,
      attackLevelBefore: currentAttack,
      strengthLevelBefore: currentStrength,
      attackLevelAfter: pick.attackLevelAfter,
      strengthLevelAfter: pick.strengthLevelAfter,
      dpsBefore: pick.dpsBefore,
      dpsAfter: pick.dpsAfter,
      dpsGain: pick.dpsGain,
      xpCost: pick.xpCost,
      cumulativeXp,
      timeSeconds: pick.timeSeconds,
      cumulativeTimeSeconds,
    });

    currentAttack = pick.attackLevelAfter;
    currentStrength = pick.strengthLevelAfter;
  }

  const baselineDps = stepDps(combatParams, input.equipment, baseAttack, baseStrength);
  const finalDps = stepDps(
    combatParams,
    input.equipment,
    currentAttack,
    currentStrength
  );

  return {
    steps,
    groupedSteps: groupTrainingPlanSteps(steps),
    baselineDps,
    finalDps,
    dpsGainTotal: finalDps - baselineDps,
    startAttackLevel: baseAttack,
    startStrengthLevel: baseStrength,
    finalAttackLevel: currentAttack,
    finalStrengthLevel: currentStrength,
    xpSpent: cumulativeXp,
    totalTimeSeconds: cumulativeTimeSeconds,
    xpBudget: Number.isFinite(xpBudget) ? xpBudget : null,
    xpPerKill,
    estimatedKillsUsed: xpPerKill > 0 ? cumulativeXp / xpPerKill : 0,
    firstRecommendation: steps[0]?.stat ?? null,
  };
}
