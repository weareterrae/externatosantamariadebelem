# Avó Maria com IA real — guia de ativação (Netlify Functions)

A Avó Maria com IA corre numa **Netlify Function**, no mesmo projeto onde o site já está —
sem contas novas, sem servidores. A função (`netlify/functions/avo-maria.mts`) faz deploy
automático em cada push, no endpoint `/api/avo-maria` do próprio domínio.

O chat do site já aponta para lá. Se a função falhar (ou a chave não estiver configurada),
o chat **cai automaticamente para as respostas locais** por palavras-chave — nunca fica mudo.

## Ativar (1 passo, ~2 minutos)

1. **Colar a chave da Anthropic no Netlify** (criar a chave em console.anthropic.com → API Keys):
   - app.netlify.com → projeto **externatosantamariadebelem** → **Site configuration →
     Environment variables → Add a variable**
   - Key: `ANTHROPIC_API_KEY` · Value: `sk-ant-...`
   - Depois: **Deploys → Trigger deploy → Deploy site** (para a função apanhar a variável).

2. **Testar no site publicado**: abrir o chat e fazer perguntas de preço/horário e uma fora do
   guião (ex.: "o meu filho é alérgico a glúten, como fazem?") — deve acolher e encaminhar
   para a Direção. Se responder com frases "de guião" idênticas às de antes, está em fallback:
   verificar a variável e o deploy em **Logs → Functions → avo-maria**.

## O que a função faz
- Modelo `claude-opus-4-8` com a personalidade da Avó Maria e os factos completos da escola
  (preços, salas, ATL, políticas) no bloco `SYSTEM` de `netlify/functions/avo-maria.mts`.
- Regras de segurança: não inventa preços/datas/vagas; casos sensíveis (saúde, NEE, reclamações)
  → encaminha para a Direção; não comenta outras escolas; resiste a desvios de papel.
- Controlo de custo/abuso: histórico cortado aos últimos 8 turnos e 1.000 caracteres por mensagem,
  respostas até 400 tokens.

## Custos
- ~1,5 cêntimos por mensagem (Opus 4.8). 1.000 conversas/mês ≈ 15€.
- Se o volume disparar: mudar `MODEL` para `claude-haiku-4-5` (≈20× mais barato) e push.

## Manutenção
- Mudou um preço ou política? Editar o bloco `SYSTEM` em `netlify/functions/avo-maria.mts`
  **e** a secção correspondente do site (preçário/FAQ) → commit → push. O Netlify trata do resto.
- A chave NUNCA vai no código nem no site — vive só nas environment variables do Netlify.
