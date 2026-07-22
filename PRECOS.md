# Preços — fonte única de verdade (ano letivo 2026/2027)

> Este site é estático (sem build), por isso os preços não podem vir de um só ficheiro
> em runtime sem custo de SEO. Em vez disso, esta é a **lista canónica**: sempre que um
> preço mudar, atualizar aqui PRIMEIRO e depois em cada sítio da checklist abaixo.
> (Documento interno — bloqueado em robots.txt, não é uma página do site.)

## Valores oficiais

| Item | Valor |
|---|---|
| Mensalidade Pré-Escolar (3–5 anos, 12 meses) | **390 €/mês** |
| Mensalidade 1.º Ciclo (6–10 anos, 12 meses) | **425 €/mês** |
| Inscrição (1.ª vez) | 300 € |
| Renovação de inscrição (até maio) | 175 € |
| Seguro escolar (1×/ano) | 25 € |
| Desgaste de material (1×/ano) | 60 € |
| Refeitório — almoço (mensal) | 130 € |
| Refeitório — lanche (mensal) | 45 € |
| Serviço de refeitório (traz almoço de casa) | 50 € |
| Almoço avulso | 7 € |
| Lanche avulso | 4 € |
| Prolongamento 17h–18h (mensal) | 35 € |
| Prolongamento 17h–19h (mensal) | 50 € |
| ATL — semana (almoço+seguro incl.) | 150 € |
| ATL — Programa Praia (2 semanas, julho, c/ transporte) | 400 € |
| ATL — lanche opcional (semanal) | 15 € |
| Descontos (não acumuláveis) | irmãos −5% · anual −5% · semestral −2% |

Horário coberto pela mensalidade: até às **17h00** (tolerância até 17h30). Escola aberta 8h–19h.

## Checklist de sítios a atualizar quando um preço muda

1. **`precario.html`** — tabela completa + opções e valores do simulador (selects `sim-*`) + script de cálculo.
2. **`index.html`** — teaser do preçário na homepage (secção `#precario`: 390 € / 425 € + linha de descontos).
3. **`atl.html`** — tabela do ATL (150 € / 400 € / 15 €) + secção "O essencial".
4. **`avo-widget.js`** — resposta local (fallback) da Avó Maria sobre preços/ATL (array `RESPOSTAS`).
5. **`netlify/functions/avo-maria.mts`** — o SYSTEM prompt da Avó Maria (IA) tem os preços embebidos.
6. **Inbox social** — `avo-prompt.txt` (repo quenteebom-site / Supabase `PROMPT_URL`), se referir preços.

> Regra de ouro: **famílias atuais mantêm as condições acordadas com a Direção**; as tabelas
> aplicam-se a novas inscrições. Manter esta nota visível no site.
