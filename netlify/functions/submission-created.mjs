/**
 * Netlify Forms → CRM (Nº 5) + email bonito para a escola.
 * Dispara em cada submissão de formulário do site (evento submission-created).
 * 1) Reenvia inscrições / pedidos de visita / captações para o CRM (token no
 *    servidor, env CRM_INGEST_TOKEN).
 * 2) Envia um email com a cara do Externato à Bruna e ao Sandro (Resend),
 *    para responderem depressa. Destinatários em env LEAD_EMAILS (separados
 *    por vírgula); envio via RESEND_API_KEY.
 */

const CRM = "https://app.numerocinco.pt/api/leads/ingest";
const REMETENTE = "Externato Santa Maria de Belém <geral@numerocinco.pt>";

function urlsDe(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.map((x) => (x && (x.url || x)) || "").filter(Boolean).join(", ");
  if (typeof v === "object") return v.url || "";
  return String(v);
}
const j = (v) => (Array.isArray(v) ? v.join(", ") : v || "");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ROTULO = {
  crianca_nome: "Nome da criança",
  crianca_nascimento: "Data de nascimento",
  programa: "Programa",
  ano_letivo: "Ano letivo",
  atl_periodo: "ATL — período",
  extracurriculares: "Extracurriculares",
  idade_crianca: "Idade da criança",
  quando_vaga: "Procura vaga para",
  interesse: "Interesse",
  periodo: "Preferência de visita",
  contacto_preferido: "Contacto preferido",
  parentesco: "Parentesco",
  observacoes: "Observações",
  mensagem: "Mensagem",
  documentos: "Documentos",
  indicado_por: "Indicado por (amigo)",
};

