
// assets/js/features/verticalReport.js
import { els } from '../core/domRefs.js';
import { GUIDS, ROUTES } from '../core/constants.js';
import { fetchJson } from '../core/http.js';
import { getWorkspaceId } from '../core/config.js';
import { fetchAllQuerySlim } from '../core/graph.js';
import { mapAnswer, setStatus, normalizeQuestion } from '../utils.js';
import { replaceChartData, clearReportAreas } from '../ui/chart.js';
import { renderScoreChanges } from '../ui/scoreChanges.js';
import { reloadRespondentsForVertical } from '../ui/combobox.js';
// NEW: strengths section for teams
import { renderTeamStrengths } from '../ui/teamStrengths.js';

/**
 * Load vertical (choice parent) buttons and wire up tab behavior.
 * Exports: loadVerticals()
 */
export async function loadVerticals() {
  const wsId = getWorkspaceId();

  // Get the list of vertical Choice Parents
  const body = { FieldIdentifier: { Guids: [GUIDS.VERTICALS_FIELD] } };
  const data = await fetchJson(ROUTES.choiceParents(wsId), {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // Sort A→Z for stable UX
  data.sort((a, b) => (a?.Name ?? '').localeCompare(b?.Name ?? '', undefined, { sensitivity: 'base' }));

  renderTeamButtons(data);
}

/**
 * Render the vertical tab strip and wire up click/keyboard behavior.
 */
function renderTeamButtons(data) {
  const container = els.teamBar;
  container.innerHTML = '';
  container.classList.add('team-tabs');
  container.setAttribute('role', 'tablist');
  container.setAttribute('aria-label', 'Verticals');

  (data ?? []).forEach((team) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'team-tab';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.tabIndex = -1;

    const choiceGuid = team.Guids?.[0] ?? '';
    btn.dataset.choiceGuid = choiceGuid;
    btn.dataset.artifactId = team.ArtifactID ?? '';
    btn.dataset.label = team.Name ?? '';
    btn.textContent = team.Name;

    btn.addEventListener('click', async () => {
      setActiveTab(container, btn);
      clearReportAreas();
      if (btn.dataset.choiceGuid) {
        await reloadRespondentsForVertical(btn.dataset.choiceGuid);
      }
      setStatus('Choose a respondent or click "Load Vertical Report".');
    });

    container.appendChild(btn);
  });

  // Activate first tab by default and pre-load its respondent list
  const first = container.querySelector('button[role="tab"]');
  if (first) {
    setActiveTab(container, first);
    requestAnimationFrame(async () => {
      if (first.dataset.choiceGuid) {
        await reloadRespondentsForVertical(first.dataset.choiceGuid);
      }
      setStatus('Choose a respondent or click "Load Vertical Report".');
    });
  }

  // Keyboard support (Left/Right)
  container.addEventListener('keydown', (e) => {
    const tabs = [...container.querySelectorAll('button[role="tab"]')];
    const active = container.querySelector('button.active');
    const i = tabs.indexOf(active);
    if (e.key === 'ArrowRight') tabs[i + 1]?.click();
    if (e.key === 'ArrowLeft') tabs[i - 1]?.click();
  });
}

function setActiveTab(container, newActive) {
  container.querySelectorAll('button[role="tab"]').forEach((b) => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = -1;
  });
  newActive.classList.add('active');
  newActive.setAttribute('aria-selected', 'true');
  newActive.tabIndex = 0;
}

/**
 * Build the Team (vertical) chart and score changes for SingleChoice + Yes/No,
 * then load the Team-level MultiChoice aggregation in a separate module.
 *
 * Exports: loadTeamAnswers()
 *
 * @param {{ guid: string, artifactId?: number|null, name?: string }} verticalChoice
 */
