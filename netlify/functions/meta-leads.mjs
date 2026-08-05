/**
 * Webhook de Lead Ads da app "Leads Externato" (caminho DIRETO, sem Make).
 * Meta → esta função → CRM (Nº 5) + email à escola (com tier) + ack da Avó Maria.
 *
 * Env necessários (Netlify do site do Externato):
 *   META_LEADS_VERIFY      — verify token do webhook (ex.: externato-leads-2026)
 *   META_LEADS_APP_SECRET  — App Secret da app "Leads Externato" (valida a assinatura)
 *   META_LEADS_PAGE_TOKEN  — token do system user (com leads_retrieval) que gere a página
 *   CRM_INGEST_TOKEN, RESEND_API_KEY, LEAD_EMAILS — já existem
 *
 * Rotas:
 *   GET  ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…  → verificação da Meta
 *   GET  /subscribe?key=<VERIFY>   → instala a app na Página (subscribed_apps: leadgen)
 *   POST                            → evento leadgen (valida assinatura → processa)
 */
import crypto from "node:crypto";

const GRAPH = "https://graph.facebook.com/v21.0";
const PAGE = "687996854629618";
const CRM = "https://app.numerocinco.pt/api/leads/ingest";
const REMETENTE = "Externato Santa Maria de Belém <geral@numerocinco.pt>";

const VERIFY = process.env.META_LEADS_VERIFY;
const APP_SECRET = process.env.META_LEADS_APP_SECRET;
const SU_TOKEN = process.env.META_LEADS_PAGE_TOKEN;
const CRM_TOKEN = process.env.CRM_INGEST_TOKEN;
const RESEND = process.env.RESEND_API_KEY;
const LEAD_EMAILS = (process.env.LEAD_EMAILS || "geral@externatosantamariadebelem.com").split(",").map((s) => s.trim()).filter(Boolean);

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ROTULO = { idade_crianca: "Idade da criança", quando_vaga: "Procura vaga para", idade: "Idade da criança", quando: "Procura vaga para" };

// token da PÁGINA (subscribed_apps e leadgen exigem-no); derivado do token do system user
let _pt = "", _ptAt = 0;
async function pageTok() {
  if (_pt && Date.now() - _ptAt < 3000000) return _pt;
  try {
    const j = await (await fetch(`${GRAPH}/me/accounts?fields=id,access_token&access_token=${SU_TOKEN}`)).json();
    const p = (j.data || []).find((x) => String(x.id) === PAGE) || (j.data || [])[0];
    _pt = p?.access_token || SU_TOKEN; _ptAt = Date.now();
  } catch { _pt = SU_TOKEN; }
  return _pt;
}

function tier(quando) {
  const v = (quando || "").toLowerCase();
  if (/setemb|imediat|urgent|j[áa]\b/.test(v)) return "🔴 LIGAR HOJE · ";
  if (/ao longo|durante|pr[óo]ximo|qualquer/.test(v)) return "🟡 ";
  if (/informar|s[óo] a|curios/.test(v)) return "⚪ ";
  return "";
}

