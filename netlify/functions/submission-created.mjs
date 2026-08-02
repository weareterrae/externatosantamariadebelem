/**
 * Netlify Forms → CRM (Nº 5).
 * Dispara em cada submissão de formulário do site (evento submission-created).
 * Reenvia as inscrições e os pedidos de visita para o CRM, com o token do
 * lado do servidor (env CRM_INGEST_TOKEN). Os ficheiros carregados ficam nos
 * Netlify Forms; os seus URLs seguem também para o CRM.
 */

const CRM = "https://app.numerocinco.pt/api/leads/ingest";

function urlsDe(v) {
  if (!v) return "";
  if (Array.isArray(v)) return v.map((x) => (x && (x.url || x)) || "").filter(Boolean).join(", ");
  if (typeof v === "object") return v.url || "";
  return String(v);
}
const j = (v) => (Array.isArray(v) ? v.join(", ") : v || "");

export const handler = async (event) => {
  const token = process.env.CRM_INGEST_TOKEN;
  if (!token) {
    console.error("[submission-created] Falta CRM_INGEST_TOKEN no Netlify.");
    return { statusCode: 200 };
  }

  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch {
    return { statusCode: 200 };
  }
  const form = payload.form_name || (payload.data && payload.data["form-name"]);
  const d = payload.data || {};

  let body = null;
  if (form === "inscricao") {
    body = {
      token,
      nome: d.nome || null,
      telefone: d.telefone || null,
      email: d.email || null,
      origem: "inscricao",
      fonte_detalhe: "Ficha de inscrição online",
      campos: {
        crianca_nome: d.crianca_nome || "",
        crianca_nascimento: d.crianca_nascimento || "",
        programa: d.programa || "",
        ano_letivo: d.ano_letivo || "",
        atl_periodo: d.atl_periodo || "",
        extracurriculares: j(d.extracurriculares),
        observacoes: d.observacoes || "",
        parentesco: d.parentesco || "",
        documentos: urlsDe(d.documentos),
      },
    };
  } else if (form === "pedido-visita") {
    body = {
      token,
      nome: d.nome || null,
      telefone: d.telefone || null,
      email: d.email || null,
      origem: "site_visita",
      fonte_detalhe: "Pedido de visita (site)",
      campos: {
        idade: d.idade || "",
        ano_letivo: d["ano-letivo"] || "",
        interesse: d.interesse || "",
        periodo: d.periodo || "",
        contacto_preferido: d["contacto-preferido"] || "",
        mensagem: d.mensagem || "",
      },
    };
  } else if (form === "captacao") {
    body = {
      token,
      nome: d.nome || null,
      telefone: d.telefone || null,
      email: d.email || null,
      origem: "captacao",
      fonte_detalhe: "Página de captação (link)",
      campos: {
        idade_crianca: d.idade_crianca || "",
        quando_vaga: d.quando_vaga || "",
      },
    };
  } else {
    return { statusCode: 200 }; // outro formulário — ignora
  }

  try {
    await fetch(CRM, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[submission-created] falha ao reenviar para o CRM:", e.message);
  }
  return { statusCode: 200 };
};
