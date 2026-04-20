// ─────────────────────────────────────────────────────────────
//  trivia.js  —  MVC Quiz: Rim è la protagonista.
//
//  LAYOUT  : split-panel — immagine intera a sinistra, quiz a destra.
//  AUDIO   : file custom in audio/trivia/ con fallback Web Audio API.
//  IMMAGINI: 3 stati (normale / corretta / sbagliata) configurabili.
// ─────────────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════
//  MODEL  —  pure data & state, zero DOM
// ═══════════════════════════════════════════════════════════════

// ── Questions ─────────────────────────────────────────────────
const TRIVIA_QUESTIONS = [
  {
    q: "Cosa significa la sigla 'SPP'?",
    opts: ["Spesa Per Persona","Sudan Pakistan Polonia","Tung Tung Sahur","Contratto Non Confermato"],
    correct: 0,
    wrongMsg: "Bruhh... è la spesa per persona, muoviti a fare upselling e cross-selling, vendigli pure la madre. I responsabili ti ameranno!!!",
  },
  {
    q: "Dove si possono acquistare i biglietti?",
    opts: ["al Gate 3-8","Solo alle casse dove non è presente un commesso","Tutte le casse","Non si comprano, free entry e per le donne drink incluso"],
    correct: 2,
    wrongMsg: "La settimana parte il VENerdì! Leggi la tabella prima o poi…",
  },
  {
    q: "Chi è il leggendario 'Juve'?",
    opts: ["Il direttore del cinema","Un collega part-time","Il cliente più iconico del The Space Cinema 👑","Il proiettore della sala 1"],
    correct: 2,
    wrongMsg: "Juve è IL cliente. Quello che tutti riconoscono. La leggenda vivente.",
  },
  {
    q: "Che cos'è l'Hit Rate?",
    opts: ["Percentuale di clienti menati oggi(specialmente bambini)","Percentuali di clienti che comprano al bar su totale di presenze","il cugino di Hit-ler","Le hit assurde che passano solo su The space radio"],
    correct: 1,
    wrongMsg: "L'Hit Rate è il tasso di conversione in percentuale. Se l'obiettivo è 27%, significa che su 100 persone che entrano, almeno 27 devono fare uno scontrino al bar!",
  },
  {
    q: "Quale tra queste NON è una delle 5 Regole d'Oro",
    opts: ["Cordialità","Competenza","Non nominare il nome di Dio invano... e poi le altre lì","Senso di Priorità"],
    correct: 2,
    wrongMsg: "Le 5 regole sono: Presentabilità, Disponibilità, Senso di priorità, Cordialità e Competenza.",
  },
  {
    q: "Cosa compra di solito il leggendario Juve?",
    opts: ["Un Cucciolone","Un kebab con tutto, no picante","Uno dei dipendenti e ne fa cosa vuole","Il mondo intero"],
    correct: 0,
    wrongMsg: "Il Cucciolone è il gelato preferito di Juve. Se non dovesse essere nel frigo per noi è finita...",
  },
  {
    q: "Cosa significa la regola F.I.F.O.?",
    opts: ["Algoritmo di gestione delle task in uno scheduler CPU 🔴","First In, First Out: i prodotti che scadono prima vanno messi davanti 🔵","Fortnite Is Fantastic Of course  🟢","The floor is lava"],
    correct: 1,
    wrongMsg: "È First In, First Out. I prodotti con la scadenza più ravvicinata vanno esposti e usati per primi",
  },
  {
    q: "Su InMoment un cliente ci dà un 10 e loda il tuo sorriso. Questo fa schizzare in alto il nostro...",
    opts: ["Conto in Banca, 2 milioni cash","ehmm...","Livello di stress","NPS (Net Promoter Score) e CSI"],
    correct: 2,
    wrongMsg: "Aumentano NPS (Passaparola) e CSI (Soddisfazione). InMoment calcola se i clienti ci amano, molestarli non funziona",
  },
  {
    q: "Hai aperto un pacco di wurstel. Quanto tempo hai prima che scadano e si trasformino in Fassino?",
    opts: ["Per sempre, basta conservarli ermeticamente nell'ano","5 giorni","3 giorni","24 ore"],
    correct: 2,
    wrongMsg: "Attenzione all'HACCP! La Shelf Life (scadenza) dei wurstel aperti è di sole 24 ore. I popcorn invece durano 5 giorni, i nachos 3.",
  },
];

