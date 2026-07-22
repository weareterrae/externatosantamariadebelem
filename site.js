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
  // Consent Mode v2 — só concedemos a medição (analytics). Os sinais de anúncios
  // ficam sempre negados (o banner só pede "cookies de medição").
  function atualizarConsent(concede) {
    gtag('consent', 'update', { analytics_storage: concede ? 'granted' : 'denied' });
    if (concede) carregarPixel();
  }

  /* Meta Pixel — DORMENTE. Para ativar: pôr o ID (só dígitos) em META_PIXEL_ID.
     Só carrega com "Aceitar todos". Precisa de facebook no CSP (já preparado). */
  var META_PIXEL_ID = '';
  var pixelCarregado = false;
  function carregarPixel() {
    if (pixelCarregado || !META_PIXEL_ID) return;
    pixelCarregado = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  // A etiqueta arranca SEMPRE (fica detetável), mas por defeito nada é guardado
  // nem ninguém é identificado. A medição completa só entra com "Aceitar todos".
  function iniciarMedicao() {
    if (!GA_ID) return;
    gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'denied'
    });
    if (consentimento() === 'all') atualizarConsent(true);
    carregarGtag();
  }

  // Evento de conversão — seguro mesmo sem GA ligado (fica no dataLayer).
  window.track = function (evento, params) {
    try { gtag('event', evento, params || {}); } catch (e) {}
  };

  /* ============================================================
     (1) CONSENTIMENTO DE COOKIES
     ============================================================ */
  function consentimento() { try { return localStorage.getItem('cookieConsent'); } catch (e) { return null; } }
  function guardarConsent(v) { try { localStorage.setItem('cookieConsent', v); } catch (e) {} }

  function aplicarConsent(v) { atualizarConsent(v === 'all'); }

  function mostrarBanner() {
    if (document.getElementById('cookie-banner')) return;
    var b = document.createElement('div');
    b.className = 'cookie-banner';
    b.id = 'cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Aviso de cookies');
    b.innerHTML =
      '<p>Usamos cookies essenciais para o site funcionar e, com a sua autorização, cookies de medição para o melhorarmos. ' +
      '<a href="/cookies.html">Saber mais</a>.</p>' +
      '<div class="cookie-acoes">' +
        '<button type="button" class="btn ghost" data-cookie="essential">Só essenciais</button>' +
        '<button type="button" class="btn" data-cookie="all">Aceitar todos</button>' +
      '</div>';
    document.body.appendChild(b);
    requestAnimationFrame(function () { b.classList.add('mostra'); });
    b.addEventListener('click', function (e) {
      var alvo = e.target.closest('[data-cookie]');
      if (!alvo) return;
      var escolha = alvo.getAttribute('data-cookie');
      guardarConsent(escolha);
      aplicarConsent(escolha);
      b.classList.remove('mostra');
      setTimeout(function () { b.remove(); }, 300);
    });
  }

  // Permitir reabrir as preferências (link "Gerir cookies" nas páginas legais)
  window.gerirCookies = function () { try { localStorage.removeItem('cookieConsent'); } catch (e) {} mostrarBanner(); };

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
      if (href.indexOf('tel:') === 0) window.track('telefone');
      else if (href.indexOf('wa.me') !== -1 || href.indexOf('whatsapp') !== -1) window.track('whatsapp');
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
      if (f && (f.getAttribute('name') === 'pedido-visita' || f.id === 'form-info' || f.id === 'form-visita'))
        window.track('lead', { form: f.getAttribute('name') || f.id });
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

  function init() {
    iniciarMedicao();
    if (!consentimento()) mostrarBanner();
    barraTopo();
    estadoVagas();
    barraMovel();
    ligarEventos();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
