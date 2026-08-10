# Spec 8 — Uma implementação só de Preferências (`C5`)

**Data:** 2026-08-10
**Status:** escrita, **não implementada**. Aguarda aprovação.
**Cobre:** `C5` do [`BACKLOG.md`](../BACKLOG.md).
**Ordem:** depois da [Spec 7](2026-08-10-spec-7-navigation-unification.md) — ver §7.

---

## 1. Goal

Existe **uma** tela de Preferências. Hoje existem duas, e elas divergem em silêncio.

Isto não é limpeza estética. O `C5` já cobrou preço duas vezes, e a segunda foi medida: a Spec 3
precisou escrever **o mesmo guard `!user` duas vezes, em três commits, nas duas implementações** — e
a varredura da Task 6 ainda encontrou um **quarto** ponto desprotegido que só existia numa delas.
Toda correção de forma "auth" paga esse imposto enquanto o `C5` não cair.

---

## 2. Estado atual

| Implementação | Onde | Forma |
|---|---|---|
| Overlay | `src/components/TabsHeaderWithPreferences.tsx` (3.164 linhas, contém um componente aninhado de 630) | Sobreposição dentro do header |
| Rota | `src/screens/Preferences/Preferences.tsx` + `components/ProfileSection.tsx`, `components/LogoutSection.tsx` | Rota de stack |

**A prova de que a divergência é real, não teórica** — `D12`, 2026-08-09: o mesmo defeito de guard
ausente existia **independentemente** nas duas. Corrigir uma não alcançou a outra. Foram quatro
sites: `ProfileSection` (`94f4ddb`), `LogoutSection` (`4733c21`), e a linha "Sair" **mais** a linha
de identidade do overlay (`e85875b`) — as duas últimas só existiam no overlay.

Nenhuma das duas redireciona nem fecha no logout, então o estado quebrado é alcançável de verdade,
não é flash de um frame.

---

## 3. Escopo

### 3.1 Dentro

1. **Escolher qual sobrevive.** Ver §5 — a spec propõe, o usuário decide.
2. **Inventariar o que só existe em cada uma.** Task 1 do plano. É o passo que impede a fusão de
   perder função silenciosamente — e o `D12` já mostrou que o overlay tem sites que a rota não tem.
3. **Fundir**, preservando todo comportamento inventariado.
4. **Deletar a perdedora**, com o commit justificando cada remoção.
5. **Testes de render** dos guards de auth na sobrevivente. Isto é o `X12`, e ele deixa de ser item
   separado se esta spec o cumprir.

### 3.2 Fora

- **Não é para redesenhar Preferências.** Fusão preserva comportamento; mudança de design é feature
  e este esforço é fix-only ([`README.md`](../README.md)).
- **Não é para quebrar o `TabsHeaderWithPreferences` em módulos.** Isso é a fila de monólitos do
  backlog, deliberadamente por último. Se a fusão eliminar o componente aninhado de 630 linhas como
  consequência, ótimo; como objetivo, não.
- **`D13`** (foto de perfil) é decisão de produto, não entra junto.

---

## 4. Critérios de aceite

1. Existe **um** componente de Preferências. `grep` por "Sair"/"logout" em `src/` aponta para um
   arquivo só.
2. Toda função inventariada na Task 1 continua alcançável — item a item, com a lista na mão.
3. Guards de auth cobertos por **teste de render**, não só por `tsc`. É a classe de quebra que passa
   no typecheck e na suíte atual e explode em runtime (motivo de existir do `X12`).
4. Deslogar de dentro de Preferências não deixa nem "? Você" nem botão "Sair" — nas duas rotas de
   entrada, se as duas continuarem existindo como *entrada* para a mesma tela.
5. `tsc` limpo, suíte com zero falhas.

---

## 5. A decisão que precisa do usuário

**Proposta: manter a rota (`Preferences.tsx`), absorver o overlay.**

Argumentos a favor: é a forma padrão de navegação do app; `ProfileSection`/`LogoutSection` já são
componentes separados e testáveis, enquanto o overlay vive dentro de um arquivo de 3.164 linhas; e o
overlay é o lado que acumulou os sites extras que o `D12` encontrou — ou seja, é o lado onde é mais
fácil esquecer algo.

Argumento contra, que só o usuário resolve: **se o overlay for a forma que ele realmente usa e
prefere**, a transição de rota pode parecer mais lenta — e é justamente por isso que existe o
`navCover`, que a [Spec 7](2026-08-10-spec-7-navigation-unification.md) vai remover. **Por isso a
Spec 7 vem antes:** decidir isto com o cover ainda no meio é decidir sobre uma transição mascarada.

---

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Perder função que só existia na perdedora | Task 1 é inventário escrito, e a fusão é conferida item a item contra ele |
| Regressão de auth em caminho não coberto | Critério 3: teste de render dos guards antes da deleção |
| Arquivo de 3.164 linhas fica maior ainda | Se a rota vencer, ele **encolhe**. Se o overlay vencer, a spec precisa dizer onde o código vai parar |
| Flicker atribuído a esta spec sendo da Spec 7 | Ordem em §7 |

---

## 7. Ordem em relação à Spec 7

**Spec 7 primeiro, sem exceção.** As duas tocam `TabsHeaderWithPreferences.tsx`. A Spec 7 remove o
`navCover`, que é exatamente a máscara aplicada sobre a transição de Preferências. Fundir antes
significa escolher a implementação sobrevivente medindo uma transição mascarada, e depois remover a
máscara — na ordem errada, a decisão de §5 é tomada com o dado errado.

---

## 8. Definition of done

**Agent DoD:** `tsc` limpo; suíte com zero falhas; inventário da Task 1 conferido item a item;
testes de render dos guards; um commit por task; reconciliação (§5 do `CONVENTIONS.md`);
`X12` fechado no backlog ou explicitamente mantido aberto com o que sobrou.

**Human DoD:** seção nova na fila cobrindo as duas rotas de entrada, logout de dentro da tela,
e cada item do inventário da Task 1 — **essa lista é o roteiro do teste**, não uma lista genérica.

---

## 9. Perguntas em aberto

1. Rota ou overlay? (§5 — decisão do usuário)
2. Se a rota vencer, o header mantém **entrada** para Preferências, ou vira só navegação?
3. O comportamento de "não fecha no logout" é para corrigir junto ou vira item próprio?
   **Proposta:** junto — é a mesma linha de código que o `D12` já obrigou a tocar quatro vezes.