// ── Image config — change paths here to use different photos ──
// All three can point to the same file; CSS handles the visual state.
// To add a separate "angry" image: set wrong: 'images/rim_arrabbiata.jpeg'
const IMG_SRC = {
  normal:  'images/Rim_lo_spazio.jpeg',
  correct: 'images/Rim_lo_spazio.jpeg',
  wrong:   'images/Rim_ferro.jpeg',
};

// ── Audio config ───────────────────────────────────────────────
// Drop any of these files into your project's audio/trivia/ folder.
// If a file is missing or blocked, the system auto-falls back to
// the Web Audio API synthesised version — nothing breaks.
//
// Supported formats: .mp3  .ogg  .wav  .webm
//
const AUDIO_FILES = {
  appear:       'audio/trivia/appear.mp3',       // dramatic entry sting
  correct:      'audio/trivia/correct.mp3',       // victory fanfare
  wrong:        'audio/fusione_errore.mp3',         // sad trombone
  hover:        'audio/trivia/hover.mp3',         // soft tick on hover
  tick:         'audio/trivia/tick.mp3',          // countdown tick (normal)
  tick_urgent:  'audio/trivia/tick_urgent.mp3',   // countdown tick (last 5s)
};

// ── State ─────────────────────────────────────────────────────
const TriviaModel = {
  active:           false,
  answered:         false,
  currentQuestion:  null,

  BLOCK_KEY:         'trivia_blocked_until',
  LAST_SHOWN_KEY:    'trivia_last_shown',
  COOLDOWN_MS:       2 * 60 * 1000,   // 5 min between triggers
  BLOCK_DURATION_MS: 60 * 1000,        // 60 s punishment

  isBlocked()     { const v = localStorage.getItem(this.BLOCK_KEY);  return !!v && Date.now() < +v; },
  blockRemaining(){ const v = +(localStorage.getItem(this.BLOCK_KEY)||0); return Math.max(0, v - Date.now()); },
  setBlock()      { localStorage.setItem(this.BLOCK_KEY, String(Date.now() + this.BLOCK_DURATION_MS)); },
  clearBlock()    { localStorage.removeItem(this.BLOCK_KEY); },
  shouldTrigger() {
    if (this.isBlocked()) return false;
    return Date.now() - (+(localStorage.getItem(this.LAST_SHOWN_KEY)||0)) > this.COOLDOWN_MS;
  },
  markShown()    { localStorage.setItem(this.LAST_SHOWN_KEY, String(Date.now())); },
  pickQuestion() { return TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)]; },
};


// ═══════════════════════════════════════════════════════════════
//  AUDIO MODEL  —  hybrid: real files → Web Audio fallback
// ═══════════════════════════════════════════════════════════════

// Pre-warm audio elements at boot so they're ready instantly
const _audioCache = {};
function _preload(key) {
  if (_audioCache[key]) return;
  const el = new Audio();
  el.preload = 'auto';
  el.src     = AUDIO_FILES[key];
  _audioCache[key] = el;
}
Object.keys(AUDIO_FILES).forEach(_preload);

// Try to play a cached audio file; resolves true on success, false on failure
async function _playFile(key) {
  _preload(key);
  const el = _audioCache[key];
  if (!el) return false;
  try {
    el.currentTime = 0;
    await el.play();
    return true;
  } catch (_) {
    return false;
  }
}

// Web Audio API — synthesised fallback sounds
let _actx = null;
function _ac() {
  if (!_actx) _actx = new (window.AudioContext || window.webkitAudioContext)();
  if (_actx.state === 'suspended') _actx.resume();
  return _actx;
}
function _tone(ac, freq, type, start, dur, vol = 0.15) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.start(start); o.stop(start + dur + 0.02);
}

