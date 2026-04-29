import { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
} from 'chart.js';
import { formatHours } from '../lib/format.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip);

/**
 * @param {object} props
 * @param {string[]} props.labels
 * @param {object[]} props.datasets
 * @param {{ grid: string; tick: string; title: string; tooltipBg?: string }} props.colors
 * @param {string} [props.subtitle]
 * @param {boolean} [props.allowNegativeY] When true, Y axis is not clamped at 0 (for profit gather credits).
 */
export function TrainingTimeChart({ labels, datasets, colors, subtitle, allowNegativeY = false }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !labels?.length || !datasets?.length) return;

    const mono = "'Source Code Pro',monospace";
    const opts = {
      responsive: true,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: colors.tick,
            font: { family: mono, size: 9 },
            boxWidth: 22,
            padding: 9,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: colors.tooltipBg ?? '#111620',
          borderColor: colors.grid,
          borderWidth: 1,
          titleColor: colors.title,
          titleFont: { family: mono, size: 10 },
          bodyColor: colors.tick,
          bodyFont: { family: mono, size: 10 },
          callbacks: {
            title: (items) => `${labels[items[0].dataIndex]}/hr`,
            label: (ctx) => {
              const pi = ctx.dataIndex;
              const suffix = ctx.dataset.envelopeRow ? ` \u2192 ${ctx.dataset.envelopeRow[pi]}` : '';
              return ` ${ctx.dataset.label}${suffix}: ${formatHours(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.tick,
            font: { family: mono, size: 9 },
            maxTicksLimit: 14,
            maxRotation: 45,
          },
          title: {
            display: true,
            text: 'GP / hour',
            color: colors.tick,
            font: { family: mono, size: 10 },
          },
        },
        y: {
          grid: { color: colors.grid },
          ticks: {
            color: colors.tick,
            font: { family: mono, size: 9 },
            callback: (v) => formatHours(v),
          },
          title: {
            display: true,
            text: 'Total time (gather + train)',
            color: colors.tick,
            font: { family: mono, size: 10 },
          },
          ...(allowNegativeY ? {} : { min: 0 }),
        },
      },
    };

    if (!chartRef.current) {
      chartRef.current = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: opts,
      });
    } else {
      chartRef.current.data.labels = labels;
      chartRef.current.data.datasets = datasets;
      chartRef.current.options = opts;
      chartRef.current.update('none');
    }
  }, [labels, datasets, colors, allowNegativeY]);

  useEffect(
    () => () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    },
    [],
  );

  if (!labels?.length || !datasets?.length) return null;

  return (
    <div className="panel">
      <div className="tbl-hdr">
        <div className="panel-title" style={{ marginBottom: 0 }}>
          Training time vs GP/hour
        </div>
        <div className="tbl-sub">
          {subtitle ??
            'Methods within a tolerance band of the best at some income rate (unified across calculators)'}
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%', marginTop: '0.85rem' }}>
        <canvas ref={canvasRef} />
      </div>
      <div
        style={{
          marginTop: '0.55rem',
          fontFamily: "'Source Code Pro',monospace",
          fontSize: '0.62rem',
          color: 'var(--text-dim)',
        }}
      >
        Hover for details · First line = optimal envelope
      </div>
    </div>
  );
}
