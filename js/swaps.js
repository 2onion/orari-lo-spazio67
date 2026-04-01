// ─────────────────────────────────────────────────────────────
//  swaps.js  —  Controller + View: reciprocal shift swaps
//  Fully Supabase-backed. Any colleague can register a swap.
// ─────────────────────────────────────────────────────────────
import { sbGet, sbPost, sbDelete } from './supabase.js';
import { week1, week2, applySwapsToData } from './model.js';
import { W1_DATES, W2_DATES, DLABELS, WEEK2_AVAILABLE } from './config.js';
import { renderTable } from './schedule.js';
import { showToast, setSyncDot } from './app.js';

// ── Local swap state ──────────────────────────────────────────
const sw = {
  fromName: '', toName: '', weekN: 1,
  dayIdxA: -1, shiftA: null,
  dayIdxB: -1, shiftB: null,
};

// ── Public: called when tab is opened ────────────────────────
export async function initSwaps() {
  populateFromSelect();
  await loadSwaps();
}

// ── Supabase: load all swaps, rebuild table ───────────────────
export async function loadSwaps() {
  document.getElementById('swapsLoading').style.display = 'block';
  document.getElementById('swapsList').innerHTML = '';
  try {
    setSyncDot('loading');
    const data = await sbGet('swaps', '?order=created_at.desc');
    setSyncDot('ok');
    applySwapsToData(data || []);
    renderTable();
    renderSwapsList(data || []);
  } catch (e) {
    setSyncDot('err');
    document.getElementById('swapsList').innerHTML =
      '<div class="empty-sw">❌ Errore di connessione. Ricarica la pagina.</div>';
  } finally {
    document.getElementById('swapsLoading').style.display = 'none';
  }
}

// ── Form population ───────────────────────────────────────────
function populateFromSelect() {
  const f = document.getElementById('swapFrom');
  f.innerHTML = '<option value="">— Seleziona —</option>';
  week1.forEach(e => { f.innerHTML += `<option value="${e.name}">${e.name}</option>`; });
}

// ── Step 1: person A chosen ───────────────────────────────────
export function onFromChange() {
  sw.fromName = document.getElementById('swapFrom').value;
  sw.dayIdxA = -1; sw.shiftA = null;
  sw.dayIdxB = -1; sw.shiftB = null; sw.toName = '';

  document.getElementById('toBSection').style.display = 'none';
  document.getElementById('hourWarn').style.display   = 'none';
  document.getElementById('swapPreview').style.display = 'none';
  document.getElementById('pickersRow').style.display  = sw.fromName ? 'grid' : 'none';

  renderPickerA();
  updateStepUI();
  updateConfirmBtn();
}

// ── Week selector ─────────────────────────────────────────────
export function onWeekChange() {
  sw.weekN   = parseInt(document.getElementById('swapWeek').value);
  sw.dayIdxA = -1; sw.shiftA = null;
  sw.dayIdxB = -1; sw.shiftB = null;
  renderPickerA();
  renderPickerB();
  updatePreview();
  updateConfirmBtn();
}

// ── Shift picker A ────────────────────────────────────────────
function renderPickerA() {
  const c = document.getElementById('dayShiftsA');
  c.innerHTML = '';
  document.getElementById('pickerLabelA').textContent =
    sw.fromName ? `Turno di ${sw.fromName.split(' ')[0]} da cedere` : 'Turno ceduto da A';
  if (!sw.fromName) return;

  const wd    = sw.weekN === 1 ? week1 : week2;
  const emp   = wd.find(e => e.name === sw.fromName);
  const dates = sw.weekN === 1 ? W1_DATES : W2_DATES;
  if (!emp) return;

  let hasShifts = false;
  emp.days.forEach((d, i) => {
    if (d.t === 'off' || d.t === 'assente') return;
    hasShifts = true;
    const tag = document.createElement('div');
    tag.className = `shift-tag ${d.t}-tag${sw.dayIdxA === i ? ' selected' : ''}`;
    tag.innerHTML = `<strong>${DLABELS[i]} ${dates[i]}</strong><br>${d.time} · ${d.role} · ${d.h}h`;
    tag.onclick = () => selectShiftA(i, d);
    c.appendChild(tag);
  });
  if (!hasShifts) c.innerHTML = '<span style="color:var(--muted);font-size:12px">Nessun turno disponibile.</span>';
}

