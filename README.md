# 🎬 The Space 67 — Turni

Gestione turni settimanali per il team di The Space Cinema 67.

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend | HTML + Vanilla JS (no framework) |
| Styling | CSS custom properties |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Hosting | [Netlify](https://netlify.com) |

## Struttura progetto

```
thespace-turni/
├── index.html          # Entry point — shell HTML only, zero logic
├── css/
│   └── style.css       # Tutti gli stili
├── js/
│   ├── config.js       # Supabase keys, costanti settimana
│   ├── supabase.js     # Wrapper API Supabase (sbGet/sbPost/sbPatch/sbDelete)
│   ├── data.js         # BASE_WEEK1, BASE_WEEK2 — turni settimanali
│   ├── model.js        # State app: week1, week2, swaps. Logica pura (no DOM)
│   ├── schedule.js     # View: tabella turni + panel "oggi"
│   ├── search.js       # View: ricerca per nome
│   ├── swaps.js        # View + Controller: cambio turno reciproco
│   ├── juve.js         # View + Controller: contatori Juve
│   └── app.js          # Controller principale: nav, init, switchNav
└── data/
    └── template.js     # Template per aggiungere una nuova settimana
```

## Come aggiornare i turni ogni settimana

Apri `js/data.js` e modifica:

```js
// 1. Aggiorna le date
export const W1_DATES = ['28 Mar','29 Mar',...];
export const W2_DATES = ['04 Apr','05 Apr',...];

// 2. Aggiorna WEEK2_AVAILABLE quando la settimana 2 è pronta
export const WEEK2_AVAILABLE = true;

// 3. Copia BASE_WEEK1 → BASE_WEEK2, poi aggiorna BASE_WEEK1 con i nuovi turni
```

## Cambio turno — come funziona

I cambi turno sono **reciproci**: persona A cede un turno, persona B cede un altro turno in cambio.
Vengono salvati su Supabase e sono visibili a tutti in tempo reale.
Ogni collega può registrare un cambio direttamente dall'app.

## Supabase — tabelle necessarie

Esegui questo SQL nel tuo progetto Supabase:

```sql
-- Cambi turno
create table swaps (
  id uuid primary key default gen_random_uuid(),
  from_name text not null,
  to_name text not null,
  week_n integer not null,
  day_idx_a integer not null,
  day_idx_b integer not null,
  day_label_a text not null,
  day_label_b text not null,
  shift_a jsonb not null,
  shift_b jsonb not null,
  note text,
  created_at timestamptz default now()
);

-- Contatori Juve
create table juve_counters (
  id text primary key,
  count integer default 0,
  updated_at timestamptz default now()
);
insert into juve_counters (id, count) values ('juve', 0), ('cucciolone', 0);

-- Log Juve
create table juve_log (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  created_at timestamptz default now()
);

-- Policies (accesso pubblico, app interna)
alter table swaps enable row level security;
alter table juve_counters enable row level security;
alter table juve_log enable row level security;
create policy "public" on swaps for all using (true) with check (true);
create policy "public" on juve_counters for all using (true) with check (true);
create policy "public" on juve_log for all using (true) with check (true);
```

## Deploy su Netlify

1. Push su GitHub
2. Netlify → "Add new site" → "Import from GitHub"
3. Build command: *(lascia vuoto)*
4. Publish directory: `.` (root)
5. Deploy ✓
