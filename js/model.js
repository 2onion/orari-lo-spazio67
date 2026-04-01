// ─────────────────────────────────────────────────────────────
//  model.js  —  Application state. Pure logic, zero DOM.
//  Source of truth: Supabase `shifts` table.
//  data.js is only used for the one-time seed.
// ─────────────────────────────────────────────────────────────
import { W1_DATES, W2_DATES, WEEK2_AVAILABLE } from './config.js';

export let week1 = [];
export let week2 = [];
export let currentWeek = 1;

export function setCurrentWeek(n) { currentWeek = n; }
export function getCurrentDates() { return currentWeek === 1 ? W1_DATES : W2_DATES; }
export function getCurrentData()  { return currentWeek === 1 ? week1 : week2; }

/** Called by shifts.js after loading from Supabase */
export function setWeekData(w1, w2) {
  week1 = w1;
  week2 = w2;
}

/** Update a single employee's days in memory after an edit */
export function updateEmployeeDays(weekN, name, newDays) {
  const wk = weekN === 1 ? week1 : week2;
  const emp = wk.find(e => e.name === name);
  if (emp) emp.days = newDays.map(d => ({ ...d }));
}

/** Clear swap flags, then re-apply all swaps on top of current data */
export function applySwapsToData(swapsArray) {
  [week1, week2].forEach(wk =>
    wk.forEach(emp => emp.days.forEach(d => { delete d.swapped; delete d.swappedWith; }))
  );
  [...swapsArray].reverse().forEach(s => applySwap(s));
}

export function applySwap(s) {
  const wd      = s.week_n === 1 ? week1 : week2;
  const fromEmp = wd.find(e => e.name === s.from_name);
  const toEmp   = wd.find(e => e.name === s.to_name);
  if (fromEmp) fromEmp.days[s.day_idx_a] = { ...s.shift_a, swapped: true, swappedWith: s.to_name };
  if (toEmp)   toEmp.days[s.day_idx_b]   = { ...s.shift_b, swapped: true, swappedWith: s.from_name };
}

export function getTodayColIdx() {
  const dates  = getCurrentDates();
  const now    = new Date();
  const MONTHS = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const str    = `${String(now.getDate()).padStart(2,'0')} ${MONTHS[now.getMonth()]}`;
  return dates.indexOf(str);
}

export function getTodayWorking() {
  const todayIdx = getTodayColIdx();
  if (todayIdx === -1) return [];
  return getCurrentData()
    .filter(e => { const d = e.days[todayIdx]; return d && d.t !== 'off' && d.t !== 'assente' && d.h > 0; })
    .sort((a, b) => {
      const ta = a.days[todayIdx].time.split('–')[0] || '00:00';
      const tb = b.days[todayIdx].time.split('–')[0] || '00:00';
      return ta.localeCompare(tb);
    });
}

export function getAllNames() { return week1.map(e => e.name); }
export { WEEK2_AVAILABLE };