// Fallback synth sounds — only called when the audio file fails
const _synth = {
  appear() {
    const ac = _ac(), t = ac.currentTime;
    _tone(ac, 180, 'triangle', t,        0.10, 0.10);
    _tone(ac, 270, 'triangle', t + 0.08, 0.10, 0.12);
    _tone(ac, 360, 'triangle', t + 0.16, 0.14, 0.14);
    _tone(ac, 540, 'sine',     t + 0.22, 0.40, 0.12);
    _tone(ac, 720, 'sine',     t + 0.28, 0.30, 0.08);
  },
  hover() { const ac = _ac(); _tone(ac, 700, 'sine', ac.currentTime, 0.04, 0.04); },
  correct() {
    const ac = _ac(), t = ac.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => _tone(ac, f, 'triangle', t + i*0.1, 0.25, 0.14));
    setTimeout(() => {
      const t2 = _ac().currentTime;
      [2093, 2637, 3136].forEach((f, i) => _tone(_ac(), f, 'sine', t2 + i*0.05, 0.15, 0.05));
    }, 360);
  },
  wrong() {
    const ac = _ac(), t = ac.currentTime;
    [466, 440, 392, 349, 311].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'sawtooth';
      const s = t + i * 0.20;
      o.frequency.setValueAtTime(f, s);
      o.frequency.linearRampToValueAtTime(f - 25, s + 0.19);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.14, s + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.19);
      o.start(s); o.stop(s + 0.22);
    });
    const bz = ac.createOscillator(), bg = ac.createGain();
    bz.connect(bg); bg.connect(ac.destination);
    bz.type = 'square'; bz.frequency.value = 75;
    bg.gain.setValueAtTime(0.07, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    bz.start(t); bz.stop(t + 1.25);
  },
  tick(urgent) { const ac = _ac(); _tone(ac, urgent ? 1000 : 480, 'sine', ac.currentTime, 0.05, 0.07); },
};

// Public SFX interface — tries file first, falls back to synth
const SFX = {
  async appear()  { if (!await _playFile('appear'))  _synth.appear(); },
  async hover()   { if (!await _playFile('hover'))   _synth.hover(); },
  async correct() { if (!await _playFile('correct')) _synth.correct(); },
  async wrong()   { if (!await _playFile('wrong'))   _synth.wrong(); },
  async tick(n)   {
    const key = n <= 5 ? 'tick_urgent' : 'tick';
    if (!await _playFile(key)) _synth.tick(n <= 5);
  },
};


// ═══════════════════════════════════════════════════════════════
//  VIEW  —  DOM only, reads model state
// ═══════════════════════════════════════════════════════════════

// ── Image state ───────────────────────────────────────────────
// 'state' ∈ 'normal' | 'correct' | 'wrong'
function setImageState(state) {
  const img   = document.getElementById('triviaImg');
  const panel = document.getElementById('triviaImgPanel');
  const label = document.getElementById('triviaImgLabel');

  img.src        = IMG_SRC[state] || IMG_SRC.normal;
  img.className  = `t-img t-img--${state}`;
  panel.className = `t-img-panel t-img-panel--${state}`;

  const LABELS = {
    normal:  { text: '⚡ QUIZ OBBLIGATORIO',           cls: '' },
    correct: { text: '🏆 ESATTO! SEI UN GENIO',        cls: 't-label--correct' },
    wrong:   { text: '💀 SBAGLIATO! VERGOGNATI!',      cls: 't-label--wrong'   },
  };
  const l = LABELS[state] || LABELS.normal;
  label.textContent = l.text;
  label.className   = `t-img-label ${l.cls}`;
}

