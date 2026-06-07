import { DEFAULT_SETTINGS } from "../hooks/useSettings.js";

function SettingSlider({ label, hint, settingKey, value, min, max, step, format, updateSetting }) {
  return (
    <div className="setting-row">
      <div className="setting-label-group">
        <label className="setting-label">{label}</label>
        {hint && <span className="setting-hint muted">{hint}</span>}
      </div>
      <div className="setting-control">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => updateSetting(settingKey, parseFloat(e.target.value))}
          className="setting-slider"
        />
        <span className="setting-val">{format ? format(value) : value}</span>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   settings: object;
 *   updateSetting: (key: string, value: any) => void;
 *   resetSettings: () => void;
 * }} props
 */
export function SettingsTab({ settings, updateSetting, resetSettings }) {
  const isDirty = Object.keys(DEFAULT_SETTINGS).some(
    (k) => settings[k] !== DEFAULT_SETTINGS[k]
  );

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <h3 className="settings-section-title">Recommendation Thresholds</h3>
        <p className="muted" style={{ marginBottom: "1.25rem", fontSize: "0.83rem" }}>
          Tasks are scored by a composite of XP/hr and GP/hr percentile ranks across all your
          logged tasks. These thresholds control when a task gets a particular badge.
        </p>

        <SettingSlider
          label="Skip below"
          hint="Tasks with a composite score below this percentile are flagged as Skip."
          settingKey="skipThreshold"
          value={settings.skipThreshold}
          min={5} max={50} step={5}
          format={(v) => `${v}th percentile`}
          updateSetting={updateSetting}
        />
        <SettingSlider
          label="Extend / Speedup above"
          hint="Tasks with a composite score above this percentile are flagged as Extend or Extend+Speedup."
          settingKey="extendThreshold"
          value={settings.extendThreshold}
          min={50} max={95} step={5}
          format={(v) => `${v}th percentile`}
          updateSetting={updateSetting}
        />
        <SettingSlider
          label="Speedup above"
          hint="Long tasks with a composite score above this percentile (but below Extend) are flagged as Speedup."
          settingKey="speedupThreshold"
          value={settings.speedupThreshold}
          min={20} max={69} step={5}
          format={(v) => `${v}th percentile`}
          updateSetting={updateSetting}
        />
        <SettingSlider
          label="Long task threshold"
          hint="Tasks longer than this many hours are eligible for the Speedup or Extend+Speedup badge."
          settingKey="longTaskHours"
          value={settings.longTaskHours}
          min={0.5} max={6} step={0.5}
          format={(v) => `${v}h`}
          updateSetting={updateSetting}
        />
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Composite Score Weights</h3>
        <p className="muted" style={{ marginBottom: "1.25rem", fontSize: "0.83rem" }}>
          The composite score is a weighted average of each task's XP/hr and GP/hr percentile
          ranks. Weights are normalised automatically.
        </p>

        <SettingSlider
          label="XP/hr weight"
          hint=""
          settingKey="xpWeight"
          value={settings.xpWeight}
          min={0} max={1} step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          updateSetting={updateSetting}
        />
        <SettingSlider
          label="GP/hr weight"
          hint=""
          settingKey="gpWeight"
          value={settings.gpWeight}
          min={0} max={1} step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          updateSetting={updateSetting}
        />
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Absolute Thresholds (few tasks)</h3>
        <p className="muted" style={{ marginBottom: "1.25rem", fontSize: "0.83rem" }}>
          Used when fewer than 2 tasks are logged, before percentile comparison is possible.
        </p>

        <SettingSlider
          label="Poor XP/hr below"
          settingKey="absoluteMinXpHr"
          value={settings.absoluteMinXpHr}
          min={5000} max={80000} step={5000}
          format={(v) => `${Math.round(v / 1000)}k XP/hr`}
          updateSetting={updateSetting}
        />
        <SettingSlider
          label="Good XP/hr above"
          settingKey="absoluteGoodXpHr"
          value={settings.absoluteGoodXpHr}
          min={20000} max={150000} step={5000}
          format={(v) => `${Math.round(v / 1000)}k XP/hr`}
          updateSetting={updateSetting}
        />
        <SettingSlider
          label="Poor GP/hr below"
          settingKey="absoluteMinGpHr"
          value={settings.absoluteMinGpHr}
          min={-500000} max={0} step={25000}
          format={(v) => `${Math.round(v / 1000)}k GP/hr`}
          updateSetting={updateSetting}
        />
        <SettingSlider
          label="Good GP/hr above"
          settingKey="absoluteGoodGpHr"
          value={settings.absoluteGoodGpHr}
          min={50000} max={2000000} step={50000}
          format={(v) => `${Math.round(v / 1000)}k GP/hr`}
          updateSetting={updateSetting}
        />
      </div>

      {isDirty && (
        <div className="settings-footer">
          <button type="button" className="btn-secondary" onClick={resetSettings}>
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
