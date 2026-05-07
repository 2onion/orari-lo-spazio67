// ─────────────────────────────────────────────────────────────
//  trivia_admin.js  —  MVC: gestione domande quiz personalizzate
//
//  MODEL  : stato locale + Supabase table `trivia_questions`
//  VIEW   : render lista domande + form aggiunta
//  CTRL   : load / add / delete / toggle-enable
// ─────────────────────────────────────────────────────────────
import { sbGet, sbPost, sbPatch, sbDelete } from './supabase.js';
import { showToast, setSyncDot }            from './app.js';


// ═══════════════════════════════════════════════════════════════
//  MODEL
// ═══════════════════════════════════════════════════════════════

// Cache of custom questions fetched from Supabase.
// Shape: { id, question, opt_a, opt_b, opt_c, opt_d,
//           correct_index (0-3), wrong_msg, author, enabled,
//           created_at }
let _customQuestions = [];

export function getCustomQuestions() { return _customQuestions; }

// Fetch all custom questions from Supabase
export async function loadCustomQuestions() {
  try {
    setSyncDot('loading');
    const rows = await sbGet('trivia_questions', '?order=created_at.desc');
    setSyncDot('ok');
    _customQuestions = rows || [];
    return _customQuestions;
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore caricamento domande quiz');
    return [];
  }
}

// Add a new custom question
async function addQuestion(data) {
  try {
    setSyncDot('loading');
    const rows = await sbPost('trivia_questions', {
      question:      data.question.trim(),
      opt_a:         data.opts[0].trim(),
      opt_b:         data.opts[1].trim(),
      opt_c:         data.opts[2].trim(),
      opt_d:         data.opts[3].trim(),
      correct_index: data.correctIndex,
      wrong_msg:     data.wrongMsg.trim(),
      author:        data.author.trim() || 'Anonimo',
      enabled:       true,
    });
    setSyncDot('ok');
    _customQuestions = [rows[0], ..._customQuestions];
    return true;
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore salvataggio domanda');
    return false;
  }
}

// Toggle enabled / disabled
async function toggleQuestion(id, currentEnabled) {
  try {
    setSyncDot('loading');
    await sbPatch('trivia_questions', `?id=eq.${id}`, { enabled: !currentEnabled });
    setSyncDot('ok');
    const q = _customQuestions.find(q => q.id === id);
    if (q) q.enabled = !currentEnabled;
    return true;
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore aggiornamento');
    return false;
  }
}

// Delete a custom question
async function deleteQuestion(id) {
  try {
    setSyncDot('loading');
    await sbDelete('trivia_questions', `?id=eq.${id}`);
    setSyncDot('ok');
    _customQuestions = _customQuestions.filter(q => q.id !== id);
    return true;
  } catch (e) {
    setSyncDot('err');
    showToast('❌ Errore eliminazione');
    return false;
  }
}

// Validation — returns error string or null
function validateForm(data) {
  if (!data.question)            return 'Inserisci il testo della domanda.';
  if (data.question.length > 220) return 'Domanda troppo lunga (max 220 caratteri).';
  for (let i = 0; i < 4; i++) {
    if (!data.opts[i]) return `Inserisci l'opzione ${['A','B','C','D'][i]}.`;
    if (data.opts[i].length > 120) return `Opzione ${['A','B','C','D'][i]} troppo lunga (max 120 car.).`;
  }
  if (data.correctIndex < 0 || data.correctIndex > 3) return 'Seleziona la risposta corretta.';
  if (!data.wrongMsg)            return 'Inserisci il messaggio per risposta sbagliata.';
  if (data.wrongMsg.length > 200) return 'Messaggio errore troppo lungo (max 200 caratteri).';
  return null;
}


// ═══════════════════════════════════════════════════════════════
//  VIEW
// ═══════════════════════════════════════════════════════════════