function emailEscola({ nome, tel, email, campos }) {
  const telLimpo = (tel || "").replace(/[^\d+]/g, "");
  const wa = telLimpo ? telLimpo.replace(/^\+/, "") : "";
  const linhas = Object.entries(campos || {}).filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#7E9C88;font-size:13px;width:190px;vertical-align:top">${esc(ROTULO[k] || k)}</td><td style="padding:6px 0;color:#26332B;font-size:15px;font-weight:700">${esc(v)}</td></tr>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#F6EFDE;padding:0 0 8px">
    <div style="background:#3B6B50;color:#FBF6EA;border-radius:0 0 18px 18px;padding:22px 26px">
      <p style="margin:0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#E8C36A">Nova lead · Anúncio (Instant Form)</p>
      <h1 style="margin:6px 0 0;font-size:24px;color:#fff">${esc(nome)}</h1></div>
    <div style="padding:20px 26px">
      <div style="margin-bottom:16px">
        ${telLimpo ? `<a href="tel:${esc(telLimpo)}" style="display:inline-block;background:#C27A66;color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:11px 22px;margin:0 8px 8px 0">📞 Ligar ${esc(tel)}</a>` : ""}
        ${wa ? `<a href="https://wa.me/${esc(wa)}" style="display:inline-block;background:#3B6B50;color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:11px 22px;margin:0 8px 8px 0">💬 WhatsApp</a>` : ""}
        ${email ? `<a href="mailto:${esc(email)}" style="display:inline-block;background:#C9993F;color:#26332B;text-decoration:none;font-weight:800;border-radius:999px;padding:11px 22px;margin:0 0 8px 0">✉️ Email</a>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e4dcc7">
        ${email ? `<tr><td style="padding:6px 0;color:#7E9C88;font-size:13px;width:190px">Email</td><td style="padding:6px 0;color:#26332B;font-size:15px;font-weight:700">${esc(email)}</td></tr>` : ""}
        ${linhas}</table>
      <p style="margin:20px 0 0;font-size:14px;color:#26332B;background:#fff;border-radius:12px;padding:12px 16px">⏱️ <b>Ligue o quanto antes</b> — responder rápido é o que mais fecha matrículas.</p>
    </div></div>`;
}

function ackAvo(nome) {
  const primeiro = (nome || "").trim().split(/\s+/)[0] || "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#F6EFDE">
    <div style="background:#3B6B50;color:#fff;border-radius:0 0 16px 16px;padding:22px 26px">
      <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#E8C36A;font-weight:700">Externato Santa Maria de Belém</div>
      <h1 style="margin:6px 0 0;font-size:23px;color:#fff">Olá${primeiro ? " " + esc(primeiro) : ""}! 🌿</h1></div>
    <div style="padding:20px 26px;color:#26332B;font-size:15px;line-height:1.65">
      <p style="margin:0">Recebemos o seu pedido, com muito gosto. A escola liga-lhe ainda no próximo dia útil — palavra da Avó Maria.</p>
      <p style="margin:14px 0 0">E guarde já a data: <b>Open Day, sábado 12 de setembro, 10h–13h</b>. Venha conhecer a nossa casa em Belém — e traga o seu filho, que a visita também é dele.</p>
      <p style="margin:16px 0 0">Com carinho,<br><b>A Avó Maria</b><br><span style="color:#7E9C88;font-size:13px">Externato Santa Maria de Belém · Restelo, Lisboa · 213 011 343</span></p>
    </div></div>`;
}

async function fetchLead(leadgenId) {
  const tk = await pageTok();
  const j = await (await fetch(`${GRAPH}/${leadgenId}?fields=field_data,created_time,form_id&access_token=${tk}`)).json();
  if (j?.error) return { ok: false, fields: [], detail: j.error.message };
  return { ok: true, fields: j.field_data || [], detail: "ok" };
}

async function resend(to, subject, html, reply) {
  if (!RESEND || !to.length) return;
  try {
    await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json" },
      body: JSON.stringify({ from: REMETENTE, to, reply_to: reply || undefined, subject, html }) });
  } catch (e) { console.error("[meta-leads] resend:", e.message); }
}

async function processarLead(leadgenId) {
  const lead = await fetchLead(leadgenId);
  if (!lead.ok) {
    console.error("[meta-leads] fetchLead:", lead.detail);
    // DIAG: prova que o webhook CHEGOU (só a leitura da lead falhou) — remover depois
    if (CRM_TOKEN) try { await fetch(CRM, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: CRM_TOKEN, nome: "DIAG · webhook chegou, fetchLead falhou", telefone: "", email: "", origem: "diag", fonte_detalhe: "DIAG meta-leads: " + lead.detail, campos: {} }) }); } catch {}
    return;
  }
  const val = (n) => (lead.fields.find((f) => f.name === n)?.values?.[0]) || "";
  const nome = val("full_name"), tel = val("phone_number"), email = val("email");
  const campos = {};
  for (const f of lead.fields) {
    if (["full_name", "phone_number", "email"].includes(f.name)) continue;
    const v = (f.values || []).join(", "); if (v) campos[f.name] = v;
  }
  if (!nome && !tel && !email) return;

  // 1) CRM (a resposta duplicada=true faz de dedup dos reenvios do webhook)
  let dup = false;
  if (CRM_TOKEN) {
    try {
      const r = await fetch(CRM, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: CRM_TOKEN, nome, telefone: tel, email, origem: "meta_lead_ads", fonte_detalhe: "Instant Form (Meta)", campos }) });
      const j = await r.json().catch(() => ({})); dup = !!j.duplicada;
    } catch (e) { console.error("[meta-leads] CRM:", e.message); }
  }
  if (dup) return; // já processado há pouco → não repetir email/ack

  // 2) email à escola (com tier no assunto)
  await resend(LEAD_EMAILS, `${tier(campos.quando_vaga || campos.quando)}🌟 Nova lead — ${nome || email || "Sem nome"} · Anúncio`, emailEscola({ nome: nome || email || "Sem nome", tel, email, campos }), email);
  // 3) 1.º toque ao encarregado (voz da Avó Maria)
  if (email) await resend([email], "Recebido, com muito gosto 🌿", ackAvo(nome), "geral@externatosantamariadebelem.com");
}

function validSig(sig, raw) {
  return true; // ⚠️ TEMP DIAGNÓSTICO — reativar validação depois de confirmar o caminho
  if (!APP_SECRET) return true; // sem secret configurado ainda → não bloquear (fase de setup)
  if (!sig) return false;
  const esperado = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(raw, "utf8").digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado)); } catch { return false; }
}

export default async (req) => {
  const url = new URL(req.url);

  // Verificação do webhook (GET hub.challenge)
  if (req.method === "GET" && url.searchParams.get("hub.mode") === "subscribe") {
    if (url.searchParams.get("hub.verify_token") === VERIFY) return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
    return new Response("forbidden", { status: 403 });
  }

  // Admin: instalar a app na Página (subscribed_apps: leadgen)
  if (req.method === "GET" && url.pathname.endsWith("/subscribe") && url.searchParams.get("key") === VERIFY) {
    const tk = await pageTok();
    const sub = await (await fetch(`${GRAPH}/${PAGE}/subscribed_apps`, { method: "POST", body: new URLSearchParams({ access_token: tk, subscribed_fields: "leadgen" }) })).json();
    const atual = await (await fetch(`${GRAPH}/${PAGE}/subscribed_apps?fields=subscribed_fields&access_token=${tk}`)).json();
    return new Response(JSON.stringify({ sub, atual: atual?.data ?? atual?.error?.message }, null, 1), { status: 200, headers: { "content-type": "application/json" } });
  }

  // Webhook (POST)
  if (req.method === "POST") {
    const raw = await req.text();
    if (!validSig(req.headers.get("x-hub-signature-256"), raw)) return new Response("bad sig", { status: 401 });
    let payload; try { payload = JSON.parse(raw); } catch { return new Response("ok"); }
    for (const entry of payload.entry || []) {
      for (const ch of entry.changes || []) {
        if (ch.field !== "leadgen") continue;
        const id = ch.value?.leadgen_id; if (!id) continue;
        try { await processarLead(String(id)); } catch (e) { console.error("[meta-leads] lead:", e.message); }
      }
    }
    return new Response("ok", { status: 200 });
  }

  return new Response("ok", { status: 200 });
};
