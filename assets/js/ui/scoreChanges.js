import { els } from "../core/domRefs.js";
function ensure() {
  if (document.getElementById("score-change-section")) return;
  const s = document.createElement("section");
  s.id = "score-change-section";
  s.setAttribute("aria-labelledby", "score-change-label");
  s.hidden = true;
  const c = document.createElement("div");
  c.id = "score-change-list";
  s.appendChild(c);
  const mc = els.mcSection;
  if (mc && mc.parentNode) mc.parentNode.insertBefore(s, mc.nextSibling);
  else document.body.appendChild(s);
}
export function renderScoreChanges(inc, dec, earliest, latest, topN = 5) {
  ensure();
  const s = document.getElementById("score-change-section");
  const m = document.getElementById("score-change-list");
  m.innerHTML = "";
  const hasI = Array.isArray(inc) && inc.length > 0;
  const hasD = Array.isArray(dec) && dec.length > 0;
  if (!hasI && !hasD) {
    s.hidden = true;
    return;
  }
  function add(t, items) {
    const h = document.createElement("h3");
    h.textContent = `${t} (${earliest} → ${latest})`;
    m.appendChild(h);
    const card = document.createElement("div");
    card.className = "qa";
    const ul = document.createElement("ul");
    items.forEach((it) => {
      const li = document.createElement("li");
      const row = document.createElement("div");
      row.className = "sc-row";
      const q = document.createElement("span");
      q.className = "sc-question";
      q.textContent = it.qText;
      const b = document.createElement("span");
      b.className = `sc-badge ${it.delta > 0 ? "sc-up" : "sc-down"}`;
      const strong = document.createElement("strong");
      strong.textContent = it.delta > 0 ? `+${it.delta}` : `${it.delta}`;
      const sub = document.createElement("span");
      sub.className = "sc-sub";
      sub.textContent = ` (${it.from} → ${it.to})`;
      b.appendChild(strong);
      b.appendChild(sub);
      row.appendChild(q);
      row.appendChild(b);
      li.appendChild(row);
      ul.appendChild(li);
    });
    card.appendChild(ul);
    m.appendChild(card);
  }
  if (hasI) add("Noteable increases", inc.slice(0, topN));
  if (hasD) add("Noteable decreases", dec);
  s.hidden = false;
}