function selectShiftA(idx, shift) {
  sw.dayIdxA = idx; sw.shiftA = shift;
  sw.dayIdxB = -1;  sw.shiftB = null;

  document.getElementById('toBSection').style.display = 'block';
  document.getElementById('pickerB').style.opacity = '1';
  document.getElementById('pickerB').style.pointerEvents = 'auto';
  populateToSelect();
  renderPickerA();
  updatePreview();
  updateConfirmBtn();
  updateStepUI();
}

// ── Person B selector ─────────────────────────────────────────
function populateToSelect() {
  const t = document.getElementById('swapTo');
  t.innerHTML = '<option value="">— Seleziona —</option>';
  week1.forEach(e => {
    if (e.name !== sw.fromName) t.innerHTML += `<option value="${e.name}">${e.name}</option>`;
  });
  t.onchange = onToChange;
}

export function onToChange() {
  sw.toName  = document.getElementById('swapTo').value;
  sw.dayIdxB = -1; sw.shiftB = null;
  renderPickerB();
  updatePreview();
  updateConfirmBtn();
  updateStepUI();
}

// ── Shift picker B ────────────────────────────────────────────
function renderPickerB() {
  const c = document.getElementById('dayShiftsB');
  c.innerHTML = '';
  document.getElementById('pickerLabelB').textContent =
    sw.toName ? `Turno di ${sw.toName.split(' ')[0]} in cambio` : 'Turno dato in cambio da B';
  if (!sw.toName) return;

  const wd    = sw.weekN === 1 ? week1 : week2;
  const emp   = wd.find(e => e.name === sw.toName);
  const dates = sw.weekN === 1 ? W1_DATES : W2_DATES;
  if (!emp) return;

  let hasShifts = false;
  emp.days.forEach((d, i) => {
    if (d.t === 'off' || d.t === 'assente') return;
    hasShifts = true;
    const tag = document.createElement('div');
    tag.className = `shift-tag ${d.t}-tag${sw.dayIdxB === i ? ' selected' : ''}`;
    tag.innerHTML = `<strong>${DLABELS[i]} ${dates[i]}</strong><br>${d.time} · ${d.role} · ${d.h}h`;
    tag.onclick = () => selectShiftB(i, d);
    c.appendChild(tag);
  });
  if (!hasShifts) c.innerHTML = '<span style="color:var(--muted);font-size:12px">Nessun turno disponibile.</span>';
}

function selectShiftB(idx, shift) {
  sw.dayIdxB = idx; sw.shiftB = shift;
  renderPickerB();
  updatePreview();
  updateConfirmBtn();
  updateStepUI();
  // Hour warning
  const warn = document.getElementById('hourWarn');
  warn.style.display = (sw.shiftA && sw.shiftB && sw.shiftA.h !== sw.shiftB.h) ? 'block' : 'none';
}

// ── Preview ───────────────────────────────────────────────────
function updatePreview() {
  const p = document.getElementById('swapPreview');
  const b = document.getElementById('previewBody');
  if (!sw.fromName || sw.dayIdxA < 0 || !sw.toName || sw.dayIdxB < 0) {
    p.style.display = 'none'; return;
  }
  const dates = sw.weekN === 1 ? W1_DATES : W2_DATES;
  p.style.display = 'block';
  b.innerHTML = `
    <strong>${sw.fromName}</strong> cede <strong>${DLABELS[sw.dayIdxA]} ${dates[sw.dayIdxA]}</strong>
    (${sw.shiftA.time} · ${sw.shiftA.role} · ${sw.shiftA.h}h)<br>↕<br>
    <strong>${sw.toName}</strong> cede <strong>${DLABELS[sw.dayIdxB]} ${dates[sw.dayIdxB]}</strong>
    (${sw.shiftB.time} · ${sw.shiftB.role} · ${sw.shiftB.h}h)`;
}

