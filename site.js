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
      else if (href.indexOf('wa.me') !== -1) window.track('whatsapp');
      else if (href.indexOf('marcar-visita') !== -1) window.track('cta_visita');
    });
    // submissão de formulários de pedido → lead
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (f && (f.getAttribute('name') === 'pedido-visita' || f.id === 'form-info'))
        window.track('lead', { form: f.getAttribute('name') || f.id });
    }, true);
  }

  function init() {
    iniciarMedicao();
    if (!consentimento()) mostrarBanner();
    barraMovel();
    ligarEventos();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