// ── Main quiz overlay ─────────────────────────────────────────
function renderTriviaOverlay(question) {
  const overlay  = document.getElementById('triviaOverlay');
  const card     = document.getElementById('triviaCard');
  const qEl      = document.getElementById('triviaQuestion');
  const optsEl   = document.getElementById('triviaOptions');
  const resultEl = document.getElementById('triviaResult');

  card.className        = 't-card';
  resultEl.style.display = 'none';

  setImageState('normal');
  qEl.textContent = question.q;

  optsEl.innerHTML = question.opts.map((opt, i) => `
    <button class="t-opt"
            onclick="window.__triviaAnswer(${i})"
            onmouseenter="window.__triviaHover()">
      <span class="t-opt-letter">${['A','B','C','D'][i]}</span>
      <span class="t-opt-text">${opt}</span>
    </button>
  `).join('');

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('t-visible'));
}

// ── Correct state ─────────────────────────────────────────────
function renderCorrectEffect(q) {
  const card    = document.getElementById('triviaCard');
  const optsEl  = document.getElementById('triviaOptions');
  const resultEl = document.getElementById('triviaResult');

  setImageState('correct');
  card.classList.add('t-card--correct');

  optsEl.querySelectorAll('.t-opt').forEach((btn, i) => {
    btn.disabled = true;
    btn.classList.add(i === q.correct ? 't-opt--correct' : 't-opt--dimmed');
  });

  resultEl.style.display = 'flex';
  resultEl.className     = 't-result t-result--correct';
  resultEl.innerHTML     = `
    <span class="t-result-icon">🏆</span>
    <div class="t-result-text">
      <strong>ESATTO!</strong>
      Hai dimostrato di meritare l'accesso ai turni.<br>
      <span>Perlomeno sai cosa fai al lavoro.</span>
    </div>
    <button class="t-continue-btn" onclick="window.__triviaClose()">Continua →</button>
  `;
  spawnParticles();
  screenFlash('rgba(82,196,120,0.22)');
}

// ── Wrong state ───────────────────────────────────────────────
function renderWrongEffect(q) {
  const card     = document.getElementById('triviaCard');
  const optsEl   = document.getElementById('triviaOptions');
  const resultEl = document.getElementById('triviaResult');

  setImageState('wrong');
  card.classList.add('t-card--wrong', 't-shake');
  setTimeout(() => card.classList.remove('t-shake'), 900);

  optsEl.querySelectorAll('.t-opt').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('t-opt--correct');
    else                  btn.classList.add('t-opt--wrong');
  });

  resultEl.style.display = 'flex';
  resultEl.className     = 't-result t-result--wrong';
  resultEl.innerHTML     = `
    <span class="t-result-icon">💀</span>
    <div class="t-result-text">
      <strong>SBAGLIATO!</strong>
      ${q.wrongMsg}<br>
      <span>Tra poco verrai bandito per 60 secondi…</span>
    </div>
  `;

  screenFlash('rgba(224,82,82,0.42)');
  const stopGlitch = startGlitch();

  setTimeout(() => {
    stopGlitch();
    closeTriviaOverlay();
    showBlockScreen();
  }, 2900);
}

// ── Glitch scanlines (injected during wrong state) ────────────
function startGlitch() {
  const panel = document.getElementById('triviaImgPanel');
  let live = true;
  (function tick() {
    if (!live) return;
    panel.querySelectorAll('.t-glitch').forEach(l => l.remove());
    const n = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const l = document.createElement('div');
      l.className = 't-glitch';
      l.style.cssText = `
        top: ${Math.random()*100}%;
        height: ${1 + Math.random()*6}%;
        background: ${Math.random() > 0.5 ? 'rgba(255,0,60,0.5)' : 'rgba(0,220,255,0.35)'};
        transform: translateX(${-10 + Math.random()*20}px) scaleY(${0.4 + Math.random()});
      `;
      panel.appendChild(l);
    }
    setTimeout(tick, 55 + Math.random() * 100);
  })();
  return () => { live = false; panel.querySelectorAll('.t-glitch').forEach(l => l.remove()); };
}

// ── Screen flash ──────────────────────────────────────────────
function screenFlash(color) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;inset:0;z-index:2000;pointer-events:none;
    background:${color};animation:tFlash 0.55s ease forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

