// ─────────────────────────────────────────────────────────────
//  supabase.js  —  Thin wrapper around the Supabase REST API
// ─────────────────────────────────────────────────────────────
import { SB_URL, SB_KEY } from './config.js';

const H = {
  'Content-Type': 'application/json',
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Prefer': 'return=representation',
};

export async function sbGet(table, query = '') {
  const r = await fetch(`${SB_URL}/rest/v1/${table}${query}`, { headers: H });
  if (!r.ok) throw new Error(`GET ${table} failed: ${r.status}`);
  return r.json();
}

export async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST', headers: H, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${table} failed: ${r.status}`);
  return r.json();
}

export async function sbPatch(table, query, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}${query}`, {
    method: 'PATCH', headers: H, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${table} failed: ${r.status}`);
  return r.json();
}

export async function sbDelete(table, query) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}${query}`, {
    method: 'DELETE', headers: H,
  });
  if (!r.ok) throw new Error(`DELETE ${table} failed: ${r.status}`);
  return true;
}
