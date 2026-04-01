// ─────────────────────────────────────────────────────────────
//  data/template.js
//
//  ISTRUZIONI PER AGGIORNARE I TURNI OGNI SETTIMANA
//  ─────────────────────────────────────────────────
//
//  1. Apri  js/config.js  e aggiorna:
//       W1_DATES   → date dei 7 giorni della settimana corrente
//       W2_DATES   → date della settimana successiva
//       W1_LABEL   → etichetta leggibile (es. "28 Mar – 03 Apr")
//       W2_LABEL   → etichetta settimana successiva
//       WEEK2_AVAILABLE → false finché non pubblichi la sett. 2
//       LAST_MODIFIED   → data di oggi
//
//  2. Apri  js/data.js  e:
//       a) Copia tutto BASE_WEEK1 e incollalo come BASE_WEEK2
//       b) Sostituisci BASE_WEEK1 con i nuovi turni
//
//  FORMATO TURNO
//  ─────────────
//  {
//    t:    'apertura' | 'chiusura' | 'intermedio' | 'off' | 'assente',
//    time: '13:15–19:15',   ← usa – (en-dash), NON - (hyphen)
//    role: 'CONC',
//    h:    6,               ← ore effettive (numero)
//  }
//  Per OFF/ASSENTE: {t:'off', time:'', role:'', h:0}
//
//  TEMPLATE DIPENDENTE
//  ────────────────────
//  {name:'Cognome Nome', role:'Add. Multiplex', contract:20, days:[
//    {t:'', time:'', role:'', h:0},  // VEN
//    {t:'', time:'', role:'', h:0},  // SAB
//    {t:'', time:'', role:'', h:0},  // DOM
//    {t:'', time:'', role:'', h:0},  // LUN
//    {t:'', time:'', role:'', h:0},  // MAR
//    {t:'', time:'', role:'', h:0},  // MER
//    {t:'', time:'', role:'', h:0},  // GIO
//  ]},
// ─────────────────────────────────────────────────────────────
