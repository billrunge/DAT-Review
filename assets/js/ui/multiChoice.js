import { els } from "../core/domRefs.js";
import { GUIDS } from "../core/constants.js";
import { fetchAllQuerySlim } from "../core/graph.js";
import { getWorkspaceId } from "../core/config.js";
import { normalizeQuestion } from "../utils.js";
function group(response) {
  const g = new Map();
  (response.Objects ?? response.Data?.Objects ?? []).forEach((o) => {
    const v = o?.Values ?? [];
    const q = normalizeQuestion(v[0] ?? "").trim();
    const d = v[2]?.Name ?? "";
    const c = Array.isArray(v[1]) ? v[1] : [];
    if (!g.has(q)) g.set(q, []);
    g.get(q).push({ datName: d, choices: c });
  });
  return g;
}
function render(response, mount) {
  const g = group(response);
  const frag = document.createDocumentFragment();
  let rendered = 0;
  for (const [q, entries] of g.entries()) {
    const s = document.createElement("section");
    s.className = "qa";
    const h4 = document.createElement("h4");
    h4.textContent = q || "(Untitled question)";
    s.appendChild(h4);
    const row = document.createElement("div");
    row.className = "dat-row";
    entries.forEach(({ datName, choices }) => {
      const col = document.createElement("div");
      col.className = "dat-col";
      const dat = document.createElement("div");
      dat.className = "dat";
      dat.textContent = datName || "(not set)";
      col.appendChild(dat);
      if (choices?.length) {
        const ul = document.createElement("ul");
        for (const ch of choices) {
          const li = document.createElement("li");
          li.textContent = ch?.Name ?? "(unnamed)";
          ul.appendChild(li);
        }
        col.appendChild(ul);
        rendered++;
      } else {
        const e = document.createElement("div");
        e.className = "empty";
        e.textContent = "No answers provided.";
        col.appendChild(e);
      }
      row.appendChild(col);
    });
    s.appendChild(row);
    frag.appendChild(s);
  }
  mount.innerHTML = "";
  mount.appendChild(frag);
  if (els.mcSection) els.mcSection.hidden = g.size === 0 || rendered === 0;
}
export async function loadRespondentMultiChoiceAnswers(id) {
  const ws = getWorkspaceId();
  const base = {
    Request: {
      ObjectType: { GUID: GUIDS.ANSWER_OBJ },
      fields: [
        { GUID: GUIDS.QUESTION_TEXT },
        { GUID: GUIDS.MULTI_CHOICE },
        { GUID: GUIDS.DAT },
      ],
      condition: `'Respondent' IN OBJECT [${id}] AND 'Question::Answer Type' == CHOICE ${GUIDS.TYPE_MULTI}`,
      sorts: [{ Direction: "Ascending", FieldIdentifier: { GUID: GUIDS.DAT } }],
    },
  };
  const rows = await fetchAllQuerySlim(ws, base, 1000);
  render({ Objects: rows }, els.multiList);
}
