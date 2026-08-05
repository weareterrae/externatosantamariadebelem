/**
 * Endpoint HTTP para leads de anúncio (Instant Form), chamado pelo Make.
 * O Make lê a lead na Meta (tem a permissão leads_retrieval) e faz POST aqui
 * com os campos. Este endpoint mete no CRM (Nº 5) E envia o email da marca.
 * Protegido por 'key' = CRM_INGEST_TOKEN (já existe no ambiente do site).
 *
 * POST /.netlify/functions/lead-hook
 *   { key, nome, telefone, email, idade, quando, ...outros }
 */
const CRM = "https://app.numerocinco.pt/api/leads/ingest";
const REMETENTE = "Externato Santa Maria de Belém <geral@numerocinco.pt>";
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ROTULO = { idade: "Idade da criança", quando: "Procura vaga para", idade_crianca: "Idade da criança", quando_vaga: "Procura vaga para" };

function emailHtml({ nome, tel, email, campos }) {
  const telLimpo = (tel || "").replace(/[^\d+]/g, "");
  const wa = telLimpo ? telLimpo.replace(/^\+/, "") : "";
  const linhas = Object.entries(campos || {})
    .filter(([, v]) => v && String(v).trim())
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#7E9C88;font-size:13px;width:190px;vertical-align:top">${esc(ROTULO[k] || k)}</td><td style="padding:6px 0;color:#26332B;font-size:15px;font-weight:700">${esc(v)}</td></tr>`)
    .join("");
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

export default async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  let d;
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) d = await req.json();
    else { const t = await req.text(); try { d = JSON.parse(t); } catch { d = Object.fromEntries(new URLSearchParams(t)); } }
  } catch { return new Response("bad body", { status: 400 }); }

  const token = process.env.CRM_INGEST_TOKEN;
  const g = (k) => (d[k] != null ? String(d[k]).trim() : "");
  if (!token || g("key") !== token) return new Response("unauthorized", { status: 401 });

  const nome = g("nome") || g("full_name") || g("name");
  const tel = g("telefone") || g("phone") || g("phone_number");
  const email = g("email");
  if (!nome && !tel && !email) return new Response("sem dados", { status: 200 });

  const campos = {};
  for (const [k, v] of Object.entries(d)) {
    if (["key", "nome", "full_name", "name", "telefone", "phone", "phone_number", "email"].includes(k)) continue;
    if (v != null && String(v).trim()) campos[k] = String(v).trim();
  }

  // Prioridade (tier) a partir da resposta de prazo — vai no ASSUNTO do email à escola.
  const quando = g("quando");
  const TIER = /setemb|imediat|urgent|j[áa]\b/i.test(quando) ? "🔴 LIGAR HOJE · "
    : /ao longo|durante|pr[óo]ximo|qualquer/i.test(quando) ? "🟡 "
    : /informar|s[óo] a|curios/i.test(quando) ? "⚪ " : "";

  // 1) CRM
  try {
    await fetch(CRM, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, nome, telefone: tel, email, origem: "meta_lead_ads", fonte_detalhe: "Instant Form (intenção)", campos }) });
  } catch (e) { console.error("[lead-hook] CRM:", e.message); }

  // 2) email da marca
  const RESEND = process.env.RESEND_API_KEY;
  const para = (process.env.LEAD_EMAILS || "geral@externatosantamariadebelem.com").split(",").map((s) => s.trim()).filter(Boolean);
  if (RESEND && para.length) {
    try {
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json" }, body: JSON.stringify({ from: REMETENTE, to: para, reply_to: email || undefined, subject: `${TIER}🌟 Nova lead — ${nome || email || "Sem nome"} · Anúncio`, html: emailHtml({ nome: nome || email || "Sem nome", tel, email, campos }) }) });
      if (!r.ok) console.error("[lead-hook] resend", r.status, await r.text());
    } catch (e) { console.error("[lead-hook] email:", e.message); }
  }

  // 3) 1.º toque automático ao encarregado — voz da Avó Maria (segura a lead até à chamada)
  if (RESEND && email) {
    const primeiro = (nome || "").trim().split(/\s+/)[0] || "";
    const ackHtml = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#F6EFDE">
      <div style="background:#3B6B50;color:#fff;border-radius:0 0 16px 16px;padding:22px 26px">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#E8C36A;font-weight:700">Externato Santa Maria de Belém</div>
        <h1 style="margin:6px 0 0;font-size:23px;color:#fff">Olá${primeiro ? " " + esc(primeiro) : ""}! 🌿</h1></div>
      <div style="padding:20px 26px;color:#26332B;font-size:15px;line-height:1.65">
        <p style="margin:0">Recebemos o seu pedido, com muito gosto. A escola liga-lhe ainda no próximo dia útil — palavra da Avó Maria.</p>
        <p style="margin:14px 0 0">E guarde já a data: <b>Open Day, sábado 12 de setembro, 10h–13h</b>. Venha conhecer a nossa casa em Belém — e traga o seu filho, que a visita também é dele.</p>
        <p style="margin:16px 0 0">Com carinho,<br><b>A Avó Maria</b><br><span style="color:#7E9C88;font-size:13px">Externato Santa Maria de Belém · Restelo, Lisboa · 213 011 343</span></p>
      </div></div>`;
    try {
      await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json" }, body: JSON.stringify({ from: REMETENTE, to: [email], reply_to: "geral@externatosantamariadebelem.com", subject: "Recebido, com muito gosto 🌿", html: ackHtml }) });
    } catch (e) { console.error("[lead-hook] ack:", e.message); }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
};
