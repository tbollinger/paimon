import React from 'react';
import { useApi } from '../hooks/use-api.js';
import { formatCurrency } from '../utils/format.js';

export default function BudgetAlert() {
  const { data: budget } = useApi('/api/budget');

  if (!budget) return null;

  const { daily, monthly } = budget;
  const showDaily = daily.budget > 0 && daily.percent >= 70;
  const showMonthly = monthly.budget > 0 && monthly.percent >= 70;

  if (!showDaily && !showMonthly) return null;

  const maxPercent = Math.max(daily.percent || 0, monthly.percent || 0);
  const level = maxPercent >= 90 ? 'danger' : 'warning';
  const bgColor = level === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)';
  const borderColor = level === 'danger' ? 'var(--danger)' : 'var(--warning)';

  return (
    <div style={{
      background: bgColor, border: `1px solid ${borderColor}`,
      borderRadius: 8, padding: '10px 16px', marginBottom: 16,
      display: 'flex', gap: 24, fontSize: 16,
    }}>
      {showDaily && (
        <span>
          Daily: {formatCurrency(daily.spent)} / {formatCurrency(daily.budget)} ({daily.percent.toFixed(0)}%)
        </span>
      )}
      {showMonthly && (
        <span>
          Monthly: {formatCurrency(monthly.spent)} / {formatCurrency(monthly.budget)} ({monthly.percent.toFixed(0)}%)
        </span>
      )}
    </div>
  );
}
