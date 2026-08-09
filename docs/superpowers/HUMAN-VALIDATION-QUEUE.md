# Fila de validação humana

**Atualizado:** 2026-08-08

Tudo que precisa de olho humano num app rodando. Agente não valida nada daqui.

**Como usar:** rodar o app uma vez, percorrer as seções na ordem, marcar `[x]` no que passou e
anotar o que quebrou na coluna "Observado". Depois é só me passar o arquivo — os desvios viram
correção de doc e/ou de código.

**Regra:** item pendente aqui **nunca** bloqueia commit de agente. Ver
[`CONVENTIONS.md`](CONVENTIONS.md) §4.

---

## Antes de começar

- [x] `npx tsc --noEmit` → zero saída (verificado 2026-08-08, após fechar Spec 2a)
- [x] `npm test` → 0 falhas (5 suites, 34 testes, verificado 2026-08-08)
- [ ] Hard refresh / rebuild do dev client antes de testar (HMR mente — ver `CLAUDE.md`)

Build está limpo — as 3 specs (1, 2a, 2b) estão Agent-DoD-completas. Pode rodar o app.

---

## Estado do repo no momento deste teste

Além das specs abaixo, há trabalho **não commitado** em cima de sync offline, sem spec escrita:
`OfflineBanner.tsx`, `useOfflineAutoSync.ts` (novo), `app/_layout.tsx`, `collectionPontos.ts`,
`AudioPlayerFooter.tsx`, `useCollectionPlayerData.ts`.

Isso muda comportamento de banner offline e re-sync. Se aparecer algo estranho relacionado a
conexão/offline, provavelmente vem daí e não das specs. Anotar em [Fora de escopo](#fora-de-escopo).

**Decidido (2026-08-08): fica como está, não reverter.** Vai ser specado *depois* desta validação,
usando o que você observar como entrada — rastreado como `S-5` em [`BACKLOG.md`](BACKLOG.md).
Ou seja: o que você anotar sobre offline aqui **não é bug pra corrigir agora**, é matéria-prima
pra spec. Vale anotar mesmo o que parecer funcionar bem.

---

## 1. Home

Origem: Spec 1 (`getErrorMessage`), Spec 2a (add-to-collection).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 1.1 | Abrir Home | Pontos carregam | ✅ OK |
| 1.2 | Buscar um ponto | Filtra sem travar ao digitar | ✅ OK |
| 1.3 | Busca sem resultado | Estado vazio, não spinner infinito | ✅ OK |
| 1.4 | ~~Modo avião → puxar pra atualizar~~ Modo avião → buscar | ~~Erro com mensagem legível~~ ver nota | ❌ mostra `TypeError: Network request failed` cru |
| 1.5 | Ponto → "Adicionar à coleção" | Wizard abre em 2 fases: escolher versão → escolher coleção | ✅ OK |
| 1.6 | Concluir adição | Ponto entra na coleção; toast de sucesso | ✅ OK |
| 1.7 | Adicionar ponto que já está na coleção | Mensagem de duplicado clara, sem crash | ❌ não acontece — ver nota |

> **1.4 — item da fila estava errado, corrigido 2026-08-08.** Home **não tem** "puxar pra
> atualizar" — nunca teve (`fetchAllPontos()` único + refetch ao focar tela, não
> `RefreshControl`). Não é bug, é ausência de recurso; o item presumia algo que não existe nesta
> tela. Testado no lugar: busca em modo avião. **Isso sim é bug confirmado** — mensagem crua
> vazando em vez de texto legível. Causa raiz e correção: `D7` em [`BACKLOG.md`](BACKLOG.md).
>
> **1.7 — bug confirmado, determinístico (sempre reproduz, não é flaky).** Causa raiz: o insert usa
> `ignoreDuplicates: true`, então o banco nunca acusa duplicado — a mensagem de "já estava na
> coleção" está morta no código. Pior: a UI mostra "adicionado com sucesso" e mexe no cache local
> mesmo o banco não tendo feito nada, ou seja cache e banco ficam dessincronizados até o próximo
> refetch. Detalhe e correção: `D6` em [`BACKLOG.md`](BACKLOG.md).

**Atenção 1.5:** o wizard do Home foi substituído pelo componente unificado `AddToCollectionFlow`.
O comportamento de 2 fases tem que ser idêntico ao de antes. Qualquer passo faltando é regressão.