// ── Render the entire Quiz admin page ─────────────────────────
export function renderQuizAdmin() {
  const container = document.getElementById('quizAdminContent');
  if (!container) return;

  container.innerHTML = `
    <!-- ── ADD FORM ── -->
    <div class="qa-section">
      <h3 class="qa-section-title">➕ Aggiungi una domanda</h3>
      <p class="qa-section-sub">
        Metti alla prova la canoscenza dei tuoi colleghi!!! Non ci sono limiti.
      </p>

      <div class="qa-form" id="qaForm">

        <!-- Question text -->
        <div class="qa-field qa-field--full">
          <label class="qa-label">Testo della domanda</label>
          <textarea class="qa-input qa-textarea" id="qaQuestion"
                    placeholder="es. Qual è la correlazione tra leibniz e la crema caffè?" maxlength="220"></textarea>
          <div class="qa-char" id="qaQuestionChar">0 / 220</div>
        </div>

        <!-- 4 options -->
        <div class="qa-opts-grid">
          ${['A','B','C','D'].map((l, i) => `
            <div class="qa-field">
              <label class="qa-label">
                <span class="qa-opt-dot qa-opt-dot--${l.toLowerCase()}">${l}</span>
                Opzione ${l}
              </label>
              <input class="qa-input" id="qaOpt${l}" type="text"
                     placeholder="Risposta ${l}…" maxlength="120">
            </div>
          `).join('')}
        </div>

        <!-- Correct answer -->
        <div class="qa-field qa-field--full">
          <label class="qa-label">✅ Risposta corretta</label>
          <div class="qa-radio-group">
            ${['A','B','C','D'].map((l, i) => `
              <label class="qa-radio-label" id="qaRadioLabel${l}">
                <input type="radio" name="qaCorrect" value="${i}" id="qaRadio${l}">
                <span class="qa-radio-dot">${l}</span>
                <span class="qa-radio-text" id="qaRadioText${l}">Opzione ${l}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Wrong message -->
        <div class="qa-field qa-field--full">
          <label class="qa-label">💬 Messaggio per chi sbaglia</label>
          <input class="qa-input" id="qaWrongMsg" type="text"
                 placeholder="es. CONC = Concession! Quello con i popcorn 🍿"
                 maxlength="200">
        </div>

        <!-- Author -->
        <div class="qa-field">
          <label class="qa-label">✍️ Il tuo nome (facoltativo)</label>
          <input class="qa-input" id="qaAuthor" type="text"
                 placeholder="es. Sara, Carlo Chatraplin…" maxlength="40">
        </div>

        <!-- Error + submit -->
        <div class="qa-field qa-field--full">
          <div class="qa-error" id="qaError" style="display:none"></div>
          <div class="qa-btn-row">
            <button class="qa-submit-btn" id="qaSubmitBtn" onclick="window.__qaSubmit()">
              ✓ Aggiungi domanda
            </button>
            <button class="qa-reset-btn" onclick="window.__qaReset()">Annulla</button>
          </div>
        </div>

      </div>
    </div>

    <!-- ── QUESTIONS LIST ── -->
    <div class="qa-section">
      <h3 class="qa-section-title">
        📋 Domande personalizzate
        <span class="qa-count-badge" id="qaCountBadge">…</span>
      </h3>
      <p class="qa-section-sub">
        Le domande disabilitate non appaiono nel quiz ma restano salvate.
      </p>
      <div id="qaList" class="qa-list">
        <div class="qa-loading">Caricamento…</div>
      </div>
    </div>
  `;

  // Wire up live char counter + radio label sync
  _bindFormEvents();

  // Render questions
  renderQuestionsList();
}

function _bindFormEvents() {
  const qEl = document.getElementById('qaQuestion');
  if (qEl) {
    qEl.addEventListener('input', () => {
      document.getElementById('qaQuestionChar').textContent =
        `${qEl.value.length} / 220`;
    });
  }
  // Sync radio labels with option text inputs
  ['A','B','C','D'].forEach((l, i) => {
    const inp = document.getElementById(`qaOpt${l}`);
    if (!inp) return;
    inp.addEventListener('input', () => {
      const rt = document.getElementById(`qaRadioText${l}`);
      if (rt) rt.textContent = inp.value.trim() || `Opzione ${l}`;
    });
  });
}

// ── Render the list of custom questions ───────────────────────
function renderQuestionsList() {
  const list  = document.getElementById('qaList');
  const badge = document.getElementById('qaCountBadge');
  if (!list) return;

  const total   = _customQuestions.length;
  const enabled = _customQuestions.filter(q => q.enabled).length;
  if (badge) badge.textContent = `${enabled} attive · ${total} totali`;

  if (!total) {
    list.innerHTML = `
      <div class="qa-empty">
        Nessuna domanda personalizzata ancora.<br>
        Sii il primo ad aggiungerne una! ⬆️
      </div>`;
    return;
  }

  list.innerHTML = _customQuestions.map(q => _renderQuestionCard(q)).join('');
}

function _renderQuestionCard(q) {
  const opts = [q.opt_a, q.opt_b, q.opt_c, q.opt_d];
  const letters = ['A','B','C','D'];

  const optsList = opts.map((o, i) => `
    <span class="qa-card-opt ${i === q.correct_index ? 'qa-card-opt--correct' : ''}">
      <span class="qa-card-opt-letter">${letters[i]}</span>${o}
      ${i === q.correct_index ? '<span class="qa-card-correct-mark">✓</span>' : ''}
    </span>
  `).join('');

  const date = new Date(q.created_at).toLocaleDateString('it-IT', {
    day:'2-digit', month:'short', year:'2-digit'
  });

  return `
    <div class="qa-card ${q.enabled ? '' : 'qa-card--disabled'}" id="qaCard-${q.id}">
      <div class="qa-card-header">
        <div class="qa-card-meta">
          <span class="qa-card-author">✍️ ${q.author || 'Anonimo'}</span>
          <span class="qa-card-date">${date}</span>
        </div>
        <div class="qa-card-actions">
          <button class="qa-toggle-btn ${q.enabled ? 'qa-toggle-btn--on' : 'qa-toggle-btn--off'}"
                  onclick="window.__qaToggle('${q.id}', ${q.enabled})"
                  title="${q.enabled ? 'Disabilita' : 'Abilita'}">
            ${q.enabled ? '👁 Attiva' : '🚫 Disabilitata'}
          </button>
          <button class="qa-delete-btn"
                  onclick="window.__qaDelete('${q.id}')"
                  title="Elimina domanda">✕</button>
        </div>
      </div>

      <div class="qa-card-question">${q.question}</div>

      <div class="qa-card-opts">${optsList}</div>

      ${q.wrong_msg ? `
        <div class="qa-card-wrong-msg">
          💬 <em>${q.wrong_msg}</em>
        </div>` : ''}
    </div>
  `;
}

// ── Show inline error ─────────────────────────────────────────
function showFormError(msg) {
  const el = document.getElementById('qaError');
  if (!el) return;
  el.textContent = `⚠️ ${msg}`;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function clearFormError() {
  const el = document.getElementById('qaError');
  if (el) el.style.display = 'none';
}

// ── Read form values ──────────────────────────────────────────
function readForm() {
  const correctRadio = document.querySelector('input[name="qaCorrect"]:checked');
  return {
    question:     document.getElementById('qaQuestion')?.value  || '',
    opts: [
      document.getElementById('qaOptA')?.value || '',
      document.getElementById('qaOptB')?.value || '',
      document.getElementById('qaOptC')?.value || '',
      document.getElementById('qaOptD')?.value || '',
    ],
    correctIndex: correctRadio ? parseInt(correctRadio.value) : -1,
    wrongMsg:     document.getElementById('qaWrongMsg')?.value || '',
    author:       document.getElementById('qaAuthor')?.value   || '',
  };
}

// ── Reset form ────────────────────────────────────────────────
function resetForm() {
  ['qaQuestion','qaOptA','qaOptB','qaOptC','qaOptD','qaWrongMsg','qaAuthor']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('input[name="qaCorrect"]').forEach(r => r.checked = false);
  ['A','B','C','D'].forEach(l => {
    const rt = document.getElementById(`qaRadioText${l}`);
    if (rt) rt.textContent = `Opzione ${l}`;
  });
  const charEl = document.getElementById('qaQuestionChar');
  if (charEl) charEl.textContent = '0 / 220';
  clearFormError();
}


// ═══════════════════════════════════════════════════════════════
//  CONTROLLER
// ═══════════════════════════════════════════════════════════════

export async function initQuizAdmin() {
  renderQuizAdmin();
  await loadCustomQuestions();
  renderQuestionsList();
}

// ── Submit new question ───────────────────────────────────────
window.__qaSubmit = async function () {
  clearFormError();
  const data = readForm();
  const err  = validateForm(data);
  if (err) { showFormError(err); return; }

  const btn = document.getElementById('qaSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvataggio…'; }

  const ok = await addQuestion(data);

  if (btn) { btn.disabled = false; btn.textContent = '✓ Aggiungi domanda'; }

  if (ok) {
    resetForm();
    renderQuestionsList();
    showToast('✓ Domanda aggiunta al quiz!');
    // Scroll to list so they see their new question
    document.getElementById('qaList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ── Reset form ────────────────────────────────────────────────
window.__qaReset = function () { resetForm(); };

// ── Toggle enabled/disabled ───────────────────────────────────
window.__qaToggle = async function (id, currentEnabled) {
  const ok = await toggleQuestion(id, currentEnabled);
  if (ok) {
    renderQuestionsList();
    showToast(currentEnabled ? '🚫 Domanda disabilitata' : '👁 Domanda abilitata');
  }
};

// ── Delete question ───────────────────────────────────────────
window.__qaDelete = async function (id) {
  if (!confirm('Eliminare questa domanda dal quiz?')) return;
  const ok = await deleteQuestion(id);
  if (ok) {
    renderQuestionsList();
    showToast('🗑 Domanda eliminata');
  }
};