function emailHtml({ nome, tel, email, canal, campos }) {
  const telLimpo = (tel || "").replace(/[^\d+]/g, "");
  const wa = telLimpo ? telLimpo.replace(/^\+/, "") : "";
  const linhas = Object.entries(campos || {})
    .filter(([, v]) => v && String(v).trim() && String(v).trim() !== "não")
    .map(([k, v]) => {
      let val = esc(v);
      if (k === "documentos" && /^https?:/i.test(String(v)))
        val = String(v).split(",").map((u) => `<a href="${esc(u.trim())}" style="color:#3B6B50">ver documento</a>`).join(" · ");
      return `<tr><td style="padding:6px 0;color:#7E9C88;font-size:13px;width:170px;vertical-align:top">${esc(ROTULO[k] || k)}</td><td style="padding:6px 0;color:#26332B;font-size:15px;font-weight:700">${val}</td></tr>`;
    })
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#F6EFDE;padding:0 0 8px">
    <div style="background:#3B6B50;color:#FBF6EA;border-radius:0 0 18px 18px;padding:22px 26px">
      <p style="margin:0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#E8C36A">Nova lead · ${esc(canal)}</p>
      <h1 style="margin:6px 0 0;font-size:24px;color:#fff">${esc(nome)}</h1>
    </div>
    <div style="padding:20px 26px">
      <div style="margin-bottom:16px">
        ${telLimpo ? `<a href="tel:${esc(telLimpo)}" style="display:inline-block;background:#C27A66;color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:11px 22px;margin:0 8px 8px 0">📞 Ligar ${esc(tel)}</a>` : ""}
        ${wa ? `<a href="https://wa.me/${esc(wa)}" style="display:inline-block;background:#3B6B50;color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:11px 22px;margin:0 8px 8px 0">💬 WhatsApp</a>` : ""}
        ${email ? `<a href="mailto:${esc(email)}" style="display:inline-block;background:#C9993F;color:#26332B;text-decoration:none;font-weight:800;border-radius:999px;padding:11px 22px;margin:0 0 8px 0">✉️ Email</a>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e4dcc7">
        ${email ? `<tr><td style="padding:6px 0;color:#7E9C88;font-size:13px;width:170px">Email</td><td style="padding:6px 0;color:#26332B;font-size:15px;font-weight:700">${esc(email)}</td></tr>` : ""}
        ${linhas}
      </table>
      <p style="margin:20px 0 0;font-size:14px;color:#26332B;background:#fff;border-radius:12px;padding:12px 16px">⏱️ <b>Ligue o quanto antes</b> — responder em menos de 10 minutos é o que mais fecha matrículas.</p>
      <p style="margin:14px 0 0;font-size:12px;color:#9aa39b">Esta lead também entrou no CRM. Externato Santa Maria de Belém.</p>
    </div>
  </div>`;
}

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    return { statusCode: 200 };
  }
  const form = payload.form_name || (payload.data && payload.data["form-name"]);
  const d = payload.data || {};
  const token = process.env.CRM_INGEST_TOKEN;

  let body = null;
  let canal = "Site";
  if (form === "inscricao") {
    canal = "Inscrição online";
    body = {
      token, nome: d.nome || null, telefone: d.telefone || null, email: d.email || null,
      origem: "inscricao", fonte_detalhe: "Ficha de inscrição online",
      campos: {
        crianca_nome: d.crianca_nome || "", crianca_nascimento: d.crianca_nascimento || "",
        programa: d.programa || "", ano_letivo: d.ano_letivo || "", atl_periodo: d.atl_periodo || "",
        extracurriculares: j(d.extracurriculares), observacoes: d.observacoes || "",
        parentesco: d.parentesco || "", documentos: urlsDe(d.documentos),
        indicado_por: d.indicado_por || "",
      },
    };
  } else if (form === "pedido-visita") {
    canal = "Pedido de visita";
    body = {
      token, nome: d.nome || null, telefone: d.telefone || null, email: d.email || null,
      origem: "site_visita", fonte_detalhe: "Pedido de visita (site)",
      campos: {
        idade: d.idade || "", ano_letivo: d["ano-letivo"] || "", interesse: d.interesse || "",
        periodo: d.periodo || "", contacto_preferido: d["contacto-preferido"] || "", mensagem: d.mensagem || "",
        indicado_por: d.indicado_por || "",
      },
    };
  } else if (form === "captacao") {
    canal = "Página de captação";
    body = {
      token, nome: d.nome || null, telefone: d.telefone || null, email: d.email || null,
      origem: "captacao", fonte_detalhe: "Página de captação (link)",
      campos: { idade_crianca: d.idade_crianca || "", quando_vaga: d.quando_vaga || "", indicado_por: d.indicado_por || "" },
    };
  } else {
    // Qualquer outro formulário do site — nunca perder a lead.
    const { "bot-field": _bf, "form-name": _fn, nome, name, telefone, tel, phone, email, ...resto } = d;
    canal = form ? form.replace(/[-_]/g, " ") : "Site";
    body = {
      token, nome: nome || name || null, telefone: telefone || tel || phone || null, email: email || null,
      origem: form || "site", fonte_detalhe: `Formulário: ${form || "site"}`,
      campos: resto,
    };
  }

  // 1) Reenviar para o CRM
  if (token) {
    try {
      await fetch(CRM, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    } catch (e) {
      console.error("[submission-created] CRM:", e.message);
    }
  } else {
    console.error("[submission-created] Falta CRM_INGEST_TOKEN.");
  }

  // 2) Email com a cara da escola (Bruna + Sandro)
  const RESEND = process.env.RESEND_API_KEY;
  const para = (process.env.LEAD_EMAILS || "geral@externatosantamariadebelem.com").split(",").map((s) => s.trim()).filter(Boolean);
  if (!RESEND) {
    console.error("[submission-created] FALTA RESEND_API_KEY — email não enviado.");
  } else if (!para.length) {
    console.error("[submission-created] LEAD_EMAILS vazio — email não enviado.");
  } else {
    const nome = body.nome || body.email || "Sem nome";
    const html = emailHtml({ nome, tel: body.telefone, email: body.email, canal, campos: body.campos });
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: REMETENTE,
          to: para,
          reply_to: body.email || undefined,
          subject: `🌟 Nova lead — ${nome} · ${canal}`,
          html,
        }),
      });
      const txt = await r.text();
      if (!r.ok) {
        console.error(`[submission-created] RESEND FALHOU ${r.status}: ${txt}`);
      } else {
        console.log(`[submission-created] RESEND OK para ${para.join(", ")}: ${txt}`);
      }
    } catch (e) {
      console.error("[submission-created] email erro de rede:", e.message);
    }
  }

  return { statusCode: 200 };
};
