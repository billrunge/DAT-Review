
// assets/js/ui/chart.js
// Centralized Chart.js configuration + helpers used by the DAT Review page.

import { els } from '../core/domRefs.js';
import { clearTeamStrengths } from './teamStrengths.js';

let chart = null;

function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function theme() {
  const text   = cssVar('--text') || '#0f172a';
  const grid   = cssVar('--border') || '#e5e8f0';
  const brand  = cssVar('--brand') || '#2b5eff';
  const brandA = cssVar('--brand-alpha-20') || 'rgba(43,94,255,.20)';
  const font   = cssVar('--font-sans') || 'system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
  const tooltipBg = cssVar('--tooltip-bg') || cssVar('--bg') || '#ffffff';
  return { text, grid, brand, brandA, font, tooltipBg };
}

function applyChartDefaults() {
  const t = theme();
  if (typeof Chart === 'undefined') return;

  Chart.defaults.color = t.text;
  Chart.defaults.font.family = t.font;

  Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};
  Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
  Chart.defaults.plugins.legend.labels.color = t.text;

  Chart.defaults.plugins.tooltip = Chart.defaults.plugins.tooltip || {};
  Chart.defaults.plugins.tooltip.enabled = true;
  Chart.defaults.plugins.tooltip.titleColor = t.text;
  Chart.defaults.plugins.tooltip.bodyColor  = t.text;
  Chart.defaults.plugins.tooltip.backgroundColor = t.tooltipBg;
  Chart.defaults.plugins.tooltip.borderColor     = t.grid;
  Chart.defaults.plugins.tooltip.borderWidth     = 1;
  Chart.defaults.plugins.tooltip.padding         = 10;
  Chart.defaults.plugins.tooltip.displayColors   = true;
  Chart.defaults.plugins.tooltip.boxWidth        = 8;
  Chart.defaults.plugins.tooltip.boxHeight       = 8;
  Chart.defaults.plugins.tooltip.boxPadding      = 4;

  Chart.defaults.scales = Chart.defaults.scales || {};
  Chart.defaults.scales.x = Chart.defaults.scales.x || {};
  Chart.defaults.scales.y = Chart.defaults.scales.y || {};
  Chart.defaults.scales.x.grid  = { ...(Chart.defaults.scales.x.grid  || {}), color: t.grid };
  Chart.defaults.scales.x.ticks = { ...(Chart.defaults.scales.x.ticks || {}), color: t.text };
  Chart.defaults.scales.y.grid  = { ...(Chart.defaults.scales.y.grid  || {}), color: t.grid };
  Chart.defaults.scales.y.ticks = { ...(Chart.defaults.scales.y.ticks || {}), color: t.text };
}

const themeObserver = new MutationObserver(() => {
  applyChartDefaults();
  const c = getChart();
  if (c) c.update();
});
try {
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
} catch {}

function getChart() { return chart || null; }

export function destroyChart() {
  const c = getChart();
  if (c && typeof c.destroy === 'function') c.destroy();
  chart = null;

  const canvas = els?.chartCanvas || document.getElementById('answersChart');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function ensureChart() {
  if (typeof Chart === 'undefined') {
    throw new Error('Chart library not loaded.');
  }
  if (!chart) {
    applyChartDefaults();
    const canvas = els?.chartCanvas || document.getElementById('answersChart');
    if (!canvas) {
      console.error('[DAT] Chart canvas not found (expected id="answersChart").');
      return null;
    }
    chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: { responsive: true, maintainAspectRatio: true, animation: { duration: 250 } }
    });
  }
  return chart;
}

export function replaceChartData(labels, totals, datasetLabel = 'Total score') {
  const container =
    (els?.chartCanvas && els.chartCanvas.parentElement) ||
    document.getElementById('answersChart')?.parentElement;
  if (container) container.hidden = false;

  const c = ensureChart();
  if (!c) return;

  const t = theme();

  c.data.labels = Array.isArray(labels) ? labels : [];
  c.data.datasets = [
    {
      type: 'bar',
      data: Array.isArray(totals) ? totals : [],
      label: datasetLabel,
      backgroundColor: t.brandA,
      borderColor: t.brand,
      borderWidth: 1.25,
      borderRadius: 6,
    }
  ];

  c.options = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.raw;
            const val = Number.isFinite(v) ? v : '—';
            return `${ctx.dataset.label}: ${val}`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Combined scores (fully covered respondent–question pairs)',
        },
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: theme().grid },
        grace: '50%',
      },
      x: {
        ticks: { autoSkip: true, maxRotation: 0, color: theme().text },
        grid: { color: theme().grid }
      }
    }
  };

  c.update();
}

export function clearReportAreas() {
  try { destroyChart(); } catch {}
  const container =
    (els?.chartCanvas && els.chartCanvas.parentElement) ||
    document.getElementById('answersChart')?.parentElement;
  if (container) container.hidden = true;

  // Hide floating print button
  const fp = document.getElementById("floatingPrintBtn");
  if (fp) fp.hidden = true;

  // Also clear Strengths & Training Needs
  try { clearTeamStrengths(); } catch {}

  if (els?.chartStatus) els.chartStatus.textContent = '';
  if (els?.multiList) els.multiList.innerHTML = '';
  if (els?.mcSection) els.mcSection.hidden = true;

  const scList = document.getElementById('score-change-list');
  const scSection = document.getElementById('score-change-section');
  if (scList) scList.innerHTML = '';
  if (scSection) scSection.hidden = true;

  const ltList = document.getElementById('longtext-answer-list');
  const ltSection = document.getElementById('longtext-section');
  if (ltList) ltList.innerHTML = '';
  if (ltSection) ltSection.hidden = true;

  const exHeader = document.getElementById('extremes-section-header');
  const exSection = document.getElementById('extremes-section');
  if (exHeader) exHeader.remove();
  if (exSection) exSection.remove();
}
