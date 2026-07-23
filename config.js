/* config.js — CONFIGURAÇÃO CENTRAL DO SITE (editar aqui, sem mexer no resto).
   Carregado antes do site.js. Um único sítio para: ano letivo, campanha de topo
   (Open Day) com expiração automática, e estado das vagas. */
window.SITE_CONFIG = {

  // Ano letivo em vigor — usado nos textos de vagas.
  anoLetivo: '2026/2027',

  /* Barra de topo / campanha.
     - ativo: liga/desliga a barra.
     - inicio / fim: datas 'AAAA-MM-DD'. A barra aparece entre as duas e
       DESAPARECE SOZINHA depois do fim (último dia inclusive). Não é preciso
       ninguém se lembrar de a tirar.
     - titulo / texto / cta / url: o conteúdo (texto e cta aceitam HTML simples). */
  campanha: {
    ativo: true,
    inicio: '2026-07-01',
    fim: '2026-09-12',
    titulo: '🌟 Open Day — sábado, 12 de setembro, 10h–13h.',
    texto: 'E até 31 de agosto, <b>inscrição grátis</b> (poupe 300€).',
    cta: 'Marque a sua visita →',
    url: '/marcar-visita'
  },

  /* Estado das vagas (aparece na pastilha do topo da homepage).
     Valores: 'abertas' | 'ultimas' | 'lista_espera' | 'completa' | 'contactar' */
  vagas: 'ultimas',

  /* PUBLICIDADE / MEDIÇÃO DE ANÚNCIOS — preencher quando as contas existirem.
     Tudo consent-gated (só arranca com "Aceitar todos"). Enquanto vazio, nada carrega.
     - metaPixelId: ID do Meta Pixel (só dígitos), do Gestor de Eventos da Meta.
     - googleAdsId: 'AW-XXXXXXXXXX' (Google Ads → Ferramentas → Conversões).
     - googleAdsLabel: rótulo da conversão de "lead" (o texto a seguir à barra em send_to). */
  ads: {
    metaPixelId: '1422189753074648',
    googleAdsId: '',
    googleAdsLabel: ''
  }
};
