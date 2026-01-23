
import { els } from '../core/domRefs.js';
import { GUIDS } from '../core/constants.js';
import { fetchAllQuerySlim } from '../core/graph.js';
import { getWorkspaceId } from '../core/config.js';
import { normalizeQuestion, compareDatNames } from '../utils.js';

function aggregate(rows) {
  const periodsSet = new Set();
  const byQuestion = new Map();
  rows.forEach(obj => {
    const v = obj?.Values ?? [];
    const qRaw = v[0] ?? '';
    const question = normalizeQuestion(qRaw) || '(Untitled question)';
    const datName = v[2]?.Name ?? '';
    const choices = Array.isArray(v[1]) ? v[1] : [];
    if (!datName) return;

    periodsSet.add(datName);

    if (!byQuestion.has(question)) byQuestion.set(question, new Map());
    const perDat = byQuestion.get(question);
    if (!perDat.has(datName)) perDat.set(datName, new Map());
    const counts = perDat.get(datName);

    for (const ch of choices) {
      const name = ch?.Name ?? '(unnamed)';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  });

  const periods = Array.from(periodsSet);
  periods.sort(compareDatNames);
  return { periods, byQuestion };
}

function renderAggregated({ periods, byQuestion }) {
  const mount = els.multiList;
  mount.innerHTML = '';
  let rendered = 0;

  for (const [question, perDat] of byQuestion.entries()) {
    const section = document.createElement('section');
    section.className = 'qa';

    const h4 = document.createElement('h4');
    h4.textContent = question || '(Untitled question)';
    section.appendChild(h4);

    const row = document.createElement('div');
    row.className = 'dat-row';

    periods.forEach(dat => {
      const col = document.createElement('div');
      col.className = 'dat-col';

      const datEl = document.createElement('div');
      datEl.className = 'dat';
      datEl.textContent = dat || '(not set)';
      col.appendChild(datEl);

      const counts = perDat.get(dat);
      if (counts && counts.size > 0) {
        const items = Array.from(counts.entries()).sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return String(a[0]).localeCompare(String(b[0]), undefined, { sensitivity: 'base' });
        });

        const ul = document.createElement('ul');
        for (const [choiceName, n] of items) {
          const li = document.createElement('li');
          const nameSpan = document.createElement('span');
          nameSpan.textContent = choiceName;

          const countSpan = document.createElement('span');
          countSpan.className = 'mc-count-badge';
          countSpan.textContent = n;

          li.appendChild(nameSpan);
          li.appendChild(countSpan);
          ul.appendChild(li);
        }
        col.appendChild(ul);
        rendered++;
      } else {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No answers provided.';
        col.appendChild(empty);
      }

      row.appendChild(col);
    });

    section.appendChild(row);
    mount.appendChild(section);
  }

  if (els.mcSection) {
    els.mcSection.hidden = byQuestion.size === 0 || rendered === 0;
  }
}

export async function loadTeamMultiChoiceAnswers(verticalChoiceGuid) {
  const wsId = getWorkspaceId();

  // ✅ FIX: build the condition with safe spacing
  const parts = [
    `'Question::Answer Type' == CHOICE ${GUIDS.TYPE_MULTI}`,
    `'Question::Verticals' == CHOICE ${verticalChoiceGuid}`
  ];
  const condition = parts.join(' AND ');

  const base = {
    Request: {
      ObjectType: { GUID: GUIDS.ANSWER_OBJ },
      fields: [
        { GUID: GUIDS.QUESTION_TEXT },  // [0]
        { GUID: GUIDS.MULTI_CHOICE },   // [1]
        { GUID: GUIDS.DAT }             // [2]
      ],
      condition,
      sorts: [{ Direction: 'Ascending', FieldIdentifier: { GUID: GUIDS.DAT } }]
    }
  };

  const rows = await fetchAllQuerySlim(wsId, base, 1000);
  const agg = aggregate(rows);
  renderAggregated(agg);
}
