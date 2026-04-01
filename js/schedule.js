// ─────────────────────────────────────────────────────────────
//  schedule.js  —  View: shift table + "oggi" panel
//  Cells are clickable → opens inline editor (shifts.js)
// ─────────────────────────────────────────────────────────────
import {
  getCurrentData, getCurrentDates, getTodayColIdx,
  getTodayWorking, currentWeek, WEEK2_AVAILABLE,
} from './model.js';
import { DLABELS, DSHORT, W1_LABEL, W2_LABEL } from './config.js';
import { openEditor } from './shifts.js';

export function renderTable() {
  const data   = getCurrentData();
  const dates  = getCurrentDates();
  const banner = document.getElementById('unavailBanner');
  const sm     = document.getElementById('schedMain');

  if (currentWeek === 2 && !WEEK2_AVAILABLE) {
    banner.style.display = 'block'; sm.style.display = 'none'; return;
  }
  banner.style.display = 'none'; sm.style.display = 'block';

  const todayIdx = getTodayColIdx();

  // Column headers + today highlight
  document.querySelectorAll('#schedHead th.dh').forEach((th, i) => {
    if (i >= 7) return;
    th.innerHTML = `${DLABELS[i]}<br><span style="font-size:9px;font-weight:400;color:#3a3a3e;font-family:'DM Mono'">${dates[i]}</span>`;
    th.classList.toggle('today-col', i === todayIdx);
  });

  const tbody = document.getElementById('schedBody');
  tbody.innerHTML = '';

  if (!data.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="11" style="text-align:center;padding:32px;color:var(--muted);font-style:italic;">Caricamento turni...</td>`;
    tbody.appendChild(tr);
    renderOggi();
    return;
  }

  data.forEach(emp => {
    const tot  = emp.days.reduce((s, d) => s + d.h, 0);
    const diff = tot - emp.contract;
    const tr   = document.createElement('tr');

    let html = `<td>
      <div class="emp-name">${emp.name}</div>
      <div class="emp-rl">${emp.role} <span class="cbadge">${emp.contract}h</span></div>
    </td>`;

    emp.days.forEach((d, i) => {
      const isToday = i === todayIdx;
      let inner = '';
      if (d.t === 'off')          inner = `<div class="cs off">—</div>`;
      else if (d.t === 'assente') inner = `<div class="cs assente">assente</div>`;
      else if (d.swapped)         inner = `<div class="cs swapped">${d.time}<span class="cr">${d.role||d.t}</span><span class="ch">${d.h}h</span><span class="csw">↔ cambiato</span></div>`;
      else                        inner = `<div class="cs ${d.t}">${d.time}<span class="cr">${d.role||d.t}</span><span class="ch">${d.h}h</span></div>`;

      // data-* attrs let the editor find the right cell
      html += `<td
        class="shift-cell${isToday ? ' today-col' : ''}"
        data-emp="${emp.name.replace(/"/g, '&quot;')}"
        data-week="${currentWeek}"
        data-day="${i}"
        title="Clicca per modificare"
        style="text-align:center;cursor:pointer;position:relative;"
      >${inner}</td>`;
    });

    const tc = diff > 0 ? 'over' : diff < 0 ? 'under' : 'eq';
    const ds = diff > 0 ? `+${diff}h` : diff < 0 ? `${diff}h` : '—';
    const dc = diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'z';
    html += `<td><div class="tot ${tc}">${tot}h</div></td>
             <td><div class="tot" style="color:var(--muted)">${emp.contract}h</div></td>
             <td><div class="diff ${dc}">${ds}</div></td>`;

    tr.innerHTML = html;
    tbody.appendChild(tr);
  });

  // Attach click listeners — one per cell
  tbody.querySelectorAll('.shift-cell').forEach(cell => {
    cell.addEventListener('click', e => {
      if (e.target.closest('.shift-editor')) return; // ignore clicks inside open editor
      openEditor(cell.dataset.emp, parseInt(cell.dataset.week), parseInt(cell.dataset.day));
    });
  });

  renderOggi();
}

// ── Oggi panel ────────────────────────────────────────────────
export function toggleOggi() {
  const body = document.getElementById('oggiBody');
  const tog  = document.getElementById('oggiToggle');
  body.classList.toggle('open');
  tog.classList.toggle('open', body.classList.contains('open'));
}

export function renderOggi() {
  const todayIdx = getTodayColIdx();
  const now      = new Date();
  const DAYS   = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
  const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

  document.getElementById('oggiDateLabel').textContent =
    `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  const panel   = document.getElementById('oggiPanel');
  const grid    = document.getElementById('oggiGrid');
  const countEl = document.getElementById('oggiCount');

  if (todayIdx === -1) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  const working = getTodayWorking();
  countEl.innerHTML = `<strong>${working.length}</strong> ${working.length === 1 ? 'collega lavora' : 'colleghi lavorano'} oggi`;

  if (!working.length) {
    grid.innerHTML = '<div class="oggi-empty">Nessuno in turno oggi.</div>';
    return;
  }

  grid.innerHTML = working.map(emp => {
    const d   = emp.days[todayIdx];
    const cls = d.swapped ? 'swapped' : d.t;
    return `<div class="oggi-card ${cls}">
      <div class="oggi-card-hrs">${d.h}h</div>
      <div class="oggi-card-name">${emp.name}</div>
      <div class="oggi-card-time">${d.time}</div>
      <div class="oggi-card-role">${d.role}</div>
    </div>`;
  }).join('');
}
