/**
 * Ficha de inscrição online → CRM (Nº 5).
 * Recebe o POST do formulário /inscricao, monta a lead e reenvia para o
 * endpoint de ingestão do CRM. O token fica só no servidor (env CRM_INGEST_TOKEN),
 * nunca no browser. Redireciona para /obrigado.html no fim.
 */

const OBRIGADO = { statusCode: 303, headers: { Location: "/obrigado.html" } };

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const p = new URLSearchParams(event.body || "");

  // Armadilha para bots.
  if ((p.get("bot-field") || "").trim() !== "") return OBRIGADO;

  const token = process.env.CRM_INGEST_TOKEN;
  if (!token) {
    console.error("[inscricao] Falta CRM_INGEST_TOKEN no Netlify.");
    return OBRIGADO; // não deixa o pai preso; alerta fica no log
  }

  const s = (k) => (p.get(k) || "").trim();
  const extracurriculares = p.getAll("extracurriculares").filter(Boolean).join(", ");

  const payload = {
    token,
    nome: s("nome") || null, // encarregado de educação
    telefone: s("telefone") || null,
    email: s("email") || null,
    origem: "inscricao",
    fonte_detalhe: "Ficha de inscrição online",
    campos: {
      crianca_nome: s("crianca_nome"),
      crianca_nascimento: s("crianca_nascimento"),
      programa: s("programa"),
      ano_letivo: s("ano_letivo"),
      atl_periodo: s("atl_periodo"),
      extracurriculares,
      observacoes: s("observacoes"),
      parentesco: s("parentesco"),
      comunicacoes: p.get("consent-comunicacoes") ? "sim" : "não",
    },
  };

  try {
    await fetch("https://app.numerocinco.pt/api/leads/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[inscricao] falha ao reenviar para o CRM:", e.message);
  }

  return OBRIGADO;
};
