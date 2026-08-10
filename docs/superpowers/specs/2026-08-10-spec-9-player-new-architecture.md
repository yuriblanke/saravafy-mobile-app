# Spec 9 — Player e New Architecture: levantar o risco real e as saídas (`N1`)

**Data:** 2026-08-10
**Status:** escrita, **não implementada**. Aguarda decisão.
**Cobre:** `N1` do [`BACKLOG.md`](../BACKLOG.md).

> **Esta spec é deliberadamente de levantamento, não de implementação.** A decisão do usuário
> (2026-08-08) é explícita: o player é **o último** item, e é escopado como **reconstrução**, não
> como patch. Escrever a spec de execução agora seria escrever contra um desenho que ainda não
> existe. O que falta hoje não é plano — é o dado que diz **se dá para esperar**.

---

## 1. Goal

Responder a uma pergunta, com evidência: **o app está quebrando hoje por causa disto, ou é uma
incompatibilidade documentada que ainda não se manifestou?**

Enquanto isso não estiver respondido, qualquer plano de player é chute — e o custo de errar é alto,
porque a reconstrução é grande e o usuário já descreveu o player atual como fonte de dor real antes
mesmo deste esforço começar.

---

## 2. O que já se sabe

| Fato | Fonte | Verificado? |
|---|---|---|
| `react-native-track-player` **não é suportado** na New Architecture | `npx expo-doctor`, 2026-08-08 | Sim, saída da ferramenta |
| A New Architecture está **ligada** | `app.config.ts:76` (`newArchEnabled: true`) e `android/gradle.properties:38` | Sim, lido |
| Ela é ligada porque **Reanimated 4 exige** | Backlog `N1` | Sim |
| RNTP é o **único** motor de áudio do app | `aggregation.md` — "RNTP as single source of truth" | Sim |
| Controles de mídia da notificação já foram remendados **duas vezes** | git: `c60729d`, `148f726` | Sim |
| O usuário descreve o player como traumático, anterior a este esforço | Decisão registrada 2026-08-08 | Sim |

**O que não se sabe, e é o buraco:** se existe crash ou comportamento errado **atribuível** a essa
incompatibilidade, hoje, neste app. Nenhuma passada de validação isolou isso, e "parece aleatório"
é exatamente como uma incompatibilidade nativa se apresenta do lado JS.

---

## 3. Escopo desta spec

### 3.1 Dentro — levantamento

1. **Medir.** Reunir evidência de crash e de comportamento errado do player, com origem: analytics
   de crash se houver, logs do dev client, e os relatos do usuário datados. O `BACKLOG.md` registra
   que crash analytics está em "Not yet audited" — então é bem possível que o primeiro passo seja
   descobrir que **não há instrumentação**, o que já é resposta.
2. **Delimitar a incompatibilidade.** O que exatamente quebra: registro do módulo nativo, sessão de
   mídia, controles da notificação, background? Não tratar "não suportado" como bloco monolítico.
3. **Levantar as saídas**, com custo e risco de cada uma — §4.
4. **Recomendar uma**, com o critério explícito.

### 3.2 Fora

- **Implementar qualquer coisa.** Inclusive troca de biblioteca.
- **Desligar a New Architecture.** É saída possível (§4), mas quem decide é o usuário — e ela
  arrasta o Reanimated 4 junto.
- **Redesenhar a experiência do player.** É o escopo da reconstrução, e a reconstrução vem depois
  desta resposta.

---

## 4. As saídas a instruir

| # | Saída | O que precisa ser verificado antes de propor |
|---|---|---|
| A | **Ficar como está** | Existe evidência de dano real? Se não houver, esperar é decisão legítima e barata |
| B | **Trocar de motor** (`expo-audio`/`expo-av` ou outro) | O substituto cobre background, controles de notificação e fila? Qual o custo real? |
| C | **Desligar a New Architecture** | Reanimated 4 exige; desligar arrasta ele junto. Provavelmente inviável — **confirmar, não presumir** |
| D | **Reconstrução completa** — a decisão registrada | É o destino declarado. Esta spec entrega o insumo, não o desenho |

**Critério de recomendação, escrito antes de olhar o resultado** para não ser racionalizado depois:
se (1) não houver evidência de dano atribuível **e** (2) o custo de B for alto, a recomendação é A
até o restante do P0/P1/P2 acabar — que é exatamente a ordem que o usuário já definiu. Qualquer
evidência de crash atribuível inverte isso.

---

## 5. Não-objetivos

- Não é para transformar levantamento em refactor por impulso.
- Não é para tratar a saída do `expo-doctor` como prova de dano. Incompatibilidade documentada é
  hipótese forte, **não** é observação.

---

## 6. Definition of done

**Agent DoD:** o levantamento escrito, com cada afirmação carregando sua fonte e marcada como
*verificada* ou *inferida*; as quatro saídas com custo e risco; uma recomendação com o critério de
§4 aplicado; `N1` atualizado no backlog com o que foi descoberto.

**Human DoD:** o usuário lê e decide entre A–D. **Não há teste de aparelho nesta spec** — se o
levantamento pedir reprodução dirigida, ela vira uma seção da fila, e não um passo bloqueante do
plano ([`CONVENTIONS.md`](../CONVENTIONS.md) §4).

---

## 7. Perguntas em aberto

1. Existe crash analytics neste app? Se não, instalar é pré-requisito ou o levantamento se contenta
   com relato e log? **Proposta:** sem analytics, o levantamento fica explicitamente inconclusivo
   quanto a crash — e dizer isso é resultado melhor do que fabricar confiança.
2. As duas correções anteriores de controle de notificação (`c60729d`, `148f726`) são sintoma desta
   incompatibilidade ou de outra coisa? É a pista mais concreta que existe: **começar por ela.**
3. `N2` (`@react-native-community/netinfo` um major à frente) entra junto? **Proposta:** não — o
   backlog já o amarra ao `S-5`, e misturar duas correções nativas na mesma passada torna a
   atribuição impossível.
