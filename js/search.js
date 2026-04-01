// ─────────────────────────────────────────────────────────────
//  search.js  —  View: name search + personal shift card
// ─────────────────────────────────────────────────────────────
import { week1, week2, WEEK2_AVAILABLE } from './model.js';
import { W1_DATES, W2_DATES, DSHORT, W1_LABEL, W2_LABEL } from './config.js';

function makePills(days, dates) {
  return days.map((d, i) => {
    let pill;
    if (d.t === 'off')          pill = `<div class="spill off">— OFF</div>`;
    else if (d.t === 'assente') pill = `<div class="spill assente">ASSENTE</div>`;
    else if (d.swapped)         pill = `<div class="spill swapped">${d.time}<span class="sr">${d.t} · ${d.role}</span><span class="ssw">↔ cambiato</span></div><div class="phours">${d.h}h</div>`;
    else                        pill = `<div class="spill ${d.t}">${d.time}<span class="sr">${d.t} · ${d.role}</span></div><div class="phours">${d.h}h</div>`;
    return `<div class="pday">
      <div class="dl">${DSHORT[i]}</div>
      <div class="dd">${dates[i]}</div>
      ${pill}
    </div>`;
  }).join('');
}

export function doSearch(q) {
  const container = document.getElementById('personResults');
  const noRes     = document.getElementById('noRes');
  container.innerHTML = '';

  if (!q.trim()) { noRes.style.display = 'none'; return; }

  const found = week1.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  if (!found.length) { noRes.style.display = 'block'; return; }
  noRes.style.display = 'none';

  found.forEach(emp => {
    const tot1  = emp.days.reduce((s, d) => s + d.h, 0);
    const diff1 = tot1 - emp.contract;
    const days1Html = makePills(emp.days, W1_DATES);

    const extraHtml = diff1 > 0
      ? `<div class="stat extra"><div class="sv">${diff1}h</div><div class="sl">Straordinario</div></div>`
      : diff1 < 0
      ? `<div class="stat miss"><div class="sv">${diff1}h</div><div class="sl">Ore mancanti</div></div>`
      : `<div class="stat ok"><div class="sv">✓</div><div class="sl">Contratto OK</div></div>`;

    // Week 2
    let w2Html = '';
    if (WEEK2_AVAILABLE) {
      const emp2 = week2.find(e => e.name === emp.name);
      if (emp2) {
        const tot2  = emp2.days.reduce((s, d) => s + d.h, 0);
        const diff2 = tot2 - emp2.contract;
        const extra2 = diff2 > 0
          ? `<span style="color:var(--accent);font-family:'DM Mono';font-size:11px">+${diff2}h straord.</span>`
          : diff2 < 0
          ? `<span style="color:var(--red);font-family:'DM Mono';font-size:11px">${diff2}h</span>`
          : `<span style="color:var(--green);font-family:'DM Mono';font-size:11px">✓ contratto ok</span>`;
        w2Html = `
          <div class="w2-block">
            <span class="w2-tag">Settimana prossima</span>
            <div class="w2-notice">${W2_LABEL} · ${tot2}h pianificate · ${extra2}</div>
            <div class="pdays">${makePills(emp2.days, W2_DATES)}</div>
          </div>`;
      }
    } else {
      w2Html = `<div class="unavail-w2">⏳ Turni settimana prossima (${W2_LABEL}) non ancora disponibili</div>`;
    }

    const card = document.createElement('div');
    card.className = 'pcard';
    card.innerHTML = `
      <div class="pcard-name">${emp.name}</div>
      <div class="pcard-role">${emp.role} — contratto ${emp.contract}h</div>
      <div class="wklabel" style="display:flex;align-items:center;gap:8px;">
        Settimana corrente
        <span style="font-size:9px;background:rgba(82,196,120,.12);color:var(--green);border:1px solid rgba(82,196,120,.25);border-radius:4px;padding:2px 7px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${W1_LABEL}</span>
      </div>
      <div class="pdays" style="margin-top:8px">${days1Html}</div>
      ${w2Html}
      <div class="statsrow">
        <div class="stat"><div class="sv">${tot1}h</div><div class="sl">Ore sett. corrente</div></div>
        <div class="stat"><div class="sv" style="color:var(--muted)">${emp.contract}h</div><div class="sl">Contratto</div></div>
        ${extraHtml}
      </div>`;
    container.appendChild(card);
  });
}
