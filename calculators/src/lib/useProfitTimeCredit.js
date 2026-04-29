import { useState, useEffect } from 'react';
import { loadProfitTimeCredit, saveProfitTimeCredit } from './calculatorStorage.js';

/**
 * Shared toggle: treat GP profit as negative gather time (same preference on all calculator pages).
 */
export function useProfitTimeCredit() {
  const [profitTimeCredit, setProfitTimeCredit] = useState(loadProfitTimeCredit);

  useEffect(() => {
    saveProfitTimeCredit(profitTimeCredit);
  }, [profitTimeCredit]);

  return [profitTimeCredit, setProfitTimeCredit];
}
