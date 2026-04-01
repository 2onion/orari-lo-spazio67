// ─────────────────────────────────────────────────────────────
//  juve.js  —  Controller + View: Juve counters & stats
// ─────────────────────────────────────────────────────────────
import { sbGet, sbPost, sbPatch, sbDelete } from './supabase.js';
import { showToast, setSyncDot } from './app.js';

let juveCounts = { juve: 0, cucciolone: 0 };
let juveLog    = [];

export async function loadJuve() {
  try {
    setSyncDot('loading');
    const [counters, logs] = await Promise.all([
      sbGet('juve_counters', ''),
      sbGet('juve_log', '?order=created_at.desc&limit=50'),
    ]);
    setSyncDot('ok');
    (counters || []).forEach(c => { juveCounts[c.id] = c.count; });
    juveLog = logs || [];
    renderJuve();
  } catch (e) {
    setSyncDot('err');
  }
}

export async function bump(type) {
  juveCounts[type]++;
  renderJuveCounters();
  animateBump(type === 'juve' ? 'juveCount' : 'cuccioloneCount');
  try {
    setSyncDot('loading');
    await Promise.all([
      sbPatch('juve_counters', `?id=eq.${type}`, { count: juveCounts[type], updated_at: new Date().toISOString() }),
      sbPost('juve_log', { type }),
    ]);
    setSyncDot('ok');
    await loadJuve();
    showToast(type === 'juve' ? '👑 Juve spotted! Leggenda.' : '🍦 Cucciolone registrato!');
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore sync.');
  }
}

export async function undo(type) {
  if (juveCounts[type] <= 0) return;
  const last = juveLog.find(l => l.type === type);
  if (!last) return;
  juveCounts[type]--;
  try {
    setSyncDot('loading');
    await Promise.all([
      sbPatch('juve_counters', `?id=eq.${type}`, { count: juveCounts[type], updated_at: new Date().toISOString() }),
      sbDelete('juve_log', `?id=eq.${last.id}`),
    ]);
    setSyncDot('ok');
    await loadJuve();
    showToast('↩ Annullato');
  } catch (e) {
    setSyncDot('err');
  }
}

function renderJuve() {
  renderJuveCounters();
  renderJuveStats();
  renderJuveLog();
}

function renderJuveCounters() {
  document.getElementById('juveCount').textContent       = juveCounts.juve;
  document.getElementById('cuccioloneCount').textContent = juveCounts.cucciolone;
}

function renderJuveStats() {
  const entries = juveLog.filter(l => l.type === 'juve');
  const now     = new Date();
  const curKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;

  // This month
  const thisMonth = entries.filter(l => l.created_at.startsWith(curKey)).length;
  document.getElementById('statThisMonth').textContent = thisMonth;

  // Monthly average
  const monthMap = {};
  entries.forEach(l => { const k = l.created_at.slice(0,7); monthMap[k] = (monthMap[k]||0)+1; });
  const months = Object.keys(monthMap).sort();
  const avg = months.length
    ? Math.round(Object.values(monthMap).reduce((a,b) => a+b, 0) / months.length * 10) / 10
    : 0;
  document.getElementById('statAvgMonth').textContent = avg;

  // Streak — consecutive days without Juve ending today
  const visitDays = new Set(entries.map(l => l.created_at.slice(0,10)));
  const todayStr  = now.toISOString().slice(0,10);
  let streak = 0;
  if (!visitDays.has(todayStr)) {
    const check = new Date(now); check.setDate(check.getDate() - 1);
    while (streak < 999) {
      if (visitDays.has(check.toISOString().slice(0,10))) break;
      streak++;
      check.setDate(check.getDate() - 1);
    }
    streak++;
  }
  const streakEl  = document.getElementById('statStreak');
  const iconEl    = document.getElementById('streakIcon');
  const labelEl   = document.getElementById('streakLabel');
  streakEl.textContent = streak;
  if (streak === 0) {
    streakEl.style.color = 'var(--green)'; iconEl.textContent = '✅'; labelEl.textContent = 'È qui oggi!';
  } else if (streak <= 3) {
    streakEl.style.color = 'var(--accent)'; iconEl.textContent = '👀'; labelEl.textContent = 'Giorni senza Juve';
  } else {
    streakEl.style.color = 'var(--red)'; iconEl.textContent = '😱'; labelEl.textContent = 'Giorni senza Juve';
  }

  // Day-of-week chart
  const dowCount = [0,0,0,0,0,0,0]; // Mon=0 … Sun=6
  entries.forEach(l => {
    const day = new Date(l.created_at).getDay();
    dowCount[day === 0 ? 6 : day - 1]++;
  });
  const maxDow = Math.max(...dowCount, 1);
  const DOW_IT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  document.getElementById('dowBars').innerHTML = dowCount.map((c, i) => {
    const pct   = Math.round((c / maxDow) * 100);
    const isTop = c === Math.max(...dowCount) && c > 0;
    return `<div class="dow-bar-wrap">
      <div class="dow-bar-inner"><div class="dow-bar${isTop ? ' top' : ''}" style="height:${Math.max(pct,2)}%"></div></div>
      <div class="dow-count">${c}</div>
      <div class="dow-label">${DOW_IT[i]}</div>
    </div>`;
  }).join('');

  // Monthly bar chart
  const MONTH_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const mEl = document.getElementById('monthlyBars');
  if (!months.length) {
    mEl.innerHTML = '<div style="color:var(--muted);font-size:12px;font-style:italic;">Nessun dato ancora.</div>';
    return;
  }
  const maxM = Math.max(...Object.values(monthMap), 1);
  mEl.innerHTML = months.map(k => {
    const [y, m] = k.split('-');
    const label  = `${MONTH_IT[parseInt(m)-1]} ${y}`;
    const count  = monthMap[k];
    const pct    = Math.round((count / maxM) * 100);
    const isCur  = k === curKey;
    return `<div class="month-row">
      <div class="month-name">${label}</div>
      <div class="month-bar-outer"><div class="month-bar-inner${isCur ? ' cur' : ''}" style="width:${pct}%"></div></div>
      <div class="month-count">${count}</div>
    </div>`;
  }).join('');
}

function renderJuveLog() {
  const logEl = document.getElementById('juveLog');
  if (!juveLog.length) {
    logEl.innerHTML = '<div class="log-empty">Nessun avvistamento ancora registrato.</div>';
    return;
  }
  logEl.innerHTML = juveLog.slice(0, 30).map(e => {
    const d  = new Date(e.created_at);
    const ts = d.toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'}) +
               ' · ' + d.toLocaleDateString('it-IT', {day:'2-digit',month:'short',year:'2-digit'});
    const ico = e.type === 'juve' ? '👑' : '🍦';
    const txt = e.type === 'juve' ? 'Juve è passato al cinema!' : 'Ha comprato un Cucciolone!';
    return `<div class="log-item">
      <span class="lg-ico">${ico}</span>
      <span class="lg-txt">${txt}</span>
      <span class="lg-time">${ts}</span>
    </div>`;
  }).join('');
}

function animateBump(id) {
  const el = document.getElementById(id);
  el.classList.remove('pop-anim');
  void el.offsetWidth;
  el.classList.add('pop-anim');
}
