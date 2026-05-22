import { computeXpMultiplier } from "../lib/bonuses.js";

const C = {
  card:      "#1a1c14",
  border:    "#282b22",
  text:      "#e8ead4",
  muted:     "#7a7d6e",
  surface:   "#131509",
  accent:    "#c8873a",
  green:     "#8cb87a",
  gold:      "#d4a84b",
  hover:     "#1e2018",
};

const LUMBERJACK_PIECES = [
  { key: "hat",   label: "Hat",   bonus: 0.004 },
  { key: "top",   label: "Top",   bonus: 0.008 },
  { key: "legs",  label: "Legs",  bonus: 0.006 },
  { key: "boots", label: "Boots", bonus: 0.002 },
];

const SET_BONUS = 0.005;

/**
 * Computes the combined XP multiplier from all active bonuses.
 * Lumberjack and set bonus are additive among themselves, then multiplied
 * by the felling axe multiplier (per wiki: stacks multiplicatively).
 */

function Toggle({ checked, onChange, label, sub, accent }) {
  return (
    <label
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        padding:      "7px 10px",
        borderRadius: 6,
        cursor:       "pointer",
        transition:   "background .12s",
        background:   checked ? (accent ?? C.green) + "14" : "transparent",
      }}
      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = C.hover; }}
      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        width:        16,
        height:       16,
        borderRadius: 4,
        border:       `2px solid ${checked ? (accent ?? C.green) : C.border}`,
        background:   checked ? (accent ?? C.green) : "transparent",
        flexShrink:   0,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        transition:   "all .12s",
      }}>
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5l2.5 2.5 4.5-5" stroke="#0d0e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: checked ? C.text : C.muted, fontWeight: checked ? 500 : 400 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{sub}</div>
        )}
      </div>
    </label>
  );
}

export default function BonusesPanel({ bonuses, onChange }) {
  const set = (key, val) => onChange({ ...bonuses, [key]: val });
  const allFour = bonuses.hat && bonuses.top && bonuses.legs && bonuses.boots;

  const multiplier = computeXpMultiplier(bonuses);
  const pctBonus   = ((multiplier - 1) * 100).toFixed(2);
  const hasAny     = Object.values(bonuses).some(Boolean);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{
        padding:      "12px 14px 10px",
        borderBottom: `1px solid ${C.border}`,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
      }}>
        <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Source Code Pro', monospace", letterSpacing: ".08em", textTransform: "uppercase" }}>
          XP Bonuses
        </div>
        {hasAny && (
          <div style={{
            fontFamily:  "'Source Code Pro', monospace",
            fontSize:    12,
            fontWeight:  700,
            color:       C.green,
            background:  C.green + "18",
            border:      `1px solid ${C.green}40`,
            borderRadius: 5,
            padding:     "2px 8px",
          }}>
            +{pctBonus}%
          </div>
        )}
      </div>

      <div style={{ padding: "6px 6px 4px" }}>

        {/* Lumberjack outfit */}
        <div style={{ padding: "6px 6px 2px 8px", marginBottom: 2 }}>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Source Code Pro', monospace", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>
            Lumberjack Outfit
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {LUMBERJACK_PIECES.map(p => (
              <Toggle
                key={p.key}
                checked={bonuses[p.key]}
                onChange={e => set(p.key, e.target.checked)}
                label={p.label}
                sub={`+${(p.bonus * 100).toFixed(1)}%`}
                accent={C.gold}
              />
            ))}
          </div>

          {/* Set bonus indicator */}
          <div style={{
            display:      "flex",
            alignItems:   "center",
            gap:          6,
            padding:      "5px 10px",
            marginTop:    4,
            borderRadius: 6,
            background:   allFour ? C.gold + "14" : C.surface,
            border:       `1px solid ${allFour ? C.gold + "40" : C.border}`,
            transition:   "all .15s",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: allFour ? C.gold : C.border, transition: "background .15s" }} />
            <span style={{ fontSize: 11, color: allFour ? C.gold : C.muted, flex: 1 }}>Full set bonus</span>
            <span style={{ fontSize: 11, fontFamily: "'Source Code Pro', monospace", color: allFour ? C.gold : C.muted, fontWeight: allFour ? 700 : 400 }}>
              {allFour ? "+0.5%" : "—"}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, margin: "6px 0" }} />

        {/* Felling axe + rations */}
        <div style={{ padding: "0 6px 2px" }}>
          <Toggle
            checked={bonuses.fellingAxe}
            onChange={e => set("fellingAxe", e.target.checked)}
            label="Felling Axe + Forester's Rations"
            sub="+10% XP · 20% chance no log (pet roll still fires)"
            accent={C.accent}
          />
        </div>
      </div>

      {/* Total summary */}
      {hasAny && (
        <div style={{
          borderTop:   `1px solid ${C.border}`,
          padding:     "8px 14px",
          background:  C.surface,
          display:     "flex",
          justifyContent: "space-between",
          alignItems:  "center",
        }}>
          <span style={{ fontSize: 11, color: C.muted }}>
            Combined multiplier <span style={{ fontFamily: "'Source Code Pro', monospace" }}>
              {bonuses.fellingAxe && (bonuses.hat || bonuses.top || bonuses.legs || bonuses.boots)
                ? "(multiplicative)"
                : ""}
            </span>
          </span>
          <span style={{ fontFamily: "'Source Code Pro', monospace", fontSize: 13, fontWeight: 700, color: C.green }}>
            ×{multiplier.toFixed(4)}
          </span>
        </div>
      )}
      {hasAny && (
        <div style={{ padding: "6px 14px 8px", fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
          Higher XP per chop means fewer chops to reach each level, reducing total pet rolls.
        </div>
      )}
    </div>
  );
}
