
// assets/js/ui/teamStrengths.js
// Renders a "Strengths & Training Needs" section for the currently selected team/vertical.

import { normalizeQuestion, compareDatNames, mapAnswer } from '../utils.js';

export function renderTeamStrengths(rows, { topN = 5, minResponses = 2 } = {}) {
  const sectionId = 'team-strengths-section';
  const containerId = 'team-strengths-list';
  ensureSection(sectionId, containerId);

  // 1) Latest DAT
  const periods = [...new Set((rows ?? []).map(r => r?.Values?.[2]?.Name).filter(Boolean))];
  if (periods.length === 0) {
    renderEmpty(containerId, 'No DAT periods found.');
    return;
  }
  periods.sort(compareDatNames);
  const latest = periods[periods.length - 1];

  // 2) Aggregate Single-Choice per question for latest period
  const byQuestion = new Map(); // qId -> { text, sum, count }
  for (const r of rows ?? []) {
    const dat = r?.Values?.[2]?.Name;
    if (dat !== latest) continue;

    const singleChoiceName = r?.Values?.[1]?.Name;
    if (!singleChoiceName) continue; // excludes Yes/No implicitly

    const qId = r?.Values?.[0]?.Name ?? r?.Values?.[0];
    if (!qId) continue;

    // 🔧 Prefer [5] (your vertical rows), then [4], then ID/name fallbacks
    const qTextRaw =
      r?.Values?.[5]?.Name ?? r?.Values?.[5] ??
      r?.Values?.[4]?.Name ?? r?.Values?.[4] ??
      r?.Values?.[0]?.Name ?? r?.Values?.[0] ?? qId;

    const qText = normalizeQuestion(qTextRaw);
    const score = mapAnswer(singleChoiceName);
    if (!Number.isFinite(score)) continue;

    const acc = byQuestion.get(qId) ?? { text: qText, sum: 0, count: 0 };
    acc.sum += score;
    acc.count += 1;
    byQuestion.set(qId, acc);
  }

  // 3) Build averages with min sample size
  const list = [];
  for (const [, v] of byQuestion) {
    if ((v.count ?? 0) < minResponses) continue;
    list.push({ text: v.text, avg: v.sum / v.count, count: v.count });
  }
  if (list.length === 0) {
    renderEmpty(containerId, 'No eligible single‑choice data found for the latest DAT.');
    return;
  }

  // 4) Lowest / Highest
  const needs = [...list].sort((a, b) => a.avg - b.avg).slice(0, topN);
  const strengths = [...list].sort((a, b) => b.avg - a.avg).slice(0, topN);

  // 5) Render
  const mount = document.getElementById(containerId);
  mount.innerHTML = '';

  const hdr = document.createElement('div');
  hdr.className = 'stn-header';
  hdr.innerHTML = `
    <div class="stn-subtitle">Latest DAT: <strong>${latest}</strong></div>
  `;
  mount.appendChild(hdr);

  const grid = document.createElement('div');
  grid.className = 'stn-grid';
  grid.appendChild(makeList('Deltas', needs));
  grid.appendChild(makeList('Strengths', strengths));
  mount.appendChild(grid);
}

/* ---------- DOM helpers ---------- */

function ensureSection(sectionId, containerId) {
  if (document.getElementById(sectionId)) return;

  const section = document.createElement('section');
  section.id = sectionId;
  section.setAttribute('aria-labelledby', `${sectionId}-label`);
  section.className = 'stn-section';

  const h2 = document.createElement('h2');
  h2.id = `${sectionId}-label`;
  h2.textContent = 'Strengths & Training Needs';
  h2.className = 'stn-visually-hidden';

  const body = document.createElement('div');
  body.id = containerId;

  section.appendChild(h2);
  section.appendChild(body);

  const chartContainer = (document.getElementById('answersChart') || {}).parentElement;
  if (chartContainer && chartContainer.parentElement) {
    chartContainer.parentElement.appendChild(section);
  } else {
    document.body.appendChild(section);
  }
}

function renderEmpty(containerId, msg) {
  const mount = document.getElementById(containerId);
  if (!mount) return;
  mount.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'stn-empty';
  p.textContent = msg;
  mount.appendChild(p);
}

function makeList(title, items) {
  const block = document.createElement('div');
  block.className = 'stn-block';

  const h3 = document.createElement('h3');
  h3.textContent = title;
  block.appendChild(h3);

  const ul = document.createElement('ul');
  ul.className = 'stn-list';

  items.forEach(({ text, avg, count }) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="stn-question">${text}</span>
      <span class="stn-metric" aria-label="Average score">${Number(avg).toFixed(2)}</span>
      <span class="stn-count" aria-label="Responses">(${count})</span>`;
    ul.appendChild(li);
  });

  block.appendChild(ul);
  return block;
}

/* ---------- reset API ---------- */

export function clearTeamStrengths() {
  const section = document.getElementById('team-strengths-section');
  if (!section) return;
  section.remove();
}
