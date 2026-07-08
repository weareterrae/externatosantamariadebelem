# Avó Maria com IA real — guia de ativação

O chat do site funciona hoje em **modo local** (respostas por palavras-chave, grátis, sem servidor).
Este guia ativa o **modo IA**: uma edge function no Supabase que guarda a chave da Anthropic e responde
com o Claude, na voz da Avó Maria, com todo o conhecimento da escola. O site faz fallback automático
para o modo local se a função falhar — nunca fica mudo.

## O que já está feito (neste repo)
- `supabase/functions/avo-maria/index.ts` — a função completa: personalidade, factos da escola
  (preços, salas, ATL, políticas), regras de segurança (não inventa, encaminha casos sensíveis
  para a Direção, resiste a desvios de papel), CORS restrito aos domínios do site.
- `index.html` — o chat envia o histórico (últimos 8 turnos) ao endpoint quando `AVO_IA_ENDPOINT`
  estiver preenchido; mostra "A Avó Maria está a escrever…"; cai para as respostas locais em erro.

## Passos (≈10 minutos, mesmo padrão do Chef Prima)

1. **Projeto Supabase** — usar um existente ou criar novo em supabase.com (plano gratuito chega).

2. **Deploy da função** (na pasta `site-novo/`, com o Supabase CLI ligado ao projeto):
   ```sh
   supabase functions deploy avo-maria --no-verify-jwt
   ```
   (`--no-verify-jwt` porque o chat é público — a proteção é o CORS + a função não fazer nada sensível.)

3. **Chave da Anthropic** (criar em console.anthropic.com → API Keys):
   ```sh
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```

4. **Ligar o site**: em `index.html`, preencher a constante:
   ```js
   var AVO_IA_ENDPOINT = 'https://<PROJECT_REF>.functions.supabase.co/avo-maria';
   ```
   Commit + push → o Netlify publica → a Avó Maria fica inteligente.

5. **Testar no site publicado**: perguntas de preço/horário e uma pergunta fora do guião
   (ex.: "o meu filho é alérgico a glúten, como fazem?") — deve acolher e encaminhar para a Direção.

## Custos (modelo claude-opus-4-8, o melhor — já configurado)
- ~1.900 tokens de entrada + ~200 de saída por resposta ≈ **1,5 cêntimos por mensagem**.
- 1.000 mensagens/mês ≈ **15€/mês**. Para uma campanha de captação, é irrisório face a um lead.
- Se o volume disparar, muda-se `MODEL` para `claude-haiku-4-5` (≈20× mais barato, ainda muito bom).

## Manutenção
- Os factos da escola vivem no bloco `SYSTEM` de `supabase/functions/avo-maria/index.ts`.
  Mudou um preço ou uma política? Editar lá + `supabase functions deploy avo-maria` — 1 minuto.
- Manter o site (secção preçário/FAQ) e o SYSTEM sincronizados — são as duas fontes que os pais veem.

## Notas de segurança
- A chave NUNCA vai no site — vive num secret do Supabase.
- CORS restrito aos domínios do site (netlify.app + domínio oficial). Ao mudar de domínio,
  atualizar `ORIGENS_PERMITIDAS` na função.
- A função corta o histórico a 8 turnos e 1.000 caracteres por mensagem (controlo de custo e abuso).
- Se um dia houver abuso, ativar rate limiting (ex.: por IP com Upstash) — por agora não é necessário.
