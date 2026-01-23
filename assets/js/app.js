import { initCombobox, clearRespondentSelection } from "./ui/combobox.js";
import { loadVerticals, loadTeamAnswers } from "./features/verticalReport.js";
import { els } from "./core/domRefs.js";
import { setStatus } from "./utils.js";
import { clearReportAreas } from "./ui/chart.js";
export async function start() {
  try {
    await initCombobox();
    await loadVerticals();
    els.loadVerticalBtn?.addEventListener("click", () => {
      const active = els.teamBar?.querySelector("button.team-tab.active");
      if (!active || !active.dataset.choiceGuid) {
        setStatus("Please select a vertical first.");
        els.teamBar?.focus();
        return;
      }
      const sel = {
        guid: active.dataset.choiceGuid,
        artifactId: Number(active.dataset.artifactId) || null,
        name: active.dataset.label || "",
      };
      clearRespondentSelection();
      clearReportAreas();
      loadTeamAnswers(sel).catch((e) =>
        setStatus(`Failed to load team answers: ${e.message}`),
      );
    });
    setStatus("Ready.");
  } catch (e) {
    setStatus(`Initialization failed: ${e.message}`);
  }
}


// Expose global PDF export (can be called by browser bookmarklet or console)
export function exportPDF() {
  // Allow Chart.js animations to finish rendering
  setTimeout(() => {
    window.print();
  }, 150);
}

// Wire hidden button for internal use
document.getElementById("exportToPDF")?.addEventListener("click", exportPDF);
