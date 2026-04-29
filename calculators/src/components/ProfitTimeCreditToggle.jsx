import { useId } from 'react';

/**
 * Lives inside the Gold accumulation rate panel; uses page theme (--accent*, etc.).
 */
export function ProfitTimeCreditToggle({ enabled, onChange }) {
  const titleId = useId();
  return (
    <div className="profit-credit-block" role="group" aria-labelledby={titleId}>
      <div className="profit-credit-block__accent" aria-hidden="true" />
      <div className="profit-credit-block__body">
        <div className="profit-credit-block__eyebrow">Effective time</div>
        <label className="profit-credit-block__row">
          <input
            type="checkbox"
            className="profit-credit-block__chk"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="profit-credit-block__copy">
            <span id={titleId} className="profit-credit-block__title">
              Credit profit as gather time
            </span>
            <span className="profit-credit-block__hint">
              When on, methods with positive GP/XP get negative gather time so they rank faster: GP earned while
              training is time saved at your GP/hour (same formula as costing methods, applied to profit).
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