// ── Confetti particles ────────────────────────────────────────
function spawnParticles() {
  const EM = ['🎉','⭐','✨','🌟','🎊','💫','🏆','🎬','🍿','🎭','💥','🔥','🎯','👑'];
  for (let i = 0; i < 48; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 't-particle';
      el.textContent = EM[Math.floor(Math.random() * EM.length)];
      const dx = -55 + Math.random() * 110;
      const dy = -(30 + Math.random() * 50);
      el.style.cssText = `
        left:${10+Math.random()*80}vw; top:${25+Math.random()*35}vh;
        font-size:${12+Math.random()*20}px;
        --tx:${dx}vw; --ty:${dy}vh;
        animation-duration:${0.9+Math.random()*1}s;
        animation-delay:${Math.random()*0.28}s;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2400);
    }, i * 28);
  }
}

// ── Close quiz overlay ────────────────────────────────────────
function closeTriviaOverlay() {
  const overlay = document.getElementById('triviaOverlay');
  overlay.classList.remove('t-visible');
  setTimeout(() => { overlay.style.display = 'none'; }, 400);
  TriviaModel.active   = false;
  TriviaModel.answered = false;
}

// ── Block screen ──────────────────────────────────────────────
let _blockTimer = null;

function showBlockScreen() {
  const overlay   = document.getElementById('triviaBlockOverlay');
  const countdown = document.getElementById('triviaBlockCountdown');
  const bar       = document.getElementById('triviaBlockBar');
  const TOTAL     = TriviaModel.BLOCK_DURATION_MS;

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('t-visible'));

  clearInterval(_blockTimer);
  let lastTick = -1;

  _blockTimer = setInterval(() => {
    const rem  = TriviaModel.blockRemaining();
    const secs = Math.ceil(rem / 1000);

    if (rem <= 0) {
      clearInterval(_blockTimer);
      TriviaModel.clearBlock();
      overlay.classList.remove('t-visible');
      setTimeout(() => { overlay.style.display = 'none'; }, 400);
      screenFlash('rgba(82,196,120,0.28)');
      return;
    }

    countdown.textContent = secs;
    countdown.classList.toggle('t-countdown--urgent', secs <= 5);
    bar.style.width = `${(rem / TOTAL) * 100}%`;

    if (secs !== lastTick) { SFX.tick(secs); lastTick = secs; }
  }, 120);
}


// ═══════════════════════════════════════════════════════════════
//  CONTROLLER
// ═══════════════════════════════════════════════════════════════

export function initTrivia() {
  // Pre-warm audio context on first user gesture
  document.addEventListener('click', () => { try { _ac(); } catch(_) {} }, { once: true });

  if (TriviaModel.isBlocked()) { showBlockScreen(); return; }
  if (TriviaModel.shouldTrigger()) {
    const delay = 1_000 + Math.random() * 30_000; // 45–135 s
    setTimeout(_triggerTrivia, delay);
  }
}

function _triggerTrivia() {
  if (TriviaModel.active || TriviaModel.isBlocked()) return;
  TriviaModel.currentQuestion = TriviaModel.pickQuestion();
  TriviaModel.active          = true;
  TriviaModel.answered        = false;
  TriviaModel.markShown();
  renderTriviaOverlay(TriviaModel.currentQuestion);
  SFX.appear();
}

// ── Window-level handlers — same pattern as rest of the app ───
window.__triviaHover  = () => SFX.hover();

window.__triviaAnswer = (idx) => {
  if (!TriviaModel.active || TriviaModel.answered) return;
  TriviaModel.answered = true;
  const q = TriviaModel.currentQuestion;
  if (idx === q.correct) { SFX.correct(); renderCorrectEffect(q); }
  else                    { TriviaModel.setBlock(); SFX.wrong(); renderWrongEffect(q); }
};

window.__triviaClose = () => closeTriviaOverlay();

// Dev helper — run window.__triggerTrivia() in the browser console
window.__triggerTrivia = () => {
  TriviaModel.active   = false;
  TriviaModel.answered = false;
  _triggerTrivia();
};
