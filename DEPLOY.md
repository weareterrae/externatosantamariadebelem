# Deploy do site novo — GitHub → Netlify

Guia passo a passo (padrão igual ao imoveis.terrae.pt).

## 1. Repositório GitHub
1. Criar repositório novo (ex.: `externato-smb-site`), privado.
2. Enviar para lá **o conteúdo desta pasta `site-novo/`** (index.html, en.html, obrigado.html, assets/). Os `externato-prototipo-v*.html` NÃO precisam de ir — são só maquetes de partilha.
3. Nota Windows: se comprimir para zip antes de enviar, cuidado com acentos nos nomes de ficheiros (o zip do Windows estraga-os) — aqui não há nenhum, está tudo em ASCII de propósito.

## 2. Netlify
1. Netlify → "Add new site" → "Import an existing project" → escolher o repositório GitHub.
2. Build command: (vazio) · Publish directory: `/` (raiz). É um site estático puro, sem build.
3. Deploy. Fica logo com URL tipo `https://qualquercoisa.netlify.app` — é este que se mostra à Bruna.

## 3. Netlify Forms (o formulário já está preparado)
1. O form `pedido-informacoes` tem `data-netlify="true"` + honeypot — o Netlify deteta-o automaticamente no primeiro deploy.
2. Netlify → Site → Forms → confirmar que aparece "pedido-informacoes".
3. Forms → Settings → Form notifications → adicionar e-mail: `geral@externatosantamariadebelem.com` (e o do Sandro para acompanhar).
4. Em produção o form submete nativamente e mostra a página `/obrigado.html`. Em local/ficheiro continua a funcionar por mailto (fallback automático).

## 4. Domínio (quando aprovado)
1. O domínio `externatosantamariadebelem.com` está hoje apontado ao WordPress antigo.
2. No dia da troca: Netlify → Domain settings → Add custom domain → seguir instruções DNS (mudar A/CNAME no registrar atual).
3. **No mesmo dia**: tirar do ar o WordPress antigo (ou redirecionar tudo), incluindo o PDF do preçário antigo (350€) — não podem coexistir os dois preços.

## 5. Checklist antes de apontar o domínio
- [ ] Texto da Bruna validado por ela (secção "Quem recebe o seu filho")
- [ ] Testemunhos REAIS no lugar dos 5 exemplos (secção "A prova dos pais")
- [ ] Respostas do FAQ validadas pela direção
- [ ] Número real de vagas na pílula do hero
- [ ] Entradas reais no "Caderno das descobertas"
- [ ] Preçário confirmado (425€ + tabela) e carta às famílias atuais ENVIADA antes
- [ ] Google Business Profile atualizado com link novo
- [ ] Instagram/Facebook com link novo na bio
