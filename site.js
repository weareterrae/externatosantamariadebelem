/* site.js — infraestrutura partilhada por todas as páginas:
   (1) consentimento de cookies (RGPD/ePrivacy) que controla a medição;
   (2) medição GA4 dormente até o Sandro pôr o ID (uma linha só);
   (3) eventos de conversão (telefone, WhatsApp, marcar visita, lead);
   (4) barra de ações rápidas no telemóvel (Telefonar · WhatsApp · Marcar visita).
   Sem dependências. O CSS vive em estilos.css. */
(function () {
  if (window.__siteUI) return;
  window.__siteUI = true;

  /* ============================================================
     (2) MEDIÇÃO GA4 — PARA ATIVAR: cole aqui o ID (formato "G-XXXXXXXXXX").
     Enquanto estiver vazio, NÃO é carregado nada e nenhum cookie é criado.
     Com ID: usa Consent Mode v2 — a etiqueta carrega sempre (detetável), mas por
     defeito sem cookies; a medição completa só entra com "Aceitar todos".
     ============================================================ */
  var GA_ID = 'G-J89HG6QXL4';   // GA4 do Externato Santa Maria de Belém (ligado 22/07/2026)

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  var gtagCarregado = false;
  function carregarGtag() {
    if (gtagCarregado || !GA_ID) return;
    gtagCarregado = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  /* Metricool — tracker de site (mede visitas/comportamento; cria cookies próprios).
     Não tem Consent Mode, por isso só carrega DEPOIS do consentimento de "medição". */
  var metricoolCarregado = false;
  function carregarMetricool() {
    if (metricoolCarregado) return;
    metricoolCarregado = true;
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = 'https://tracker.metricool.com/resources/be.js';
    s.onload = function () { try { beTracker.t({ hash: '8bb20586e5873a5efc226603330cad80' }); } catch (e) {} };
    document.getElementsByTagName('head')[0].appendChild(s);
  }
  // Consent Mode v2 por CATEGORIA (padrão RGPD): "medicao" controla o Analytics,
  // "publicidade" controla Meta Pixel + Google Ads. Tudo negado por defeito;
  // só se concede o que a pessoa autorizar no banner.
  function atualizarConsent(c) {
    c = c || {};
    var m = c.medicao ? 'granted' : 'denied';
    var p = c.publicidade ? 'granted' : 'denied';
    gtag('consent', 'update', {
      analytics_storage: m, ad_storage: p, ad_user_data: p, ad_personalization: p
    });
    if (c.medicao) { carregarMetricool(); }
    if (c.publicidade) { carregarPixel(); carregarGoogleAds(); }
  }
  function cfgAds() { return (window.SITE_CONFIG && window.SITE_CONFIG.ads) || {}; }

  /* Meta Pixel — DORMENTE até config.ads.metaPixelId. Só carrega com "Aceitar todos". */
  var pixelCarregado = false;
  function carregarPixel() {
    var id = cfgAds().metaPixelId || '';
    if (pixelCarregado || !id) return;
    pixelCarregado = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  /* Google Ads — DORMENTE até config.ads.googleAdsId ('AW-...'). Reusa o gtag do GA4. */
  var adsCarregado = false;
  function carregarGoogleAds() {
    var awid = cfgAds().googleAdsId || '';
    if (adsCarregado || !awid) return;
    adsCarregado = true;
    if (!GA_ID) { var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(awid); document.head.appendChild(s); gtag('js', new Date()); }
    gtag('config', awid);
  }

  /* API única de medição — window.esmbTrack(evento, props):
     manda o evento ao GA4 (gtag) e ao Meta Pixel (fbq). Eventos "standard" do
     Pixel (Lead/Contact) vão como track; o resto como trackCustom. Só chega às
     ferramentas se elas tiverem sido carregadas COM consentimento — sem
     consentimento fica apenas no dataLayer (Consent Mode v2, sem cookies). */
  window.esmbTrack = function (evento, props) {
    props = props || {};
    try { gtag('event', evento, props); } catch (e) {}
    try {
      if (window.fbq) {
        var std = { lead: 'Lead', generate_lead: 'Lead', click_contact: 'Contact', contact: 'Contact' };
        if (std[evento]) window.fbq('track', std[evento], props);
        else window.fbq('trackCustom', evento, props);
      }
    } catch (e) {}
  };

  /* Conversão de lead — dispara GA4 (lead + generate_lead) + Google Ads + Meta Lead.
     props opcionais (ex.: { content_name: 'Open Day' }) distinguem a origem. */
  window.conversao = function (nome, props) {
    nome = nome || 'lead';
    props = props || {};
    try { if (nome !== 'lead') gtag('event', nome, props); else gtag('event', 'lead', props); } catch (e) {}
    window.esmbTrack('generate_lead', props);
    try { var a = cfgAds(); if (a.googleAdsId && a.googleAdsLabel) gtag('event', 'conversion', { send_to: a.googleAdsId + '/' + a.googleAdsLabel }); } catch (e) {}
  };

  /* Origem do tráfego (UTM/gclid/fbclid/referrer) — guardar e injetar nos formulários. */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
  function capturarOrigem() {
    var dados = {};
    try { dados = JSON.parse(sessionStorage.getItem('origem') || '{}'); } catch (e) { dados = {}; }
    try {
      var q = new URLSearchParams(location.search), mudou = false;
      UTM_KEYS.forEach(function (k) { var v = q.get(k); if (v) { dados[k] = v.slice(0, 120); mudou = true; } });
      if (!dados.referrer && document.referrer && document.referrer.indexOf(location.host) === -1) { dados.referrer = document.referrer.slice(0, 200); mudou = true; }
      if (mudou) sessionStorage.setItem('origem', JSON.stringify(dados));
    } catch (e) {}
    return dados;
  }
  function preencherOrigem() {
    var dados = capturarOrigem();
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      for (var k in dados) {
        var inp = forms[i].querySelector('input[name="' + k + '"]');
        if (inp) inp.value = dados[k];
      }
    }
  }
  // A etiqueta arranca SEMPRE (fica detetável), mas por defeito nada é guardado
  // nem ninguém é identificado. A medição completa só entra com "Aceitar todos".
  function iniciarMedicao() {
    if (!GA_ID) return;
    gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'denied'
    });
    var c = consentimento();
    if (c) atualizarConsent(c);
    carregarGtag();
  }

  // Evento de conversão — seguro mesmo sem GA ligado (fica no dataLayer).
  window.track = function (evento, params) {
    try { gtag('event', evento, params || {}); } catch (e) {}
  };

  /* ============================================================
     (1) CONSENTIMENTO DE COOKIES
     ============================================================ */
  // Consentimento guardado como { medicao: bool, publicidade: bool } em
  // 'cookieConsent2'. Migra o formato antigo ('all'/'essential') sem voltar
  // a incomodar quem já tinha escolhido.
  function consentimento() {
    try {
      var v2 = localStorage.getItem('cookieConsent2');
      if (v2) return JSON.parse(v2);
      var v1 = localStorage.getItem('cookieConsent');
      if (v1 === 'all') return { medicao: true, publicidade: true };
      if (v1 === 'essential') return { medicao: false, publicidade: false };
    } catch (e) {}
    return null;
  }
  function guardarConsent(c) {
    try { localStorage.setItem('cookieConsent2', JSON.stringify(c)); localStorage.removeItem('cookieConsent'); } catch (e) {}
  }

  function aplicarConsent(c) {
    // retirar um consentimento depois de o script já ter carregado exige recarregar
    if ((pixelCarregado && !c.publicidade) || (adsCarregado && !c.publicidade)) { location.reload(); return; }
    atualizarConsent(c);
  }

  function mostrarBanner(abrirPrefs) {
    var b = document.getElementById('cookie-banner');
    if (!b) {
      b = document.createElement('div');
      b.className = 'cookie-banner';
      b.id = 'cookie-banner';
      b.setAttribute('role', 'dialog');
      b.setAttribute('aria-label', 'Aviso de cookies');
      b.innerHTML =
        '<p>Cá em casa pedimos licença antes de entrar: usamos cookies essenciais para o site funcionar e, só com a sua autorização, cookies de <b>medição</b> (para percebermos o que ajuda os pais) e de <b>publicidade</b> (para as nossas campanhas). ' +
        '<a href="/cookies.html">Saber mais</a>.</p>' +
        '<div class="cookie-prefs" id="cookie-prefs" hidden>' +
          '<label><input type="checkbox" checked disabled> <b>Essenciais</b> — o site a funcionar e a sua escolha guardada (sempre ativos)</label>' +
          '<label><input type="checkbox" id="ck-medicao"> <b>Medição</b> — Google Analytics, de forma agregada</label>' +
          '<label><input type="checkbox" id="ck-publicidade"> <b>Publicidade</b> — Meta Pixel e Google Ads, para medir as campanhas</label>' +
        '</div>' +
        '<div class="cookie-acoes">' +
          '<button type="button" class="btn ghost" data-cookie="essential">Só essenciais</button>' +
          '<button type="button" class="btn ghost" data-cookie="prefs">Escolher</button>' +
          '<button type="button" class="btn" data-cookie="all">Aceitar todos</button>' +
          '<button type="button" class="btn" data-cookie="save" hidden>Guardar a minha escolha</button>' +
        '</div>';
      document.body.appendChild(b);
      b.addEventListener('click', function (e) {
        var alvo = e.target.closest('[data-cookie]');
        if (!alvo) return;
        var acao = alvo.getAttribute('data-cookie');
        if (acao === 'prefs') { abrirPreferencias(b); return; }
        var escolha;
        if (acao === 'all') escolha = { medicao: true, publicidade: true };
        else if (acao === 'essential') escolha = { medicao: false, publicidade: false };
        else escolha = { medicao: !!document.getElementById('ck-medicao').checked, publicidade: !!document.getElementById('ck-publicidade').checked };
        guardarConsent(escolha);
        b.classList.remove('mostra');
        setTimeout(function () { b.remove(); }, 300);
        aplicarConsent(escolha);
      });
    }
    requestAnimationFrame(function () { b.classList.add('mostra'); });
    if (abrirPrefs) abrirPreferencias(b);
  }
  function abrirPreferencias(b) {
    var atual = consentimento() || { medicao: false, publicidade: false };
    var prefs = b.querySelector('#cookie-prefs');
    b.querySelector('#ck-medicao').checked = !!atual.medicao;
    b.querySelector('#ck-publicidade').checked = !!atual.publicidade;
    prefs.hidden = false;
    b.querySelector('[data-cookie="prefs"]').hidden = true;
    b.querySelector('[data-cookie="save"]').hidden = false;
  }

  // Permitir reabrir as preferências (link "Gerir cookies" nas páginas legais)
  window.gerirCookies = function () { mostrarBanner(true); };

  /* ============================================================
     (4) BARRA DE AÇÕES RÁPIDAS (telemóvel)
     ============================================================ */
  function barraMovel() {
    if (document.querySelector('.barra-movel')) return;
    var tel = '<a href="tel:+351213011343" data-ev="telefone" aria-label="Telefonar">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.5.56 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.3a1 1 0 0 1 1 1 11 11 0 0 0 .56 3.5 1 1 0 0 1-.25 1z"/></svg>' +
      '<span>Telefonar</span></a>';
    var wa = '<a href="https://wa.me/351939317966" target="_blank" rel="noopener" data-ev="whatsapp" aria-label="WhatsApp">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z"/><path d="M8.5 8.4c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2 0 .4-.1.5l-.5.6c-.1.1-.2.3-.1.5.3.6 1.3 1.7 2.3 2.1.2.1.4.1.5-.1l.5-.6c.2-.2.3-.2.5-.1l1.5.7c.2.1.4.2.4.4v.5c0 .5-.5 1.1-1 1.2-.5.1-1.6.2-3.3-.7-1.9-1-3.2-2.9-3.3-3.1-.1-.2-.8-1.1-.8-2 0-1 .5-1.4.7-1.6z" fill="#fff" stroke="none"/></svg>' +
      '<span>WhatsApp</span></a>';
    var vis = '<a href="/marcar-visita" data-ev="cta_visita" class="destaque" aria-label="Marcar visita">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/></svg>' +
      '<span>Marcar visita</span></a>';
    var nav = document.createElement('nav');
    nav.className = 'barra-movel';
    nav.setAttribute('aria-label', 'Ações rápidas');
    nav.innerHTML = tel + wa + vis;
    document.body.appendChild(nav);
    document.body.classList.add('tem-barra-movel');
  }

  /* ============================================================
     (3) EVENTOS DE CONVERSÃO — delegação global
     ============================================================ */
  function ligarEventos() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var ev = a.getAttribute('data-ev');
      if (ev) { window.track(ev); return; }
      if (href.indexOf('tel:') === 0) { window.track('telefone'); window.esmbTrack('click_contact', { method: 'telefone' }); }
      else if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) { window.track('whatsapp'); window.esmbTrack('click_contact', { method: 'whatsapp' }); }
      else if (href.indexOf('mailto:') === 0) window.track('email');
      else if (href.indexOf('maps.google') !== -1 || href.indexOf('google.com/maps') !== -1) window.track('mapa');
      else if (href.indexOf('marcar-visita') !== -1) window.track('cta_visita');
    });
    // formulários: início (1.º foco) e submissão → lead
    var iniciado = {};
    document.addEventListener('focusin', function (e) {
      var f = e.target && e.target.form;
      if (!f) return;
      var id = f.getAttribute('name') || f.id || 'form';
      if (iniciado[id]) return; iniciado[id] = 1;
      window.track('form_start', { form: id });
    });
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (f && (f.getAttribute('name') === 'pedido-visita' || f.getAttribute('name') === 'open-day' || f.id === 'form-info' || f.id === 'form-visita' || f.id === 'form-open-day'))
        window.track('form_submit', { form: f.getAttribute('name') || f.id });
      // A conversão "lead" (fiável) dispara na página /obrigado.html ao carregar.
    }, true);
    // simulador e seleção de interesse
    document.addEventListener('change', function (e) {
      var t = e.target; if (!t) return;
      if (t.id && t.id.indexOf('sim-') === 0) window.track('simulador', { campo: t.id });
      if (t.id === 'f-interesse' || t.name === 'interesse') {
        var v = (t.value || '').toLowerCase();
        if (v.indexOf('jardim') !== -1 || v.indexOf('escolar') !== -1) window.track('sel_pre_escolar');
        else if (v.indexOf('ciclo') !== -1) window.track('sel_1ciclo');
        else if (v.indexOf('atl') !== -1) window.track('sel_atl');
      }
    });
  }

  /* ============================================================
     BARRA DE TOPO (campanha) — texto vindo de config.js, expira sozinha
     ============================================================ */
  function dataDe(s) { var p = (s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function barraTopo() {
    var bar = document.getElementById('barra-topo');
    if (!bar) return;
    var c = (window.SITE_CONFIG && window.SITE_CONFIG.campanha) || null;
    var mostrar = !!(c && c.ativo);
    if (mostrar) {
      var hoje = new Date();
      var ini = dataDe(c.inicio), fim = dataDe(c.fim);
      if (ini && hoje < ini) mostrar = false;
      if (fim) { var limite = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59); if (hoje > limite) mostrar = false; }
    }
    if (!mostrar) { bar.parentNode && bar.parentNode.removeChild(bar); return; }
    // texto a partir da config (fonte única)
    if (c.url) bar.setAttribute('href', c.url);
    bar.setAttribute('data-ev', 'openday');
    bar.innerHTML = '<b>' + c.titulo + '</b>' + (c.texto ? ' &nbsp;' + c.texto : '') +
                    (c.cta ? ' <span class="mais">' + c.cta + '</span>' : '');
  }
  function estadoVagas() {
    var pill = document.querySelector('.vagas-pill');
    if (!pill || !window.SITE_CONFIG) return;
    var ano = window.SITE_CONFIG.anoLetivo || '';
    var map = {
      abertas: 'Inscrições abertas para ' + ano + ' — turmas de 16',
      ultimas: 'Últimas vagas para ' + ano + ' — turmas de 16, por escolha',
      lista_espera: 'Algumas turmas em lista de espera — fale connosco',
      completa: 'Turmas completas — contacte-nos para disponibilidade',
      contactar: 'Contacte-nos para saber a disponibilidade de vagas'
    };
    var txt = map[window.SITE_CONFIG.vagas || 'ultimas'];
    if (!txt) return;
    var ponto = pill.querySelector('.ponto');
    pill.textContent = ' ' + txt;
    if (ponto) pill.insertBefore(ponto, pill.firstChild);
  }

  /* ============================================================
     COLAGEM QUE SE MONTA — cartões entram como peças de papel.
     Só para páginas SEM observer próprio (o index já trata dos seus
     .reveal); sem JS ou com prefers-reduced-motion, fica tudo visível.
     ============================================================ */
  function colagem() {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!('IntersectionObserver' in window)) return;
      var els = [];
      var lista = document.querySelectorAll('.sala-card, .od-card');
      for (var i = 0; i < lista.length; i++) {
        if (!lista[i].classList.contains('reveal')) els.push(lista[i]);
      }
      if (!els.length) return;
      els.forEach(function (el, i) { el.classList.add('reveal'); el.style.transitionDelay = (i % 4) * 90 + 'ms'; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      els.forEach(function (el) { io.observe(el); });
    } catch (e) {}
  }

  function init() {
    iniciarMedicao();
    if (!consentimento()) mostrarBanner();
    barraTopo();
    estadoVagas();
    barraMovel();
    ligarEventos();
    preencherOrigem();
    colagem();
    if (window.CONVERSAO_AO_CARREGAR) window.conversao(window.CONVERSAO_AO_CARREGAR, window.CONVERSAO_PROPS || {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
