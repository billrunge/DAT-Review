
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

/** Sets the print-only dynamic header text shown in exported PDFs. */
export function setPrintHeader(text) {
  const el = document.getElementById("print-report-header");
  if (el) el.textContent = text || "";
}

// Expose global PDF export (can be called by browser bookmarklet or console)
export function exportPDF() {
  // Keep track of original open/closed states so we can restore after print
  const originalStates = [];

  const expandLongText = () => {
    const items = document.querySelectorAll('#longtext-section details.lt-item');
    originalStates.length = 0;
    items.forEach((d) => {
      originalStates.push({ el: d, wasOpen: d.open === true });
      d.open = true; // force open for print
    });
  };

  const restoreLongText = () => {
    if (originalStates.length) {
      for (const { el, wasOpen } of originalStates) {
        el.open = wasOpen;
      }
      originalStates.length = 0;
    }
    cleanup();
  };

  // Some browsers fire before/afterprint; others toggle matchMedia('print')
  const onBeforePrint = () => expandLongText();
  const onAfterPrint = () => restoreLongText();

  let mq;
  const onMediaChange = (e) => {
    if (e.matches) onBeforePrint();
    else onAfterPrint();
  };

  const cleanup = () => {
    window.removeEventListener('beforeprint', onBeforePrint);
    window.removeEventListener('afterprint', onAfterPrint);
    if (mq && mq.removeEventListener) {
      mq.removeEventListener('change', onMediaChange);
    }
  };

  // Attach listeners
  window.addEventListener('beforeprint', onBeforePrint);
  window.addEventListener('afterprint', onAfterPrint);
  if (window.matchMedia) {
    mq = window.matchMedia('print');
    try {
      mq.addEventListener('change', onMediaChange);
    } catch {
      // Best effort; before/afterprint will handle most cases
    }
  }

  // Let Chart.js animations settle, expand proactively, then print
  setTimeout(() => {
    expandLongText();
    setTimeout(() => {
      window.print();
    }, 150);
  }, 0);
}

// Wire hidden button for internal use
document.getElementById("exportToPDF")?.addEventListener("click", exportPDF);