---

## 2. Player

Origem: Spec 1 (`useTerreiroRole`), Spec 2a (add-to-collection).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 2.1 | Abrir player a partir de uma coleção de terreiro | Letra e áudio carregam | ✅ OK |
| 2.2 | Tocar áudio | Playback funciona, footer responde | ✅ OK |
| 2.3 | Navegar entre versões (‹ Versão N de N ›) | Título, letra e áudio trocam juntos | ✅ OK |
| 2.4 | Como **admin/curimba** do terreiro | Botões de editar tag aparecem | ✅ OK |
| 2.5 | Como **membro comum** | Botões de editar tag **não** aparecem | ✅ OK |
| 2.6 | Como **não-membro** | Nenhuma afordância de edição | ❌ vazamento de permissão — ver nota |
| 2.7 | Menu → "Adicionar à coleção" | Abre direto na escolha de coleção (fase única, versão já selecionada) | ❌ botão nem aparece — ver nota |
| 2.8 | Concluir adição pelo player | Ponto entra na coleção; toast de sucesso | ⏸️ bloqueado por 2.7 |

**Atenção 2.4–2.6:** gating agora vem de `useTerreiroRole().canEditCustomTags` em vez de checagem
inline. Tem que dar exatamente o mesmo resultado de antes. Membro inativo/pendente **nunca** pode
ver edição.

> **2.6 — bug real, mecanismo confirmado no código, diferente do `D1` já catalogado.**
> `useTerreiroMembershipStatus` usa `placeholderData: (prev) => prev` — ao deslogar, a consulta
> nova (sem usuário) não busca nada, mas continua mostrando o resultado da consulta *anterior*
> como placeholder. Todo botão gated por `canEditCustomTags` (e qualquer outro que use esse hook)
> fica preso no cargo de antes do logout até a tela desmontar. Reproduz exatamente como você
> testou: logar como admin/curimba → deslogar sem fechar o app → cargo antigo vaza pra visão de
> visitante. Causa raiz e severidade: `D8` em [`BACKLOG.md`](BACKLOG.md), P0.
>
> **2.7 — confirmado bug pré-existente, não é regressão da Spec 2a.** O botão "+" só existe no
> player em modo biblioteca pública (`isLibraryPlayer`); nunca existiu no player aberto a partir de
> coleção de terreiro. **Decidido (2026-08-08): tratar como bug a corrigir**, não feature nova —
> registrado como `D9` em [`BACKLOG.md`](BACKLOG.md), P0. 2.8 fica bloqueado até isso ser
> corrigido.

**Atenção 2.7:** o modal do player foi substituído pelo mesmo `AddToCollectionFlow` do Home, mas
em modo fase-única. Se ele abrir pedindo pra escolher versão, está errado.

---

## 3. Coleção

Origem: Spec 1 (`useTerreiroRole`, `getErrorMessage`).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 3.1 | Abrir uma coleção | Pontos listam | |
| 3.2 | Como admin/curimba | Sheets de adicionar/remover tag aparecem | |
| 3.3 | Como membro comum ou não-membro | Sem afordância de edição | |
| 3.4 | Coleção "somente membros" sem ser membro | Gate de acesso aparece, com opção de pedir entrada | |
| 3.5 | Adicionar tag → desligar rede → adicionar outra | **Ver observação abaixo** | |

**Atenção 3.5 — defeito conhecido, não é regressão desta spec.** As mutations de tag fazem update
otimista sem snapshot nem rollback (`aggregation.md` §6.6). Erro de rede deixa a tag aparecendo na
UI mesmo sem ter salvo, até o cache expirar (~60s). Confirmar se acontece e anotar — está na fila
de correção do §6.

---

## 4. Terreiros

Origem: Spec 1 (`<QueryBoundary>` — adotado aqui, **não** no Home como o plano dizia).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 4.1 | Abrir aba Terreiros (primeira vez, cache frio) | Spinner centralizado, depois lista | |
| 4.2 | Puxar pra atualizar com dados já na tela | Lista **continua visível**, sem piscar pro spinner | |
| 4.3 | Modo avião → puxar pra atualizar | Lista continua visível; sem tela de erro por cima do conteúdo | |
| 4.4 | Modo avião + cache frio | Card de erro "Não foi possível carregar" + mensagem legível | |
| 4.5 | Usuário sem nenhum terreiro | Estado vazio | |