// ── Confirm swap → Supabase ───────────────────────────────────
export async function confirmSwap() {
  if (!sw.fromName || !sw.toName || sw.dayIdxA < 0 || sw.dayIdxB < 0) return;

  const btn = document.getElementById('confirmSwapBtn');
  btn.disabled = true;
  btn.textContent = 'Salvataggio...';

  const dates = sw.weekN === 1 ? W1_DATES : W2_DATES;
  const note  = document.getElementById('swapNote').value.trim();

  try {
    setSyncDot('loading');
    await sbPost('swaps', {
      from_name:   sw.fromName,
      to_name:     sw.toName,
      week_n:      sw.weekN,
      day_idx_a:   sw.dayIdxA,
      day_idx_b:   sw.dayIdxB,
      day_label_a: `${DLABELS[sw.dayIdxA]} ${dates[sw.dayIdxA]}`,
      day_label_b: `${DLABELS[sw.dayIdxB]} ${dates[sw.dayIdxB]}`,
      shift_a:     sw.shiftA,
      shift_b:     sw.shiftB,
      note,
    });
    setSyncDot('ok');
    showToast(`✓ Cambio confermato: ${sw.fromName.split(' ')[0]} ↔ ${sw.toName.split(' ')[0]}`);
    resetSwapForm();
    await loadSwaps();
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore salvataggio. Riprova.');
    btn.disabled = false;
    btn.textContent = '✓ Conferma Cambio';
  }
}

// ── Delete swap → Supabase ────────────────────────────────────
export async function deleteSwap(id) {
  if (!confirm('Annullare questo cambio turno?')) return;
  try {
    setSyncDot('loading');
    await sbDelete('swaps', `?id=eq.${id}`);
    setSyncDot('ok');
    showToast('↩ Cambio annullato');
    await loadSwaps();
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore. Riprova.');
  }
}

// ── Render swaps list ─────────────────────────────────────────
function renderSwapsList(data) {
  const list = document.getElementById('swapsList');
  if (!data.length) {
    list.innerHTML = '<div class="empty-sw">Nessun cambio turno registrato.</div>';
    return;
  }
  list.innerHTML = data.map(s => `
    <div class="swap-item">
      <div class="swap-info">
        <div class="sn">🔄 ${s.from_name} ↔ ${s.to_name}</div>
        <div class="sd">${s.day_label_a}: ${s.shift_a.time} · ${s.shift_a.role} · ${s.shift_a.h}h
          &nbsp;↕&nbsp;
          ${s.day_label_b}: ${s.shift_b.time} · ${s.shift_b.role} · ${s.shift_b.h}h</div>
        ${s.note ? `<div class="sn2">📝 ${s.note}</div>` : ''}
      </div>
      <span class="sbadge">Cambio</span>
      <button class="del-btn" onclick="window.__deleteSwap('${s.id}')" title="Annulla">✕</button>
    </div>`).join('');
}

// ── Reset form ────────────────────────────────────────────────
export function resetSwapForm() {
  Object.assign(sw, { fromName:'', toName:'', weekN:1, dayIdxA:-1, shiftA:null, dayIdxB:-1, shiftB:null });
  document.getElementById('swapFrom').value  = '';
  document.getElementById('swapWeek').value  = '1';
  document.getElementById('swapNote').value  = '';
  document.getElementById('pickersRow').style.display   = 'none';
  document.getElementById('toBSection').style.display   = 'none';
  document.getElementById('swapPreview').style.display  = 'none';
  document.getElementById('hourWarn').style.display     = 'none';
  document.getElementById('pickerB').style.opacity      = '0.4';
  document.getElementById('pickerB').style.pointerEvents = 'none';
  document.getElementById('confirmSwapBtn').disabled    = true;
  document.getElementById('confirmSwapBtn').textContent = '✓ Conferma Cambio';
  updateStepUI();
}

// ── Step indicator ────────────────────────────────────────────
function updateStepUI() {
  const s1 = !!sw.fromName, s2 = sw.dayIdxA >= 0, s3 = !!sw.toName, s4 = sw.dayIdxB >= 0;
  setStep(1, s1 ? (s2 ? 'done' : 'active') : 'active');
  setStep(2, s1 ? (s2 ? (s3 ? 'done' : 'active') : 'idle') : 'idle');
  setStep(3, s2 ? (s3 ? (s4 ? 'done' : 'active') : 'active') : 'idle');
  setStep(4, s3 ? (s4 ? 'done' : 'active') : 'idle');
  setStep(5, s4 ? 'active' : 'idle');
}

function setStep(n, state) {
  const el = document.getElementById('step' + n);
  el.className = 'step' + (state !== 'idle' ? ' ' + state : '');
}

function updateConfirmBtn() {
  document.getElementById('confirmSwapBtn').disabled =
    !(sw.fromName && sw.toName && sw.dayIdxA >= 0 && sw.dayIdxB >= 0);
}
