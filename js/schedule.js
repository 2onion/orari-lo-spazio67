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

    let headerHtml = `${DLABELS[i]}<br><span style="font-size:9px;font-weight:400;color:#3a3a3e;font-family:'DM Mono'">${dates[i]}</span>`;

    // Inject the real image block next to April 1st
    if (dates[i] === '01 Apr') {
      headerHtml += ` <img src="images/blocco_mario.png" onclick="window.__marioPrank()" style="width: 14px; cursor: pointer; vertical-align: middle; margin-left: 4px; transition: transform 0.1s;" onmousedown="this.style.transform='translateY(2px)'" onmouseup="this.style.transform='translateY(0)'" title="???">`;
    }

    th.innerHTML = headerHtml;
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

  const isAprilFools = now.getMonth() === 3 && now.getDate() === 1; // Month 3 is April
  let dateText = `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  if (isAprilFools) {
    // Inject the real image block in the Today panel
    document.getElementById('oggiDateLabel').innerHTML =
        `${dateText} <img src="images/blocco_mario.png" onclick="window.__marioPrank()" style="width: 18px; cursor: pointer; vertical-align: middle; margin-left: 6px; transition: transform 0.1s;" onmousedown="this.style.transform='translateY(2px)'" onmouseup="this.style.transform='translateY(0)'" title="???">`;
  } else {
    document.getElementById('oggiDateLabel').textContent = dateText;
  }

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

// ── APRIL FOOLS MARIO PRANK LOGIC ─────────────────────────────
window.__marioPrank = function() {
  const icons = ['🪙', '🍄', '🌟', '🐢', '🦖', '🟩', '☁️'];

  // Public classic Nintendo sound links
  const sounds = [
    'audio/moneta.wav',
    'audio/salto.wav',
    'audio/1_up.wav',
    'audio/yoshi_1.mp3',
      'audio/its-me-mario.mp3',
      'audio/super-mario-64-yahoo-sound.mp3',
      'audio/super-mario-bros-nes-music-star-theme-cut-mp3.mp3',
      'audio/yoshi-tongue.mp3',
      'audio/super-mario-death-sound-sound-effect.mp3',
      'audio/yeahoo.mp3',
      'audio/sm64_mario_lets_go.mp3',
      'audio/sans-titre1.mp3'
  ];

  // Spawn 40 icons & sounds over the span of 2 seconds for a chaotic overlapping effect
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      // 1. Play random overlapping sound
      const audio = new Audio(sounds[Math.floor(Math.random() * sounds.length)]);
      audio.volume = 0.6; // Keep it loud but without blowing out the speakers completely
      audio.play().catch(e => console.log('Audio blocked', e));

      // 2. Create floating icon
      const el = document.createElement('div');
      el.className = 'mario-sprite';
      el.textContent = icons[Math.floor(Math.random() * icons.length)];

      // Random starting positions near the bottom/center
      el.style.left = (Math.random() * 90 + 5) + 'vw';
      el.style.top = (Math.random() * 50 + 50) + 'vh';

      document.body.appendChild(el);

      // Clean up the DOM after animation finishes
      setTimeout(() => el.remove(), 2000);
    }, i * 50); // Stagger them by 50ms each so it creates a massive noise barrage
  }
};
