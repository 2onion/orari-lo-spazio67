// ─────────────────────────────────────────────────────────────
//  app.js  —  Main controller: navigation, init, global utils
// ─────────────────────────────────────────────────────────────
import { setCurrentWeek } from './model.js';
import { renderTable, toggleOggi } from './schedule.js';
import { doSearch } from './search.js';
import { initSwaps, onFromChange, onWeekChange, onToChange, confirmSwap, resetSwapForm, deleteSwap } from './swaps.js';
import { loadJuve, bump, undo } from './juve.js';
import { loadShifts, closeEditor, editorTypeChange, saveEditor } from './shifts.js';
import { initTrivia } from './trivia.js';
import { initQuizAdmin } from './trivia_admin.js';
import { LAST_MODIFIED, W1_LABEL, W2_LABEL } from './config.js';

// ── Sync dot ─────────────────────────────────────────────────
export function setSyncDot(state) {
  const d = document.getElementById('syncDot');
  d.className = 'sync-dot' + (state === 'ok' ? ' ok' : state === 'err' ? ' err' : '');
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3500);
}

// ── Nav ───────────────────────────────────────────────────────
const NAV_NAMES = ['schedule', 'search', 'swaps', 'juve', 'quiz'];

export function switchNav(name) {
  NAV_NAMES.forEach(n => {
    document.getElementById('nav-' + n).style.display = n === name ? 'block' : 'none';
  });
  document.querySelectorAll('.ntab').forEach((t, i) => {
    t.classList.toggle('active', NAV_NAMES[i] === name);
  });
  if (name === 'swaps') initSwaps();
  if (name === 'juve')  loadJuve();
  if (name === 'quiz')  initQuizAdmin();
}

// ── Week switcher ─────────────────────────────────────────────
export function switchWeek(n) {
  setCurrentWeek(n);
  document.getElementById('wsw1').classList.toggle('active', n === 1);
  document.getElementById('wsw2').classList.toggle('active', n === 2);
  renderTable();
}

// ── Expose functions to HTML onclick attributes ───────────────
window.switchNav        = switchNav;
window.switchWeek       = switchWeek;
window.toggleOggi       = toggleOggi;
window.doSearch         = q => doSearch(q);
window.onFromChange     = onFromChange;
window.onWeekChange     = onWeekChange;
window.onToChange       = onToChange;
window.confirmSwap      = confirmSwap;
window.resetSwapForm    = resetSwapForm;
window.__deleteSwap     = deleteSwap;
window.bump             = bump;
window.undo             = undo;
window.__closeEditor    = closeEditor;
window.__editorTypeChange = editorTypeChange;
window.__saveEditor     = saveEditor;

// ── Init ──────────────────────────────────────────────────────
document.getElementById('lastMod').textContent = LAST_MODIFIED;

document.getElementById('wsw1').innerHTML = `📅 Sett. 1 &nbsp;${W1_LABEL}`;
document.getElementById('wsw2').innerHTML = `📅 Sett. 2 &nbsp;${W2_LABEL}`;

(async () => {
  await loadShifts();
  renderTable();
  initTrivia();   // ← NEW: starts the random quiz timer after shifts load
})();
