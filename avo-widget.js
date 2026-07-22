/* Widget da Avó Maria — anfitriã do site, partilhado por TODAS as páginas.
   Injeta o lançador (com balão-convite e pulsação), a janela de conversa,
   e liga-se à IA (/api/avo-maria, Gemini) com fallback local por palavras-chave.
   Qualquer elemento com [data-avo] abre a conversa; [data-avo-q="…"] abre e
   já faz a pergunta. O CSS vive em estilos.css (.avo-botao, .avo-chat, .avo-peek…). */
(function () {
  if (window.__avoPronta) return;            // não duplicar
  window.__avoPronta = true;

  var RESPOSTAS = [
    { chaves: ['adapta', 'primeiros dias', 'começar', 'comecar'], texto: 'A adaptação faz-se devagar e à medida de cada criança: dias mais curtos no início e a presença dos pais combinada com a educadora. Com 16 por sala, há tempo para conhecer cada um.' },
    { chaves: ['fralda', 'desfralde', 'penico'], texto: 'Pode entrar de fralda, claro. O desfralde faz-se cá, em parceria com a família, sem pressas nem dramas.' },
    { chaves: ['saída', 'saida', 'passeio', 'rua', 'museu', 'visita de estudo'], texto: 'Saímos sim — o bairro de Belém é a nossa segunda sala! Sempre com autorização escrita dos pais e acompanhamento reforçado.' },
    { chaves: ['doen', 'febre', 'medicamento', 'doente'], texto: 'Se adoecer durante o dia, ligamos logo aos pais. Todas as crianças têm seguro escolar. Com febre, fica-se em casa a melhorar.' },
    { chaves: ['tpc', 'trabalho', 'estudo'], texto: 'Trabalhos de casa? Poucos. A sala de estudo é diária e é lá que o grosso se resolve. Em casa, o tempo é para a família.' },
    { chaves: ['inglês', 'ingles', 'língua', 'lingua'], texto: 'Inglês desde os 3 anos, incluído na mensalidade, e português bem falado. Para os mais aventureiros, há extracurriculares como jiu-jitsu e dança criativa.' },
    { chaves: ['preço', 'preco', 'mensalidade', 'custa', 'valor', 'desconto'], texto: 'A mensalidade é 390€ no pré-escolar e 425€ no 1.º ciclo (12 meses), com descontos de 5% para irmãos ou pagamento anual. Faça as contas certas no simulador, na página Preçário — sem surpresas.' },
    { chaves: ['atl', 'férias', 'ferias', 'verão', 'verao', 'natal', 'páscoa', 'pascoa', 'praia'], texto: 'O ATL funciona na Páscoa, no verão e no Natal: 150€/semana, com almoço e seguro incluídos. Em julho há o Programa Praia (2 semanas, 400€). E é aberto a crianças de outras escolas!' },
    { chaves: ['horário', 'horario', 'horas', 'abre', 'fecha', 'prolongamento'], texto: 'Abrimos às 8h e fechamos às 19h00, de segunda a sexta, todo o ano. A mensalidade cobre até às 17h30; depois há prolongamento.' },
    { chaves: ['visita', 'marcar', 'conhecer', 'inscri'], texto: 'Venha visitar-nos num dia normal de escola — e traga o seu filho, que a visita também é dele. Pode marcar já na página "Marcar visita".' },
    { chaves: ['idade', 'anos', 'entrar', 'aceita', 'sala', 'exploradores', 'aventureiros', 'descobridores'], texto: 'Recebemos crianças dos 3 aos 10 anos. No Jardim de Infância há a sala dos Exploradores (3 anos), a dos Aventureiros (4) e a dos Descobridores (5); depois segue-se o 1.º Ciclo, até ao 4.º ano — tudo na mesma casa.' },
    { chaves: ['contacto', 'telefone', 'email', 'morada', 'onde'], texto: 'Estamos na Rua Duarte Pacheco Pereira, n.º 24, no Restelo. Telefone: 213 011 343. E-mail: geral@externatosantamariadebelem.com.' }
  ];
  var SUGESTOES = ['Quanto custa?', 'Como é a adaptação?', 'Que horário têm?', 'Como funciona o ATL?', 'Quero marcar uma visita'];
  var AVO_IA_ENDPOINT = '/api/avo-maria';
  var AVO = '/assets/ilustracoes/web/ilu-avo.jpg?v=b';

  function init() {
    // Injetar markup
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<button class="avo-botao" id="avo-botao" aria-label="Fale com a Avó Maria" title="Fale com a Avó Maria">' +
        '<img src="' + AVO + '" alt="">' +
      '</button>' +
      '<div class="avo-peek" id="avo-peek" role="button" tabindex="0" aria-label="Abrir conversa com a Avó Maria">' +
        '<button class="avo-peek-x" id="avo-peek-x" aria-label="Dispensar">×</button>' +
        '<strong>Olá! Sou a Avó Maria.</strong><br>Pergunte-me o que quiser — respondo já. 👋' +
      '</div>' +
      '<div class="avo-chat" id="avo-chat" role="dialog" aria-label="Conversa com a Avó Maria">' +
        '<div class="avo-chat-topo">' +
          '<img src="' + AVO + '" alt="">' +
          '<div><div class="titulo">Avó Maria</div><div class="sub">respostas rápidas da casa</div></div>' +
          '<button id="avo-fechar" aria-label="Fechar conversa">×</button>' +
        '</div>' +
        '<div class="avo-msgs" id="avo-msgs"></div>' +
        '<div class="avo-chips" id="avo-chips"></div>' +
        '<div class="avo-entrada">' +
          '<input id="avo-input" type="text" placeholder="Escreva a sua pergunta…" aria-label="A sua pergunta">' +
          '<button id="avo-enviar">Enviar</button>' +
        '</div>' +
        '<div class="avo-aviso">Assistente simples do site — não guarda dados. Para falar com pessoas: formulário ou 213 011 343.</div>' +
      '</div>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

    var botao = document.getElementById('avo-botao');
    var peek = document.getElementById('avo-peek');
    var chat = document.getElementById('avo-chat');
    var msgs = document.getElementById('avo-msgs');
    var historico = [];

    function fala(texto, minha) {
      var el = document.createElement('div');
      el.className = 'avo-msg ' + (minha ? 'minha' : 'dela');
      el.textContent = texto;
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    function achaLocal(pergunta) {
      var p = pergunta.toLowerCase();
      for (var i = 0; i < RESPOSTAS.length; i++)
        for (var j = 0; j < RESPOSTAS[i].chaves.length; j++)
          if (p.indexOf(RESPOSTAS[i].chaves[j]) !== -1) return RESPOSTAS[i].texto;
      return 'Essa até a mim me escapa! Deixe os seus dados no formulário de pedido de informações, ou ligue 213 011 343 — respondemos no próprio dia útil.';
    }
    function responde(pergunta) {
      fala(pergunta, true);
      historico.push({ role: 'user', content: pergunta });
      var typing = fala('A Avó Maria está a escrever…', false);
      typing.style.opacity = '0.6';
      typing.style.fontStyle = 'italic';
      fetch(AVO_IA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historico.slice(-8) })
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) {
          typing.remove();
          var t = (d && d.reply) ? d.reply : achaLocal(pergunta);
          fala(t, false);
          historico.push({ role: 'assistant', content: t });
        })
        .catch(function () {
          typing.remove();
          var t = achaLocal(pergunta);
          fala(t, false);
          historico.push({ role: 'assistant', content: t });
        });
    }
    function esconderPeek(lembrar) {
      if (peek) peek.classList.remove('mostra');
      botao.classList.add('avo-quieto');
      if (lembrar) { try { sessionStorage.setItem('avoPeek', '1'); } catch (e) {} }
    }
    function abrir(pergunta) {
      esconderPeek(true);
      chat.classList.add('aberto');
      botao.classList.add('avo-quieto');
      if (!msgs.hasChildNodes())
        fala('Olá! Sou a Avó Maria — ando por esta casa desde que ela é casa. Em que posso ajudar?', false);
      if (pergunta) setTimeout(function () { responde(pergunta); }, 250);
      setTimeout(function () { var i = document.getElementById('avo-input'); if (i) i.focus(); }, 320);
    }
    function fechar() { chat.classList.remove('aberto'); }

    // expor API global (para CTAs de qualquer página)
    window.abrirAvoMaria = abrir;

    botao.addEventListener('click', function () {
      if (chat.classList.contains('aberto')) fechar(); else abrir();
    });
    document.getElementById('avo-fechar').addEventListener('click', fechar);

    // balão-convite (peek) — uma vez por sessão, ~2,6s após carregar
    if (peek) {
      peek.addEventListener('click', function (e) { if (e.target.id !== 'avo-peek-x') abrir(); });
      document.getElementById('avo-peek-x').addEventListener('click', function (e) { e.stopPropagation(); esconderPeek(true); });
      var jaViu = false;
      try { jaViu = !!sessionStorage.getItem('avoPeek'); } catch (e) {}
      if (!jaViu) setTimeout(function () {
        if (!chat.classList.contains('aberto')) peek.classList.add('mostra');
      }, 2600);
    }

    // chips de sugestão
    var chips = document.getElementById('avo-chips');
    SUGESTOES.forEach(function (s) {
      var b = document.createElement('button');
      b.textContent = s;
      b.addEventListener('click', function () { responde(s); });
      chips.appendChild(b);
    });

    // entrada de texto
    var input = document.getElementById('avo-input');
    function enviar() { var v = input.value.trim(); if (!v) return; input.value = ''; responde(v); }
    document.getElementById('avo-enviar').addEventListener('click', enviar);
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') enviar(); });

    // gatilhos globais: [data-avo] abre; [data-avo-q="…"] abre e pergunta
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-avo],[data-avo-q]') : null;
      if (!t) return;
      e.preventDefault();
      abrir(t.getAttribute('data-avo-q') || null);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
