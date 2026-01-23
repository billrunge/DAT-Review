
// assets/js/features/respondentReport.js
import { els } from "../core/domRefs.js";
import { GUIDS } from "../core/constants.js";
import { fetchAllQuerySlim } from "../core/graph.js";
import { getWorkspaceId } from "../core/config.js";
import {
  mapAnswer,
  normalizeQuestion,
  setStatus,
  compareDatNames,
} from "../utils.js";
import { replaceChartData } from "../ui/chart.js";
import { loadRespondentMultiChoiceAnswers } from "../ui/multiChoice.js";
import { loadRespondentLongTextAnswers } from "../ui/longText.js";
import { renderScoreChanges } from "../ui/scoreChanges.js";
import { getSelectedRespondentId } from "../ui/combobox.js";
import { setPrintHeader } from "../app.js";

export async function loadRespondentAnswers() {
  if (els.mcSection) els.mcSection.hidden = true;
  const sc = document.getElementById("score-change-section");
  if (sc) sc.hidden = true;
  const lt = document.getElementById("longtext-section");
  if (lt) lt.hidden = true;

  const id = getSelectedRespondentId();
  if (!id) {
    setStatus("Please choose a respondent.");
    els.input.focus();
    return;
  }

  // Set the dynamic print header with respondent + active vertical (if present)
  const respondentName = els.input?.value || "Selected respondent";
  const activeTab = els.teamBar?.querySelector("button.team-tab.active");
  const verticalName = activeTab?.dataset?.label || "";
  const header = verticalName
    ? `${respondentName} — ${verticalName}`
    : `${respondentName}`;
  setPrintHeader(header);

  setStatus("Loading respondent chart…");
  const ws = getWorkspaceId();

  const base = {
    Request: {
      ObjectType: { GUID: GUIDS.ANSWER_OBJ },
      fields: [
        { GUID: GUIDS.QUESTION_ID }, // [0]
        { GUID: GUIDS.SINGLE_CHOICE }, // [1]
        { GUID: GUIDS.DAT }, // [2]
        { GUID: GUIDS.YES_NO }, // [3]
        { GUID: GUIDS.QUESTION_TEXT }, // [4]
      ],
      condition:
        `('Respondent' IN OBJECT [${id}] AND (` +
        `'Question::Answer Type' == CHOICE ${GUIDS.TYPE_SINGLE} ` +
        `OR 'Question::Answer Type' == CHOICE ${GUIDS.TYPE_YESNO}))`,
      sorts: [{ Direction: "Ascending", FieldIdentifier: { GUID: GUIDS.DAT } }],
    },
  };

  const rows = await fetchAllQuerySlim(ws, base, 1000);

  const periods = Array.from(
    new Set(rows.map((r) => r.Values?.[2]?.Name).filter(Boolean)),
  );
  periods.sort(compareDatNames);
  const earliest = periods[0];
  const latest = periods[periods.length - 1];

  const series = {};
  const qTextMap = {};

  rows.forEach((r) => {
    const q = r.Values?.[0]?.Name;
    const qt = normalizeQuestion(r.Values?.[4]?.Name ?? r.Values?.[4] ?? q);
    const p = r.Values?.[2]?.Name;
    const raw = r?.Values?.[1]?.Name ?? r?.Values?.[3]?.Name ?? 0;

    if (!q || !p) return;
    series[q] ??= {};
    series[q][p] = mapAnswer(raw);
    if (qt && !qTextMap[q]) qTextMap[q] = qt;
  });

  const eligible = Object.keys(series).filter((q) =>
    periods.every((p) => series[q][p] !== undefined),
  );

  const totals = periods.map((p) =>
    eligible.reduce((s, q) => {
      const v = series[q][p];
      return Number.isFinite(v) ? s + v : s;
    }, 0),
  );

  replaceChartData(periods, totals);

  const changes = [];
  Object.keys(series).forEach((q) => {
    const from = series[q][earliest];
    const to = series[q][latest];
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    changes.push({
      qId: q,
      qText: qTextMap[q] ?? q,
      from,
      to,
      delta: to - from,
    });
  });

  renderScoreChanges(
    changes.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta),
    changes.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta),
    earliest,
    latest,
    5,
  );

  renderExtremes(rows, series, periods, qTextMap);

  await loadRespondentMultiChoiceAnswers(id);
  await loadRespondentLongTextAnswers(id);

  setStatus(`Chart updated. (${rows.length.toLocaleString()} records)`);

  // SHOW floating print button
  const fp = document.getElementById("floatingPrintBtn");
  if (fp) fp.hidden = false;
}

function renderExtremes(rows, series, periods, map) {
  const types = new Map();
  rows.forEach((r) => {
    const q = r.Values?.[0]?.Name;
    if (!q) return;
    const s = r.Values?.[1]?.Name !== undefined;
    const y = r.Values?.[3]?.Name !== undefined;
    const t = types.get(q) || { single: false, yesno: false };
    if (s) t.single = true;
    if (y) t.yesno = true;
    types.set(q, t);
  });

  const onlySingle = [...types.entries()]
    .filter(([, t]) => t.single === true && t.yesno !== true)
    .map(([q]) => q);

  const out = [];
  onlySingle.forEach((q) => {
    const vals = periods
      .map((p) => series[q]?.[p])
      .filter((v) => Number.isFinite(v));
    if (!vals.length) return;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    out.push({ qId: q, qText: map[q] ?? q, avg });
  });

  if (!out.length) return;

  out.sort((a, b) => a.avg - b.avg);
  const lowest = out.slice(0, 5);
  const highest = out.slice(-5).reverse();

  const anchor =
    document.getElementById("score-change-section") || els.mcSection;
  const parent = anchor?.parentNode || document.body;

  document.getElementById("extremes-section")?.remove();
  document.getElementById("extremes-section-header")?.remove();

  const header = document.createElement("h3");
  header.id = "extremes-section-header";
  header.textContent = "Respondent Strengths & Training Needs";

  const card = document.createElement("section");
  card.id = "extremes-section";
  card.className = "qa";

  const make = (t, items, up) => {
    const h3 = document.createElement("h3");
    h3.textContent = t;
    card.appendChild(h3);

    const ul = document.createElement("ul");
    items.forEach((it) => {
      const li = document.createElement("li");
      const row = document.createElement("div");
      row.className = "sc-row";

      const q = document.createElement("span");
      q.className = "sc-question";
      q.textContent = it.qText;

      const b = document.createElement("span");
      b.className = `sc-badge ${up ? "sc-up" : "sc-down"}`;

      const strong = document.createElement("strong");
      strong.textContent = it.avg.toFixed(2);

      const sub = document.createElement("span");
      sub.className = "sc-sub";
      sub.textContent = " avg";

      b.appendChild(strong);
      b.appendChild(sub);
      row.appendChild(q);
      row.appendChild(b);

      li.appendChild(row);
      ul.appendChild(li);
    });
    card.appendChild(ul);
  };

  make("Needs More Training (Lowest)", lowest, false);
  make("Confident / Potential SME (Highest)", highest, true);

  if (anchor) {
    parent.insertBefore(header, anchor.nextSibling);
    parent.insertBefore(card, header.nextSibling);
  } else {
    parent.appendChild(header);
    parent.appendChild(card);
  }
}
