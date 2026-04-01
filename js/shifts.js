// ─────────────────────────────────────────────────────────────
//  shifts.js  —  Loads/saves shifts from Supabase.
//                Seeds the DB from data.js on first run.
//                Handles the inline cell editor.
// ─────────────────────────────────────────────────────────────
import { sbGet, sbPost, sbPatch } from './supabase.js';
import { BASE_WEEK1, BASE_WEEK2 } from './data.js';
import { setWeekData, updateEmployeeDays, week1, week2 } from './model.js';
import { WEEK2_AVAILABLE, SHIFT_TYPES, ROLES, DLABELS } from './config.js';
import { renderTable } from './schedule.js';
import { showToast, setSyncDot } from './app.js';

// ── Load all shifts from Supabase ─────────────────────────────
export async function loadShifts() {
  try {
    setSyncDot('loading');
    const rows = await sbGet('shifts', '?order=week_n,name');
    setSyncDot('ok');

    if (!rows || rows.length === 0) {
      // First run — seed the DB from data.js
      await seedShifts();
      return;
    }

    const w1 = rows.filter(r => r.week_n === 1).map(rowToEmp);
    const w2 = rows.filter(r => r.week_n === 2).map(rowToEmp);
    setWeekData(w1, w2);
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore caricamento turni');
    // Fallback to data.js so the app is never blank
    setWeekData([...BASE_WEEK1], [...BASE_WEEK2]);
  }
}

function rowToEmp(row) {
  return {
    name:     row.name,
    role:     row.role,
    contract: row.contract,
    days:     row.days,
  };
}

// ── Seed DB from data.js (first run only) ─────────────────────
async function seedShifts() {
  showToast('⏳ Primo avvio: caricamento turni nel database...');
  const rows = [];
  BASE_WEEK1.forEach(emp => rows.push({ week_n: 1, name: emp.name, role: emp.role, contract: emp.contract, days: emp.days }));
  if (WEEK2_AVAILABLE) {
    BASE_WEEK2.forEach(emp => rows.push({ week_n: 2, name: emp.name, role: emp.role, contract: emp.contract, days: emp.days }));
  }
  try {
    // Insert in batches of 10 to avoid request size limits
    for (let i = 0; i < rows.length; i += 10) {
      await sbPost('shifts', rows.slice(i, i + 10));
    }
    setSyncDot('ok');
    showToast('✓ Turni caricati nel database!');
    await loadShifts(); // re-load properly
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore seed database');
    setWeekData([...BASE_WEEK1], [...BASE_WEEK2]);
  }
}

// ── Save a single employee's updated days to Supabase ─────────
export async function saveShift(weekN, name, newDays) {
  try {
    setSyncDot('loading');
    await sbPatch(
      'shifts',
      `?week_n=eq.${weekN}&name=eq.${encodeURIComponent(name)}`,
      { days: newDays, updated_at: new Date().toISOString() }
    );
    setSyncDot('ok');
    updateEmployeeDays(weekN, name, newDays);
    renderTable();
    showToast('✓ Turno aggiornato');
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore salvataggio');
  }
}

// ── Inline cell editor ────────────────────────────────────────
let activeEditor = null; // { cell, emp, weekN, dayIdx }

export function openEditor(empName, weekN, dayIdx) {
  // Close any open editor first
  closeEditor();

  const wk  = weekN === 1 ? week1 : week2;
  const emp = wk.find(e => e.name === empName);
  if (!emp) return;

  const day = emp.days[dayIdx];

  // Find the matching TD
  const cell = document.querySelector(
    `.shift-cell[data-emp="${empName.replace(/"/g, '&quot;')}"][data-week="${weekN}"][data-day="${dayIdx}"]`
  );
  if (!cell) return;

  activeEditor = { cell, emp, weekN, dayIdx };

  // Build editor HTML
  const typeOpts = SHIFT_TYPES.map(t =>
    `<option value="${t}" ${day.t === t ? 'selected' : ''}>${t}</option>`
  ).join('');

  const roleOpts = ROLES.map(r =>
    `<option value="${r}" ${day.role === r ? 'selected' : ''}>${r}</option>`
  ).join('');

  const editor = document.createElement('div');
  editor.className = 'shift-editor';
  editor.innerHTML = `
    <div class="se-header">
      <span class="se-title">${empName.split(' ')[0]} · ${DLABELS[dayIdx]}</span>
      <button class="se-close" onclick="window.__closeEditor()">✕</button>
    </div>
    <div class="se-body">
      <div class="se-row">
        <label>Tipo</label>
        <select id="se-type" onchange="window.__editorTypeChange()">
          ${typeOpts}
        </select>
      </div>
      <div class="se-off-fields" id="se-fields" style="${day.t === 'off' || day.t === 'assente' ? 'display:none' : ''}">
        <div class="se-row">
          <label>Orario</label>
          <input id="se-time" type="text" value="${day.time || ''}" placeholder="13:15–19:15">
        </div>
        <div class="se-row">
          <label>Ruolo</label>
          <select id="se-role">
            ${roleOpts}
            <option value="${day.role || ''}" ${!ROLES.includes(day.role) && day.role ? 'selected' : ''}>${day.role || '—'}</option>
          </select>
        </div>
        <div class="se-row">
          <label>Ore</label>
          <input id="se-hours" type="number" min="1" max="12" step="0.5" value="${day.h || 0}" placeholder="6">
        </div>
      </div>
      <div class="se-actions">
        <button class="se-save" onclick="window.__saveEditor()">✓ Salva</button>
        <button class="se-cancel" onclick="window.__closeEditor()">Annulla</button>
      </div>
    </div>
  `;

  // Position the editor below the cell
  cell.style.position = 'relative';
  cell.appendChild(editor);

  // Focus the first useful field
  setTimeout(() => {
    const firstInput = editor.querySelector('select, input');
    if (firstInput) firstInput.focus();
  }, 50);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', outsideClickHandler);
  }, 100);
}

function outsideClickHandler(e) {
  if (!e.target.closest('.shift-editor')) {
    closeEditor();
  }
}

export function closeEditor() {
  if (!activeEditor) return;
  const editor = activeEditor.cell.querySelector('.shift-editor');
  if (editor) editor.remove();
  document.removeEventListener('click', outsideClickHandler);
  activeEditor = null;
}

export function editorTypeChange() {
  const type   = document.getElementById('se-type')?.value;
  const fields = document.getElementById('se-fields');
  if (!fields) return;
  fields.style.display = (type === 'off' || type === 'assente') ? 'none' : '';
}

export async function saveEditor() {
  if (!activeEditor) return;
  const { emp, weekN, dayIdx } = activeEditor;

  const type  = document.getElementById('se-type')?.value;
  const time  = document.getElementById('se-time')?.value.trim()  || '';
  const role  = document.getElementById('se-role')?.value.trim()  || '';
  const hours = parseFloat(document.getElementById('se-hours')?.value) || 0;

  const newDays = emp.days.map((d, i) => {
    if (i !== dayIdx) return { ...d };
    if (type === 'off' || type === 'assente') return { t: type, time: '', role: '', h: 0 };
    return { t: type, time, role, h: hours };
  });

  closeEditor();
  await saveShift(weekN, emp.name, newDays);
}