export async function loadTeamAnswers(verticalChoice) {
  if (els.mcSection) els.mcSection.hidden = true;
  if (els.pageHeader) els.pageHeader.hidden = true;

  setStatus(`Loading team answers for ${verticalChoice?.name ?? 'selected vertical'}…`);

  const wsId = getWorkspaceId();

  // NOTE: This condition already has correct spacing and parentheses.
  // It includes both SingleChoice and Yes/No, limited to the selected Vertical.
  const base = {
    Request: {
      ObjectType: { GUID: GUIDS.ANSWER_OBJ },
      fields: [
        { GUID: GUIDS.QUESTION_ID },    // [0]
        { GUID: GUIDS.SINGLE_CHOICE },  // [1]
        { GUID: GUIDS.DAT },            // [2]
        { GUID: GUIDS.RESPONDENT_REF }, // [3]
        { GUID: GUIDS.YES_NO },         // [4]
        { GUID: GUIDS.QUESTION_TEXT },  // [5]  <-- Question Text index
      ],
      condition:
        `('Question::Answer Type' == CHOICE ${GUIDS.TYPE_SINGLE} ` +
        `OR 'Question::Answer Type' == CHOICE ${GUIDS.TYPE_YESNO}) ` +
        `AND 'Question::Verticals' == CHOICE ${verticalChoice.guid}`,
      sorts: [{ Direction: 'Ascending', FieldIdentifier: { GUID: GUIDS.DAT } }],
    },
  };

  // Pull all pages
  const rows = await fetchAllQuerySlim(wsId, base, 1000);

  // Team MultiChoice rendering area should start empty
  if (els.multiList) els.multiList.innerHTML = '';

  // Build period axis
  const periods = [...new Set(rows.map((r) => r.Values?.[2]?.Name).filter(Boolean))];
  const earliest = periods[0];
  const latest = periods[periods.length - 1];

  // series[qId][respondent][period] = numericValue
  const series = {};
  const qTextMap = {};

  rows.forEach((r) => {
    const qId = r.Values?.[0]?.Name;
    const single = r.Values?.[1]?.Name;
    const period = r.Values?.[2]?.Name;
    const respondent = r.Values?.[3]?.Name;
    const yesno = r.Values?.[4]?.Name;
    const qTextRaw = r.Values?.[5]?.Name ?? r.Values?.[5]; // <-- reads [5]
    const valRaw = single ?? yesno ?? 0;

    if (!qId || !period || !respondent) return;

    series[qId] ??= {};
    series[qId][respondent] ??= {};
    series[qId][respondent][period] = mapAnswer(valRaw);

    const qt = normalizeQuestion(qTextRaw ?? qId);
    if (qt && !qTextMap[qId]) qTextMap[qId] = qt;
  });

  // Determine fully-covered respondent–question pairs
  const eligiblePairs = [];
  Object.keys(series).forEach((qId) => {
    Object.keys(series[qId]).forEach((resp) => {
      const map = series[qId][resp];
      const ok = periods.every((p) => map[p] !== undefined);
      if (ok) eligiblePairs.push({ qId, resp });
    });
  });

  // Chart totals per period
  const totals = periods.map((p) => {
    let sum = 0;
    for (const { qId, resp } of eligiblePairs) {
      const v = series[qId][resp][p];
      if (Number.isFinite(v)) sum += v;
    }
    return sum;
  });

  replaceChartData(periods, totals);

  // NEW: strengths & training needs for this team (latest DAT)
  renderTeamStrengths(rows, { topN: 5, minResponses: 2 });

  // Render Team MultiChoice aggregation
  import('./teamMultiChoiceAgg.js').then((m) => m.loadTeamMultiChoiceAnswers(verticalChoice.guid));

  // Score changes
  const changes = [];
  Object.keys(series).forEach((qId) => {
    const respondents = Object.keys(series[qId] ?? {});
    const eligibleRespondents = respondents.filter((resp) =>
      periods.every((p) => series[qId][resp][p] !== undefined)
    );
    if (eligibleRespondents.length === 0) return;

    const avg = (period) => {
      let sum = 0;
      let count = 0;
      for (const resp of eligibleRespondents) {
        const v = series[qId][resp][period];
        if (Number.isFinite(v)) {
          sum += v;
          count++;
        }
      }
      return count > 0 ? sum / count : NaN;
    };

    const from = avg(earliest);
    const to = avg(latest);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;

    changes.push({
      qId,
      qText: qTextMap[qId] ?? qId,
      from: Math.round(from * 100) / 100,
      to: Math.round(to * 100) / 100,
      delta: Math.round((to - from) * 100) / 100,
    });
  });

  renderScoreChanges(
    changes.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta),
    changes.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta),
    earliest,
    latest,
    5
  );

  setStatus(`Team chart updated. (${rows.length.toLocaleString()} records)`);
}
