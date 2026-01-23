import { els } from "./core/domRefs.js";
export function mapAnswer(raw) {
  const r = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (r.startsWith("(") && r.length > 2) {
    const n = Number(r.charAt(1));
    if (!Number.isNaN(n)) return n;
  }
  if (r === "true") return 1;
  if (r === "false") return 0;
  const n = Number(r);
  return Number.isNaN(n) ? NaN : n;
}
export function normalizeQuestion(html) {
  const d = document.createElement("div");
  d.innerHTML = html ?? "";
  return d.textContent || d.innerText || "";
}
export function throttle(
  fn,
  wait = 150,
  o = { leading: true, trailing: true },
) {
  let last = 0,
    tid = null,
    args,
    ctx;
  return function (...g) {
    const now = Date.now();
    if (!last && o.leading === false) last = now;
    const rem = wait - (now - last);
    args = g;
    ctx = this;
    if (rem <= 0 || rem > wait) {
      if (tid) {
        clearTimeout(tid);
        tid = null;
      }
      last = now;
      fn.apply(ctx, args);
      args = ctx = null;
    } else if (!tid && o.trailing !== false) {
      tid = setTimeout(() => {
        last = o.leading === false ? 0 : Date.now();
        tid = null;
        fn.apply(ctx, args);
        args = ctx = null;
      }, rem);
    }
  };
}
export function setStatus(text) {
  els?.chartStatus && (els.chartStatus.textContent = text ?? "");
}
export function escapeSingleQuotes(str) {
  return String(str ?? "").replace(/'/g, "\\'");
}
export function parseDatName(name) {
  const s = String(name ?? "")
    .trim()
    .toUpperCase();
  const y = s.match(/(\d{4})/);
  if (!y) return null;
  const q = s.match(/Q([1-4])/);
  return { year: Number(y[1]), quarter: q ? Number(q[1]) : 0 };
}
export function compareDatNames(a, b) {
  const pa = parseDatName(a),
    pb = parseDatName(b);
  if (pa && pb) {
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.quarter - pb.quarter;
  }
  if (pa && !pb) return 1;
  if (!pa && pb) return -1;
  return String(a).localeCompare(String(b));
}
export function getQueryParam(name) {
  const p = new URLSearchParams(window.location.search);
  return p.get(name);
}
export function upsertQueryParams(obj) {
  const url = new URL(window.location.href);
  const p = url.searchParams;
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") p.delete(k);
    else p.set(k, String(v));
  });
  window.history.replaceState({}, "", url.toString());
}
export const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  },
  del(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
