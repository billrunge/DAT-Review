// assets/js/ui/datRange.js
// Centralized DAT range UI + state.
// - Hidden by default (index.html sets hidden)
// - Shown when context is activated (vertical tab click or respondent select)
// - Options populated only with relevant DATs once a report loads
// - Prevents invalid ranges (From > To)
// - Auto-reloads active context on change (if a reload handler is set)

let initialized = false;
let suppressChange = false;

let context = null;          // 'vertical' | 'respondent' | null
let reloadHandler = null;    // () => Promise|void
let currentDats = [];        // array of DAT names currently available
let selectedFrom = null;
let selectedTo = null;

function elControls() { return document.getElementById('dat-range-controls'); }
function elFrom() { return document.getElementById('datFromSelect'); }
function elTo() { return document.getElementById('datToSelect'); }

export function hide() {
  const c = elControls();
  if (c) c.hidden = true;
}

export function show() {
  const c = elControls();
  if (c) c.hidden = false;
}

export function clearOptionsAndDisable() {
  const from = elFrom();
  const to = elTo();
  if (from) from.innerHTML = '';
  if (to) to.innerHTML = '';
  currentDats = [];
  selectedFrom = null;
  selectedTo = null;
}

export function activate(newContext, { showControls = true, onReload = null } = {}) {
  context = newContext ?? context;
  reloadHandler = typeof onReload === 'function' ? onReload : reloadHandler;
  if (showControls) show();
}

export function setReloadHandler(fn) {
  reloadHandler = typeof fn === 'function' ? fn : null;
}

export function getRange() {
  return { from: selectedFrom, to: selectedTo };
}

// Disable options so From cannot be after To, and To cannot be before From.
function applyOptionDisables() {
  const fromSel = elFrom();
  const toSel = elTo();
  if (!fromSel || !toSel) return;

  const fromIdx = currentDats.indexOf(fromSel.value);
  const toIdx = currentDats.indexOf(toSel.value);

  // Disable From options greater than current To
  [...fromSel.options].forEach((opt, i) => {
    opt.disabled = toIdx >= 0 ? i > toIdx : false;
  });

  // Disable To options less than current From
  [...toSel.options].forEach((opt, i) => {
    opt.disabled = fromIdx >= 0 ? i < fromIdx : false;
  });
}

function clampInvalidRange() {
  const fromSel = elFrom();
  const toSel = elTo();
  if (!fromSel || !toSel) return;

  const fromIdx = currentDats.indexOf(fromSel.value);
  const toIdx = currentDats.indexOf(toSel.value);

  if (fromIdx >= 0 && toIdx >= 0 && fromIdx > toIdx) {
    // Clamp: snap To up to From
    toSel.value = fromSel.value;
  }

  selectedFrom = fromSel.value || null;
  selectedTo = toSel.value || null;

  applyOptionDisables();
}

async function triggerReloadIfPossible() {
  if (typeof reloadHandler !== 'function') return;
  try {
    await reloadHandler();
  } catch (e) {
    // best-effort; caller will usually set status message
    console.error('[DAT] reload failed', e);
  }
}

function onSelectChange() {
  if (suppressChange) return;
  clampInvalidRange();
  triggerReloadIfPossible();
}

export function init() {
  if (initialized) return;
  initialized = true;

  const fromSel = elFrom();
  const toSel = elTo();
  if (fromSel) fromSel.addEventListener('change', onSelectChange);
  if (toSel) toSel.addEventListener('change', onSelectChange);
}

// Set the available DAT options. If empty, hide the control entirely.
// Preserves previous selection when possible, otherwise clamps to ends.
export function setOptions(dats, { hideIfEmpty = true } = {}) {
  const fromSel = elFrom();
  const toSel = elTo();
  if (!fromSel || !toSel) return;

  currentDats = Array.isArray(dats) ? dats.slice() : [];

  if (currentDats.length === 0) {
    clearOptionsAndDisable();
    if (hideIfEmpty) hide();
    return;
  }

  show();

  // Preserve old selections if still valid
  const oldFrom = selectedFrom;
  const oldTo = selectedTo;

  suppressChange = true;
  try {
    fromSel.innerHTML = '';
    toSel.innerHTML = '';

    for (const d of currentDats) {
      fromSel.add(new Option(d, d));
      toSel.add(new Option(d, d));
    }

    fromSel.value = (oldFrom && currentDats.includes(oldFrom)) ? oldFrom : currentDats[0];
    toSel.value = (oldTo && currentDats.includes(oldTo)) ? oldTo : currentDats[currentDats.length - 1];

    clampInvalidRange();
  } finally {
    suppressChange = false;
  }
}