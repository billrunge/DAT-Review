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
  // Keep track of original open/closed states so we can restore them after print
  const originalStates = [];

  const expandLongText = () => {
    // Ensure section exists (your loader already creates it, but this is safe if not loaded)
    const items = document.querySelectorAll('#longtext-section details.lt-item');
    originalStates.length = 0; // reset
    items.forEach((d) => {
      originalStates.push({ el: d, wasOpen: d.open === true });
      d.open = true; // force open
    });
  };

  const restoreLongText = () => {
    if (originalStates.length) {
      for (const { el, wasOpen } of originalStates) {
        // restore original state
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
    // Not all browsers support addEventListener on MediaQueryList in legacy mode
    try {
      mq.addEventListener('change', onMediaChange);
    } catch {
      // Best effort; before/afterprint should still handle most cases
    }
  }

  // Let Chart.js animations settle, then print
  setTimeout(() => {
    // Proactively expand in case beforeprint doesn’t fire (some headless/edge cases)
    expandLongText();

    // Small delay to ensure DOM updates are flushed
    setTimeout(() => {
      window.print();
    }, 150);
  }, 0);
}
``


// Wire hidden button for internal use
document.getElementById("exportToPDF")?.addEventListener("click", exportPDF);
