
import { els } from '../core/domRefs.js';
import { GUIDS } from '../core/constants.js';
import { getWorkspaceId } from '../core/config.js';
import { fetchAllQuerySlim } from '../core/graph.js';
import { compareDatNames, escapeSingleQuotes, normalizeQuestion } from '../utils.js';

/**
 * Ensures the Long Text section exists in the DOM and wires toolbar actions.
 */
function ensureSection() {
  if (document.getElementById('longtext-section')) return;

  const section = document.createElement('section');
  section.id = 'longtext-section';
  section.setAttribute('aria-labelledby', 'longtext-label');
  section.hidden = true;

  const headerWrap = document.createElement('div');
  headerWrap.style.display = 'flex';
  headerWrap.style.alignItems = 'center';
  headerWrap.style.justifyContent = 'space-between';
  headerWrap.style.gap = '12px';

  const h2 = document.createElement('h2');
  h2.id = 'longtext-label';
  h2.textContent = 'Text Answers';
  headerWrap.appendChild(h2);

  const toolbar = document.createElement('div');
  toolbar.className = 'lt-toolbar';

  const expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className = 'primary';
  expandBtn.id = 'lt-expand-all';
  expandBtn.textContent = 'Expand all';

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.id = 'lt-collapse-all';
  collapseBtn.textContent = 'Collapse all';

  toolbar.appendChild(expandBtn);
  toolbar.appendChild(collapseBtn);
  headerWrap.appendChild(toolbar);

  section.appendChild(headerWrap);

  const container = document.createElement('div');
  container.id = 'longtext-answer-list';
  container.className = 'longtext-answer-container';
  section.appendChild(container);

  const mc = els.mcSection;
  const sc = document.getElementById('score-change-section');
  const ex = document.getElementById('extremes-section');

  if (mc && mc.parentNode) {
    let ref = null;
    if (ex && ex.parentNode === mc.parentNode) ref = ex.nextSibling;
    else if (sc && sc.parentNode === mc.parentNode) ref = sc.nextSibling;
    else ref = mc.nextSibling;
    mc.parentNode.insertBefore(section, ref);
  } else {
    document.body.appendChild(section);
  }

  document.getElementById('lt-expand-all').addEventListener('click', () => {
    document.querySelectorAll('#longtext-section details.lt-item')
      .forEach(d => (d.open = true));
  });
  document.getElementById('lt-collapse-all').addEventListener('click', () => {
    document.querySelectorAll('#longtext-section details.lt-item')
      .forEach(d => (d.open = false));
  });
}

function renderRows(rows) {
  ensureSection();

  const mount = document.getElementById('longtext-answer-list');
  const section = document.getElementById('longtext-section');
  mount.innerHTML = '';

  let count = 0;
  rows.forEach(obj => {
    const v = obj?.Values ?? [];
    const qText = normalizeQuestion(v?.[1] ?? '');
    const aText = v?.[2]?.Name ?? v?.[2] ?? '';

    if (!qText && !aText) return;

    const details = document.createElement('details');
    details.className = 'lt-item';

    const summary = document.createElement('summary');
    summary.className = 'lt-summary';
    summary.textContent = qText || '(Untitled question)';
    details.appendChild(summary);

    const pre = document.createElement('pre');
    pre.className = 'lt-answer';
    pre.textContent = String(aText ?? '');
    details.appendChild(pre);

    mount.appendChild(details);
    count++;
  });

  section.hidden = count === 0;
}

async function getMostRecentDatName() {
  const wsId = getWorkspaceId();

  const base = {
    Request: {
      ObjectType: { GUID: GUIDS.DAT_OBJ },
      fields: [{ GUID: GUIDS.DAT_NAME }],
      condition: '',
      sorts: []
    }
  };

  const rows = await fetchAllQuerySlim(wsId, base, 1000);
  const names = rows
    .map(o => o?.Values?.[0] ?? o?.Values?.[0]?.Name ?? '')
    .filter(Boolean);

  if (!names.length) return null;

  names.sort(compareDatNames);
  return names[names.length - 1];
}

export async function loadRespondentLongTextAnswers(respondentArtifactId) {
  const latest = await getMostRecentDatName();
  ensureSection();

  const label = document.getElementById('longtext-label');
  if (label) label.textContent = latest ? `Text Answers (${latest})` : 'Text Answers';

  if (!latest) {
    document.getElementById('longtext-section').hidden = true;
    return;
  }

  const wsId = getWorkspaceId();

  // FIXED CONDITION BUILDER
  const parts = [
    `'Question::Answer Type' == CHOICE ${GUIDS.TYPE_LONGTEXT}`,
    `'Respondent' IN OBJECT [${respondentArtifactId}]`,
    `'DAT' == '${escapeSingleQuotes(latest)}'`
  ];
  const condition = parts.join(' AND ');

  const base = {
    Request: {
      ObjectType: { GUID: GUIDS.ANSWER_OBJ },
      fields: [
        { GUID: GUIDS.QUESTION_ID },
        { GUID: GUIDS.QUESTION_TEXT },
        { GUID: GUIDS.LONG_TEXT }
      ],
      condition,
      sorts: []
    }
  };

  const rows = await fetchAllQuerySlim(wsId, base, 1000);
  renderRows(rows);
}