**Atenção 4.2 e 4.3:** esse é exatamente o comportamento anti-*flicker* que o `<QueryBoundary>`
deveria garantir (stale-while-revalidate). Se piscar, o componente não está sendo usado ali ou está
recebendo `data: undefined` durante o refetch. É o item mais relevante da fila pro seu objetivo.

---

## 5. Preferências / Meus terreiros

Origem: Spec 2b (`PreferencesContext` → React Query).

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 5.1 | Login → abrir Preferências | "Meus terreiros" lista os terreiros onde sou admin | |
| 5.2 | Editar um terreiro → salvar → voltar | Lista reflete a mudança **sem refresh manual** | |
| 5.3 | Aceitar convite de admin → voltar | Terreiro novo aparece na lista sozinho | |
| 5.4 | Sair de um terreiro | Some da lista sozinho | |

**Atenção 5.2–5.4:** antes era fetch imperativo, agora é `invalidateQueries`. Se ficar dado velho,
o `userId` passado no invalidate não bate com o que o hook lê.

---

## 6. Regressão geral

| # | Verificar | Esperado | Observado |
|---|---|---|---|
| 6.1 | Login com Google | Entra sem loop | |
| 6.2 | Percurso: login → Home → buscar → player → coleção de terreiro → voltar | Sem crash, sem warning de hook order no console | |
| 6.3 | Trocar de aba (Pontos ↔ Terreiros) por swipe | Sem frame estranho na transição | |
| 6.4 | Abrir e fechar Preferências pelo header | Sem flash de conteúdo errado | |

**Atenção 6.3 e 6.4:** são os *flickers* que você relatou. Nenhuma spec atacou isso ainda —
suspeitos mapeados: 4 contexts de gesture/pager fragmentados (`code-quality-audit.md` §3.1) e as
duas implementações paralelas da tela de Preferências (`aggregation.md` §6.12). Descrever com o
máximo de detalhe possível o que aparece no frame errado; é o que vai direcionar a spec.

---

## Fora de escopo

Coisas que você notar e que **não** vêm das specs acima. Anotar aqui em vez de tentar consertar:

| O quê | Onde | Observado |
|---|---|---|
| | | |

### Offline / conexão — entrada pra spec `S-5`

Seção separada de propósito: isso **não** é caça a bug, é levantamento. O trabalho de auto-sync
offline está no working tree sem spec, e vai virar spec a partir do que você observar aqui.
Anotar tudo — inclusive o que funcionar bem, que também define o comportamento esperado.

| # | Verificar | Observado |
|---|---|---|
| O.1 | Ligar modo avião com o app aberto — banner offline aparece? Quanto tempo depois? | |
| O.2 | Voltar a ficar online — banner some sozinho? Sincroniza sozinho? | |
| O.3 | Mandar o app pra background offline → voltar online → reabrir | |
| O.4 | Abrir uma coleção de terreiro baixado, offline | |
| O.5 | Tocar áudio de ponto baixado, offline | |
| O.6 | Banner offline aparece em cima de algo? Empurra layout? Pisca? | |
| O.7 | Qualquer coisa que pareça "sincronizando" sem você ter pedido | |

---

## Defeitos já conhecidos — não reportar como novos

Confirmados no código, ainda sem correção. Se aparecerem, é esperado:

| # | Sintoma | Origem |
|---|---|---|
| §6.11 | Enviar ponto novo **com áudio** → ponto salva, áudio some, toast "ID do ponto indisponível" | `PontoUpsertModal.tsx:591` lê `approved_ponto_id` antes do curador aprovar |
| §6.7 | "Reenviar convite" toasta sucesso e não reenvia nada | `terreiroMembership.ts:1224` é stub |
| §6.6 | Tag de médium fica na tela mesmo com erro de rede (~60s) | Update otimista sem rollback |
| §6.8 | Editar ponto e não ver a mudança em outra tela | UPDATE direto sem invalidar cache |
| §6.10 | Trocar de usuário no mesmo device pode mostrar dado de membership do anterior | Eviction de logout não pega chave sem `userId` |

Todos entram na próxima leva de specs — ver [`BACKLOG.md`](BACKLOG.md).
