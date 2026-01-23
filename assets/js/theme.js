const KEY = "r1-theme";
const root = document.documentElement;
function apply(t) {
  if (t === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
}
export function initThemeToggle() {
  const s = localStorage.getItem(KEY);
  if (s) apply(s);
  const b = document.getElementById("themeToggle");
  if (!b) return;
  b.addEventListener("click", () => {
    const n = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(n);
    localStorage.setItem(KEY, n);
  });
}
