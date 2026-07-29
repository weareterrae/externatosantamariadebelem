/* Função AGENDADA (Netlify) — de 5 em 5 min vai buscar os leads novos dos
   anúncios Instant Form da Meta e injeta-os no Netlify Forms ("lead-meta"),
   que dispara a notificação de email já configurada ("Any form").

   Variáveis de ambiente (definir no Netlify → Site settings → Environment):
     META_TOKEN    = token do Utilizador do Sistema do Externato (o de token.local.txt)
     META_PAGE_ID  = 687996854629618
     META_FORM_ID  = 1611174960635571   (ou vários, separados por vírgula)

   O token nunca sai do Netlify. A função obtém um Page token a partir dele.
   Dedup: guarda em Netlify Blobs a data do lead mais recente já processado. */
import { getStore } from '@netlify/blobs';

const GRAPH = 'https://graph.facebook.com/v21.0';

async function pageToken(token, pageId) {
  const r = await fetch(`${GRAPH}/${pageId}?fields=access_token&access_token=${encodeURIComponent(token)}`);
  const j = await r.json();
  if (j.error) throw new Error('page token: ' + j.error.message);
  return j.access_token;
}

async function injetarNoEmail(siteUrl, lead) {
  const c = {};
  for (const f of (lead.field_data || [])) c[f.name] = (f.values || []).join(', ');
  const body = new URLSearchParams();
  body.set('form-name', 'lead-meta');
  body.set('nome', c.full_name || c.nome || '(sem nome)');
  body.set('telefone', c.phone_number || c.telefone || '');
  body.set('email', c.email || '');
  body.set('idade_crianca', c.idade_crianca || '');
  body.set('quando_vaga', c.quando_vaga || '');
  body.set('origem', 'Anúncio Meta (Instant Form)');
  body.set('lead_id', lead.id || '');
  body.set('created_time', lead.created_time || '');
  const r = await fetch(`${siteUrl}/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  if (!r.ok) throw new Error('Netlify form POST ' + r.status);
}

export default async () => {
  const token = process.env.META_TOKEN, pageId = process.env.META_PAGE_ID, formIds = process.env.META_FORM_ID;
  const siteUrl = process.env.URL || 'https://externatosantamariadebelem.com';
  if (!token || !pageId || !formIds) { console.log('meta-leads: faltam env vars (META_TOKEN/META_PAGE_ID/META_FORM_ID)'); return new Response('missing env', { status: 200 }); }

  const store = getStore('meta-leads');
  let pt;
  try { pt = await pageToken(token, pageId); } catch (e) { console.log('meta-leads:', e.message); return new Response('token err', { status: 200 }); }

  let totalNovos = 0;
  for (const form of formIds.split(',').map(s => s.trim()).filter(Boolean)) {
    const seenKey = `last_${form}`;
    let last;
    try { last = await store.get(seenKey); } catch { last = null; }

    let leads = [];
    try {
      const r = await fetch(`${GRAPH}/${form}/leads?fields=id,created_time,field_data&limit=50&access_token=${encodeURIComponent(pt)}`);
      const j = await r.json();
      if (j.error) { console.log('meta-leads: leads', form, j.error.message); continue; }
      leads = j.data || [];
    } catch (e) { console.log('meta-leads: fetch', form, e.message); continue; }

    if (last == null) {
      // Primeira vez: marca a base "agora" e NÃO envia históricos.
      await store.set(seenKey, new Date().toISOString());
      console.log('meta-leads: baseline inicial para', form);
      continue;
    }
    if (!leads.length) continue;

    const lastTime = Date.parse(last);
    const novos = leads
      .filter(l => Date.parse(l.created_time) > lastTime)
      .sort((a, b) => Date.parse(a.created_time) - Date.parse(b.created_time));

    for (const lead of novos) {
      try { await injetarNoEmail(siteUrl, lead); totalNovos++; }
      catch (e) { console.log('meta-leads: envio', lead.id, e.message); }
    }
    // Avança a marca para o lead mais recente visto (o 1.º, ordem desc da API).
    if (Date.parse(leads[0].created_time) > lastTime) await store.set(seenKey, leads[0].created_time);
  }

  console.log(`meta-leads: ${totalNovos} lead(s) novo(s) enviado(s) por email.`);
  return new Response(`ok · ${totalNovos} novos`, { status: 200 });
};

export const config = { schedule: '*/5 * * * *' };
